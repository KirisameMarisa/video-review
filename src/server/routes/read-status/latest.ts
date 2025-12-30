import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const latestRouter = new Hono();

latestRouter.get('/', async (c) => {
    try {
        const { searchParams } = new URL(c.req.url);
        const videoId = searchParams.get("videoId");

        // 400
        if (!videoId) {
            return c.json({ error: "missing videoId" }, 400);
        }

        const latest = await prisma.$queryRaw<
            { latestCommentId: string | null }[]
        >`
            SELECT c.id AS "latestCommentId"
            FROM "VideoComment" c
            WHERE c."videoId" = ${videoId}
            ORDER BY c."createdAt" DESC
            LIMIT 1
        `;

        const latestCommentId =
            latest.length > 0 ? latest[0].latestCommentId : null;

        return c.json(
            { latestCommentId },
            { status: 200 }
        );
    } catch {
        return c.json({ error: "failed to fetch latest comment" }, 500);
    }
});