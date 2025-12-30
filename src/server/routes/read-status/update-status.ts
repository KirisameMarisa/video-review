import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const updateStatusRouter = new Hono();

updateStatusRouter.post('/', async (c) => {
    try {
        const { userId, videoId, lastReadCommentId } = await c.req.json();

        if (!userId || !videoId || !lastReadCommentId) {
            return c.json({ error: "invalid request body" }, 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            return c.json({ ok: true });
        }

        await prisma.userVideoReadStatus.upsert({
            where: {
                userId_videoId: { userId, videoId },
            },
            update: {
                lastReadCommentId,
            },
            create: {
                userId,
                videoId,
                lastReadCommentId,
            },
        });

        return c.json({ ok: true });
    } catch {
        return c.json({ error: "failed to update read status" }, 500);
    }
});