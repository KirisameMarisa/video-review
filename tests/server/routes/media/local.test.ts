import { beforeAll, describe, expect, it, vi } from "vitest";
import fs from "fs";

const ROOT = vi.hoisted(() => "/tmp/vr-local-test-root");

vi.mock("@/server/lib/token", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/server/lib/token")>();
    return {
        ...actual,
        authorizeMedia: vi.fn(async () => ({ type: "api-token" as const, role: "admin" as const })),
    };
});

vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: {
        getDriver: () => ({
            type: () => "local",
            localBaseDirectory: ROOT,
        }),
    },
}));

import { localRouter } from "@/server/routes/media/local";

describe("media localRouter", () => {
    beforeAll(async () => {
        await fs.promises.mkdir(`${ROOT}/drawing`, { recursive: true });
        await fs.promises.writeFile(`${ROOT}/drawing/a.png`, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    });

    it("rejects a path that escapes the storage root", async () => {
        // Encoded slashes (%2f) survive URL normalization and reach the handler as
        // "../", where path.join would escape the root without this guard.
        const res = await localRouter.request("http://localhost/%2e%2e%2f%2e%2e%2fetc%2fpasswd");
        expect(res.status).toBe(400);
    });

    it("rejects a .. segment that stays inside the root", async () => {
        // Fully-encoded slashes keep the "../" intact into the handler; the guest check
        // keys off the raw path, so this must not slip past and resolve to another video.
        const res = await localRouter.request("http://localhost/thumbnails/vid-1%2f%2e%2e%2fvid-2%2fthumb.png");
        expect(res.status).toBe(400);
    });

    it("lets a path inside the root through the traversal guard", async () => {
        const res = await localRouter.request("http://localhost/videos/demo.mp4");
        expect(res.status).not.toBe(400);
    });

    it("serves an image with its own Content-Type and forbids sniffing", async () => {
        const res = await localRouter.request("http://localhost/drawing/a.png");

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("image/png");
        expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
});
