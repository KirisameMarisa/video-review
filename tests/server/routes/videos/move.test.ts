import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { handleServerError, ServerError } from "@/server/lib/server-error";
import { moveRouter } from "@/server/routes/videos/move";

// Signed in as an admin unless a test says otherwise; refusing other roles is the real
// authorize's job, so the mock refuses whenever the route doesn't list the caller's role.
const caller = vi.hoisted(() => ({ role: "admin" as "admin" | "viewer" }));

vi.mock("@/server/lib/token", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/server/lib/token")>();
    return {
        ...actual,
        authorize: vi.fn(async (_req: Request, roles: string[]) => {
            if (!roles.includes(caller.role)) {
                throw new ServerError("forbidden", 403);
            }
            return { type: "api-token" as const, role: caller.role };
        }),
    };
});

const app = new OpenAPIHono().route("/move", moveRouter);
app.onError(handleServerError);

const createdVideoIds: string[] = [];

async function createVideo(folderKey: string, title: string, deleted = false) {
    const id = randomUUID();
    await prisma.video.create({ data: { id, title, folderKey, deleted } });
    createdVideoIds.push(id);
    return id;
}

function move(body: { videos?: { id: string; folderKey: string }[]; folders?: { from: string; to: string }[] }) {
    return app.request("http://localhost/move", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

async function folderOf(id: string) {
    return (await prisma.video.findUnique({ where: { id } }))?.folderKey;
}

describe("videos moveRouter (DB)", () => {
    const unique = randomUUID().slice(0, 8);

    afterAll(async () => {
        caller.role = "admin";
        await prisma.video.deleteMany({ where: { id: { in: createdVideoIds } } });
    });

    it("moves nothing when one video would land on a title already in its new folder", async () => {
        const source = `clash-src-${unique}`;
        const target = `clash-dst-${unique}`;
        const elsewhere = `clash-other-${unique}`;
        const same = await createVideo(source, `Same ${unique}`);
        const free = await createVideo(source, `Free ${unique}`);
        await createVideo(target, `Same ${unique}`);
        const loose = await createVideo(elsewhere, `Loose ${unique}`);

        const res = await move({ folders: [{ from: source, to: target }], videos: [{ id: loose, folderKey: target }] });

        expect(res.status).toBe(409);
        expect(await res.json()).toMatchObject({ titles: [`Same ${unique}`] });
        expect(await folderOf(same)).toBe(source);
        expect(await folderOf(free)).toBe(source);
        expect(await folderOf(loose)).toBe(elsewhere);
    });

    it("takes deleted videos along with their folder", async () => {
        const from = `deleted-src-${unique}`;
        const to = `deleted-dst-${unique}/inner`;
        const live = await createVideo(`${from}/scene`, `Live ${unique}`);
        const gone = await createVideo(`${from}/scene`, `Gone ${unique}`, true);

        const res = await move({ folders: [{ from, to }] });

        expect(res.status).toBe(200);
        expect(await folderOf(live)).toBe(`${to}/scene`);
        expect(await folderOf(gone)).toBe(`${to}/scene`);
    });

    it("refuses to move a folder into itself or a folder under it", async () => {
        const from = `self-${unique}`;
        const video = await createVideo(`${from}/sub`, `Self ${unique}`);

        expect((await move({ folders: [{ from, to: `${from}/sub/deeper` }] })).status).toBe(400);
        expect(await folderOf(video)).toBe(`${from}/sub`);
    });

    it("refuses anyone but an admin", async () => {
        const from = `viewer-src-${unique}`;
        const video = await createVideo(from, `Viewer ${unique}`);
        caller.role = "viewer";

        const res = await move({ folders: [{ from, to: `viewer-dst-${unique}` }] });

        caller.role = "admin";
        expect(res.status).toBe(403);
        expect(await folderOf(video)).toBe(from);
    });
});
