import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { videoByIdRouter } from "@/server/routes/videos/[id]";

const createdVideoIds: string[] = [];
const createdRevisionIds: string[] = [];

async function createVideoWithRevisions() {
    const videoId = randomUUID();
    const rev1Id = randomUUID();
    const rev2Id = randomUUID();

    await prisma.video.create({
        data: {
            id: videoId,
            title: `Video By Id Test ${videoId.slice(0, 8)}`,
            folderKey: "video-by-id-tests",
            deleted: false,
        },
    });

    await prisma.videoRevision.createMany({
        data: [
            {
                id: rev1Id,
                videoId,
                revision: 1,
                filePath: `videos/test/${videoId}-rev1.mp4`,
                deleted: false,
            },
            {
                id: rev2Id,
                videoId,
                revision: 2,
                filePath: `videos/test/${videoId}-rev2.mp4`,
                deleted: false,
            },
        ],
    });

    await prisma.video.update({
        where: { id: videoId },
        data: { latestRevisionNum: 2 },
    });

    createdVideoIds.push(videoId);
    createdRevisionIds.push(rev1Id, rev2Id);
    return { videoId };
}

describe("videos videoByIdRouter (DB)", () => {
    const notFoundId = randomUUID();
    const app = new Hono();
    app.route("/videos/:id", videoByIdRouter);

    let videoId = "";

    beforeAll(async () => {
        const created = await createVideoWithRevisions();
        videoId = created.videoId;
    });

    afterAll(async () => {
        if (createdVideoIds.length === 0) return;
        await prisma.video.updateMany({
            where: { id: { in: createdVideoIds } },
            data: { latestRevisionNum: null },
        });
        await prisma.videoRevision.deleteMany({
            where: { id: { in: createdRevisionIds } },
        });
        await prisma.video.deleteMany({
            where: { id: { in: createdVideoIds } },
        });
    });

    it("returns video with revisions for existing id", async () => {
        const res = await app.request(`http://localhost/videos/${videoId}`, { method: "GET" });
        expect(res.status).toBe(200);

        const body = (await res.json()) as { id: string; revisions: Array<{ revision: number }> };
        expect(body.id).toBe(videoId);
        expect(body.revisions.map((x) => x.revision)).toEqual([2, 1]);
    });

    it("returns 404 when video is not found", async () => {
        const res = await app.request(`http://localhost/videos/${notFoundId}`, { method: "GET" });
        expect(res.status).toBe(404);
        await expect(res.json()).resolves.toEqual({ error: "Video not found" });
    });

    it("returns latest revision for existing id", async () => {
        const res = await app.request(`http://localhost/videos/${videoId}/latest`, { method: "GET" });
        expect(res.status).toBe(200);

        const body = (await res.json()) as { videoId: string; revision: number };
        expect(body.videoId).toBe(videoId);
        expect(body.revision).toBe(2);
    });

    it("returns 404 when latest revision does not exist", async () => {
        const res = await app.request(`http://localhost/videos/${notFoundId}/latest`, { method: "GET" });
        expect(res.status).toBe(404);
        await expect(res.json()).resolves.toEqual({ error: "No revisions found" });
    });

    it("returns all revisions for existing id in descending order", async () => {
        const res = await app.request(`http://localhost/videos/${videoId}/revisions`, { method: "GET" });
        expect(res.status).toBe(200);

        const body = (await res.json()) as Array<{ revision: number }>;
        expect(body.map((x) => x.revision)).toEqual([2, 1]);
    });
});
