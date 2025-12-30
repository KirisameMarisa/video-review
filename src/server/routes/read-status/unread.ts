import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const unreadRouter = new Hono();

unreadRouter.get('/', async (c) => {
    try {
        const { searchParams } = new URL(c.req.url);
        const userId = searchParams.get("userId");

        // 400
        if (!userId) {
            return c.json({ error: "missing userId" }, 400);
        }

        const unreadVideoIds = await prisma.$queryRaw<{ videoId: string }[]>`
            WITH latest AS (
                SELECT v.id AS "videoId",
                       c.id AS "latestCommentId"
                FROM "Video" v
                LEFT JOIN LATERAL (
                    SELECT id
                    FROM "VideoComment"
                    WHERE "videoId" = v.id
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                ) c ON true
            )
            SELECT l."videoId"
            FROM latest l
            LEFT JOIN "UserVideoReadStatus" s
                   ON s."videoId" = l."videoId"
                  AND s."userId" = ${userId}
            WHERE 
                l."latestCommentId" IS NOT NULL
                AND (
                    s."lastReadCommentId" IS NULL
                    OR s."lastReadCommentId" != l."latestCommentId"
                );
        `;

        return c.json({
            unreadVideoIds: unreadVideoIds.map((x) => x.videoId),
        }, { status: 200 });

    } catch {
        return c.json({ error: "failed to fetch unread video ids" }, 500);
    }
});