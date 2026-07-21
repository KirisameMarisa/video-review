import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/lib/db";

vi.mock("@/server/lib/token", () => ({
    authorize: vi.fn(),
}));

import { authorize } from "@/server/lib/token";
import { finishRouter } from "@/server/routes/videos/upload/finish";

const createdVideoIds: string[] = [];
const createdSessionIds: string[] = [];

async function createVideoDraft(title: string, folderKey: string) {
    const id = randomUUID();
    await prisma.video.create({
        data: {
            id,
            title,
            folderKey,
            deleted: true,
            latestRevisionNum: null,
        },
    });
    createdVideoIds.push(id);
    return { id };
}

async function createUploadSession(params: {
    id: string;
    title: string;
    folderKey: string;
    scenePath: string | null;
    nextRev: number;
    storageKey: string;
}) {
    await prisma.uploadSession.create({
        data: {
            id: params.id,
            title: params.title,
            folderKey: params.folderKey,
            scenePath: params.scenePath,
            nextRev: params.nextRev,
            storage: "local",
            storageKey: params.storageKey,
        },
    });
    createdSessionIds.push(params.id);
}

describe("videos upload finishRouter (DB)", () => {
    afterAll(async () => {
        if (createdSessionIds.length > 0) {
            await prisma.uploadSession.deleteMany({
                where: { id: { in: createdSessionIds } },
            });
        }

        if (createdVideoIds.length > 0) {
            await prisma.video.updateMany({
                where: { id: { in: createdVideoIds } },
                data: { latestRevisionNum: null },
            });
            await prisma.videoRevision.deleteMany({
                where: { videoId: { in: createdVideoIds } },
            });
            await prisma.video.deleteMany({
                where: { id: { in: createdVideoIds } },
            });
        }
    });

    it("returns 401 when authorization fails", async () => {
        vi.mocked(authorize).mockRejectedValueOnce(new Error("unauthorized"));

        const res = await finishRouter.request("http://localhost/?session_id=dummy", {
            method: "POST",
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
    });

    it("returns 400 when session_id is missing", async () => {
        vi.mocked(authorize).mockResolvedValueOnce(undefined);

        const res = await finishRouter.request("http://localhost/", {
            method: "POST",
        });

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ error: "missing session_id" });
    });

    it("returns 400 when upload session does not exist", async () => {
        vi.mocked(authorize).mockResolvedValueOnce(undefined);

        const res = await finishRouter.request(`http://localhost/?session_id=${randomUUID()}`, {
            method: "POST",
        });

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ error: "missing session" });
    });

    it("creates revision, publishes video, and deletes upload session", async () => {
        vi.mocked(authorize).mockResolvedValueOnce(undefined);

        const title = `Upload Finish ${randomUUID().slice(0, 8)}`;
        const folderKey = `upload-tests-${randomUUID().slice(0, 8)}`;
        const scenePath = "videos/scenes/sample.mp4";
        const storageKey = `videos/${folderKey}/${title}/rev_001.mp4`;
        const sessionId = randomUUID();

        const video = await createVideoDraft(title, folderKey);
        await createUploadSession({
            id: sessionId,
            title,
            folderKey,
            scenePath,
            nextRev: 1,
            storageKey,
        });

        const res = await finishRouter.request(`http://localhost/?session_id=${sessionId}`, {
            method: "POST",
        });

        expect(res.status).toBe(200);
        const body = (await res.json()) as { id: string; videoId: string; revision: number; filePath: string };
        expect(body.id).toBe(sessionId);
        expect(body.videoId).toBe(video.id);
        expect(body.revision).toBe(1);
        expect(body.filePath).toBe(storageKey);

        const updatedVideo = await prisma.video.findUnique({
            where: { id: video.id },
            select: { latestRevisionNum: true, deleted: true, scenePath: true },
        });
        expect(updatedVideo).toEqual({
            latestRevisionNum: 1,
            deleted: false,
            scenePath,
        });

        const session = await prisma.uploadSession.findUnique({
            where: { id: sessionId },
        });
        expect(session).toBeNull();
    });
});
