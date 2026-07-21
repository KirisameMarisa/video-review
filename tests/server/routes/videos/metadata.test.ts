import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";

vi.mock("@/server/lib/token", () => ({
    authorize: vi.fn(),
}));

import { authorize } from "@/server/lib/token";
import { metaDataRouter } from "@/server/routes/videos/[id]/metadata";

const createdVideoIds: string[] = [];
const createdRevisionIds: string[] = [];
const createdKindLabels: string[] = [];

async function createVideoRevisionFixture() {
    const videoId = randomUUID();
    const revisionId = randomUUID();

    await prisma.video.create({
        data: {
            id: videoId,
            title: `Metadata Test ${videoId.slice(0, 8)}`,
            folderKey: "metadata-tests",
            deleted: false,
        },
    });

    await prisma.videoRevision.create({
        data: {
            id: revisionId,
            videoId,
            revision: 1,
            filePath: `videos/test/${videoId}-rev1.mp4`,
            deleted: false,
        },
    });

    await prisma.video.update({
        where: { id: videoId },
        data: { latestRevisionNum: 1 },
    });

    createdVideoIds.push(videoId);
    createdRevisionIds.push(revisionId);
    return { revisionId };
}

describe("videos metadataRouter (DB)", () => {
    const app = new Hono();
    app.route("/videos/:id/metadata", metaDataRouter);

    let revisionId = "";

    beforeAll(async () => {
        const fixture = await createVideoRevisionFixture();
        revisionId = fixture.revisionId;
    });

    afterAll(async () => {
        if (createdRevisionIds.length > 0) {
            await prisma.videoEvent.deleteMany({
                where: { videoRevisionId: { in: createdRevisionIds } },
            });
        }

        if (createdKindLabels.length > 0) {
            await prisma.videoEventKind.deleteMany({
                where: { label: { in: createdKindLabels } },
            });
        }

        if (createdVideoIds.length > 0) {
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
        }
    });

    it("returns 401 when authorization fails", async () => {
        vi.mocked(authorize).mockRejectedValueOnce(new Error("unauthorized"));

        const res = await app.request(`http://localhost/videos/${revisionId}/metadata/upload`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                events: [],
            }),
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
    });

    it("returns 404 when revision is not found", async () => {
        vi.mocked(authorize).mockResolvedValueOnce(undefined);

        const res = await app.request(`http://localhost/videos/${randomUUID()}/metadata/upload`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                events: [],
            }),
        });

        expect(res.status).toBe(404);
        await expect(res.json()).resolves.toEqual({ error: "video revision not found" });
    });

    it("upserts event kind and replaces events for the same kind", async () => {
        vi.mocked(authorize).mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
        const kind = `meta-kind-${randomUUID().slice(0, 8)}`;
        createdKindLabels.push(kind);

        const first = await app.request(`http://localhost/videos/${revisionId}/metadata/upload`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                events: [
                    { kind: kind, startMs: 0, endMs: 100, data: "first-event" },
                ],
            }),
        });
        expect(first.status).toBe(200);
        await expect(first.json()).resolves.toEqual({ ok: true, inserted: 1 });

        const second = await app.request(`http://localhost/videos/${revisionId}/metadata/upload`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                events: [
                    { kind: kind, startMs: 100, endMs: 200, data: "second-event" },
                    { kind: kind, startMs: 200, endMs: 300, data: "third-event" },
                ],
            }),
        });
        expect(second.status).toBe(200);
        await expect(second.json()).resolves.toEqual({ ok: true, inserted: 2 });

        const eventKind = await prisma.videoEventKind.findUnique({
            where: { label: kind },
            select: { id: true },
        });
        expect(eventKind).not.toBeNull();

        const stored = await prisma.videoEvent.findMany({
            where: {
                videoRevisionId: revisionId,
                kindId: eventKind!.id,
            },
            orderBy: { startMs: "asc" },
            select: { startMs: true, endMs: true, data: true, seq: true },
        });

        expect(stored).toEqual([
            { startMs: 100, endMs: 200, data: "second-event", seq: 0 },
            { startMs: 200, endMs: 300, data: "third-event", seq: 1 },
        ]);
    });

    it("inserts events with multiple kinds in a single request", async () => {
        vi.mocked(authorize).mockResolvedValueOnce(undefined);
        const kindA = `meta-kind-a-${randomUUID().slice(0, 8)}`;
        const kindB = `meta-kind-b-${randomUUID().slice(0, 8)}`;
        createdKindLabels.push(kindA, kindB);

        const res = await app.request(`http://localhost/videos/${revisionId}/metadata/upload`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                events: [
                    { kind: kindA, startMs: 0, endMs: 100, data: "a-event" },
                    { kind: kindB, startMs: 0, endMs: 200, data: "b-event" },
                ],
            }),
        });

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ ok: true, inserted: 2 });

        const kindARow = await prisma.videoEventKind.findUnique({ where: { label: kindA } });
        const kindBRow = await prisma.videoEventKind.findUnique({ where: { label: kindB } });
        expect(kindARow).not.toBeNull();
        expect(kindBRow).not.toBeNull();

        const storedA = await prisma.videoEvent.findMany({
            where: { videoRevisionId: revisionId, kindId: kindARow!.id },
            select: { startMs: true, endMs: true, data: true },
        });
        const storedB = await prisma.videoEvent.findMany({
            where: { videoRevisionId: revisionId, kindId: kindBRow!.id },
            select: { startMs: true, endMs: true, data: true },
        });

        expect(storedA).toEqual([{ startMs: 0, endMs: 100, data: "a-event" }]);
        expect(storedB).toEqual([{ startMs: 0, endMs: 200, data: "b-event" }]);
    });

    it("returns status from ServerError on authorization", async () => {
        vi.mocked(authorize).mockRejectedValueOnce(new ServerError("forbidden", 403));

        const res = await app.request(`http://localhost/videos/${revisionId}/metadata/upload`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                events: [],
            }),
        });

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({ error: "forbidden" });
    });
});
