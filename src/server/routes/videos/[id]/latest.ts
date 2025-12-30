import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const latestRouter = new Hono();

latestRouter.get('/', async (c) => {
    const id = c.req.param("id");
    try {
        const latest = await prisma.videoRevision.findFirst({
            where: { videoId: id },
            orderBy: { revision: "desc" },
        });

        if (!latest) {
            return c.json({ error: "No revisions found" }, { status: 404 });
        }

        return c.json(latest);
    } catch (err) {
        return c.json({ error: "Failed to fetch latest revision" }, { status: 500 });
    }
});