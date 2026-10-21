import { test, expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Seeded admin users (see prisma/seed.ts); two people, so each has its own browser.
const HOST = { email: "Bocchi@example.com", password: "pass123" };
const GUEST = { email: "Kita@example.com", password: "pass123" };

const VIDEO = path.join(process.cwd(), "tests/fixtures/preview.mp4");

// Both browsers' console and failed requests, attached only to a failed run.
const consoleLines: string[] = [];

async function login(browser: Browser, user: { email: string; password: string }): Promise<Page> {
    const page = await (await browser.newContext()).newPage();
    page.on("console", (m) => consoleLines.push(`${user.email} ${m.type()}: ${m.text()}`));
    page.on("response", (r) => {
        if (r.status() >= 400) {
            consoleLines.push(`${user.email} ${r.request().method()} ${r.url()} -> ${r.status()}`);
        }
    });
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
    return page;
}

// The seed ships no media bytes, so the test brings its own video; the upload screen has its own test.
async function uploadVideo(request: APIRequestContext, title: string): Promise<string> {
    const signedIn = await request.post("/api/v1/auth/login/password", { data: HOST });
    const auth = { Authorization: `Bearer ${(await signedIn.json()).token}` };

    const init = await request.post("/api/v1/videos/upload/init", { headers: auth, multipart: { title, folderKey: "e2e-sync" } });
    const { url, session } = await init.json() as { url: string; session: { id: string } };

    const bytes = fs.readFileSync(VIDEO);
    const transfer = await request.post(url, {
        headers: {
            ...auth,
            "Tus-Resumable": "1.0.0",
            "Upload-Length": String(bytes.length),
            "Upload-Metadata": `sessionId ${Buffer.from(session.id).toString("base64")}`,
            "Content-Type": "application/offset+octet-stream",
        },
        data: bytes,
    });
    expect(transfer.ok()).toBe(true);

    const finish = await request.post(`/api/v1/videos/upload/finish?session_id=${session.id}`, { headers: auth });
    expect(finish.ok()).toBe(true);
    return (await finish.json()).videoId as string;
}

function player(page: Page) {
    return page.locator('[data-slot="video-stage"] video');
}

function syncButton(page: Page) {
    return page.getByRole("button", { name: "Sync playback" });
}

test.describe("synced playback", () => {
    test.afterEach(async ({}, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await testInfo.attach("browser log", { body: consoleLines.join("\n"), contentType: "text/plain" });
        }
        consoleLines.length = 0;
    });

    test("one screen's play, pause and speed reach a screen that opened the sync link", async ({ browser, request }) => {
        const videoId = await uploadVideo(request, `e2e-sync-${Date.now()}`);
        const host = await login(browser, HOST);
        await host.goto(`/video-review/review/${videoId}`);

        // The first one in gets the link to hand out.
        await syncButton(host).click();
        const dialog = host.getByRole("dialog");
        const link = await dialog.getByRole("textbox").inputValue();
        await host.keyboard.press("Escape");
        await expect(dialog).toBeHidden();

        // Opening the link is enough to join.
        const guest = await login(browser, GUEST);
        await guest.goto(link);
        await expect(syncButton(guest)).toHaveAttribute("aria-pressed", "true");
        await expect(syncButton(host)).toContainText("2");

        await host.getByRole("button", { name: "Play", exact: true }).click();
        await expect.poll(() => player(guest).evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);

        // Compared with the time the host sent, which is what the guest follows.
        const paused = host.waitForRequest((req) => req.url().includes("/sync/state") && req.postDataJSON().playing === false);
        await host.getByRole("button", { name: "Pause", exact: true }).click();
        const stoppedAt = (await paused).postDataJSON().time as number;
        await expect.poll(() => player(guest).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
        // Well inside one frame; a follower can rarely settle a few milliseconds off.
        await expect.poll(() => player(guest).evaluate((v: HTMLVideoElement, t) => Math.abs(v.currentTime - t), stoppedAt)).toBeLessThanOrEqual(0.01);

        await host.getByRole("combobox", { name: "Playback rate" }).click();
        await host.getByRole("option", { name: "2x", exact: true }).click();
        await expect.poll(() => player(guest).evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(2);
    });
});
