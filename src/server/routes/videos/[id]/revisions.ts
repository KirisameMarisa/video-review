import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const revisionsRouter = new Hono();

revisionsRouter.get('/', async (c) => {
    const id = c.req.param("id");

    try {
        const revisions = await prisma.videoRevision.findMany({
            where: { videoId: id },
            orderBy: { revision: "desc" },
        });

        return c.json(revisions);
    } catch (err) {
        return c.json({ error: "Failed to fetch revisions" }, { status: 500 });
    }
});