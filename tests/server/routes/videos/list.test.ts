import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/lib/db";
import { listRouter } from "@/server/routes/videos/list";

type TestVideoInput = {
    title: string;
    folderKey: string;
    tags: string[];
    deleted?: boolean;
};

const createdVideoIds: string[] = [];

async function createVideoWithRevision(input: TestVideoInput) {
    const videoId = randomUUID();
    const revision = 1;

    await prisma.video.create({
        data: {
            id: videoId,
            title: input.title,
            folderKey: input.folderKey,
            deleted: input.deleted ?? false,
        },
    });

    await prisma.videoRevision.create({
        data: {
            id: randomUUID(),
            videoId,
            revision,
            filePath: `videos/test/${videoId}.mp4`,
            tags: input.tags,
            deleted: false,
        },
    });

    await prisma.video.update({
        where: { id: videoId },
        data: { latestRevisionNum: revision },
    });

    createdVideoIds.push(videoId);
}

describe("videos listRouter (DB)", () => {
    const unique = randomUUID().slice(0, 8);
    const visibleTitle = `DB List Visible ${unique}`;
    const hiddenTitle = `DB List Hidden ${unique}`;
    const folderKey = `db-tests-${unique}`;
    const uniqueTag = `db-tag-${unique}`;

    beforeAll(async () => {
        await createVideoWithRevision({
            title: visibleTitle,
            folderKey,
            tags: [uniqueTag, "alpha"],
        });

        await createVideoWithRevision({
            title: hiddenTitle,
            folderKey,
            tags: [uniqueTag, "beta"],
            deleted: true,
        });
    });

    afterAll(async () => {
        if (createdVideoIds.length === 0) return;
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
    });

    it("returns only non-deleted videos for filterTree", async () => {
        const res = await listRouter.request(
            `http://localhost/?filterTree=${encodeURIComponent(folderKey)}`,
            { method: "GET" },
        );
        expect(res.status).toBe(200);

        const body = await res.json() as Array<{ title: string; deleted: boolean }>;
        const titles = body.map((x) => x.title);

        expect(titles).toContain(visibleTitle);
        expect(titles).not.toContain(hiddenTitle);
    });

    it("filters by latestRevision tags", async () => {
        const res = await listRouter.request(
            `http://localhost/?tags=${encodeURIComponent(uniqueTag)}`,
            { method: "GET" },
        );
        expect(res.status).toBe(200);

        const body = await res.json() as Array<{ title: string }>;
        const titles = body.map((x) => x.title);

        expect(titles).toContain(visibleTitle);
        expect(titles).not.toContain(hiddenTitle);
    });

    it("returns 500 when video query fails", async () => {
        vi.resetModules();
        vi.doMock("@/server/lib/db", () => ({
            prisma: {
                video: {
                    findMany: vi.fn().mockRejectedValueOnce(new Error("forced db failure")),
                },
                videoEventKind: {
                    findMany: vi.fn(),
                },
            },
        }));

        const { listRouter: mockedListRouter } = await import("@/server/routes/videos/list");
        const res = await mockedListRouter.request("http://localhost/", { method: "GET" });

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({ error: "Failed to fetch videos" });

        vi.doUnmock("@/server/lib/db");
        vi.resetModules();
    });
});
