import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/lib/db";
import { foldersRouter } from "@/server/routes/videos/folders";

const createdVideoIds: string[] = [];

async function createVideo(folderKey: string, title: string) {
    const id = randomUUID();
    await prisma.video.create({
        data: {
            id,
            title,
            folderKey,
            deleted: false,
        },
    });
    createdVideoIds.push(id);
}

describe("videos foldersRouter (DB)", () => {
    const unique = randomUUID().slice(0, 8);
    const keyA = `folder-a-${unique}`;
    const keyB = `folder-b-${unique}`;

    beforeAll(async () => {
        await createVideo(keyB, `Video B1 ${unique}`);
        await createVideo(keyA, `Video A1 ${unique}`);
        await createVideo(keyA, `Video A2 ${unique}`);
    });

    afterAll(async () => {
        if (createdVideoIds.length === 0) return;
        await prisma.video.deleteMany({
            where: { id: { in: createdVideoIds } },
        });
    });

    it("returns unique folder keys in ascending order", async () => {
        const res = await foldersRouter.request("http://localhost/", { method: "GET" });
        expect(res.status).toBe(200);

        const body = (await res.json()) as string[];
        const filtered = body.filter((k) => k === keyA || k === keyB);

        expect(filtered).toEqual([keyA, keyB]);
    });

    it("returns 500 when folder query fails", async () => {
        vi.resetModules();
        vi.doMock("@/server/lib/db", () => ({
            prisma: {
                video: {
                    findMany: vi.fn().mockRejectedValueOnce(new Error("forced db failure")),
                },
            },
        }));

        const { foldersRouter: mockedFoldersRouter } = await import("@/server/routes/videos/folders");
        const res = await mockedFoldersRouter.request("http://localhost/", { method: "GET" });

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({ error: "Failed to fetch folders" });

        vi.doUnmock("@/server/lib/db");
        vi.resetModules();
    });
});
