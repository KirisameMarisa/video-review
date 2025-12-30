import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const getVideoRouter = new Hono();

getVideoRouter.get('/', async (c) => {
    const id = c.req.param("id");

    console.log(`Fetching video with id: ${id}`);

    try {
        const video = await prisma.video.findUnique({
            where: { id },
            include: {
                revisions: {
                    orderBy: { revision: "desc" },
                },
            },
        });

        if (!video) {
            return c.json({ error: "Video not found" }, { status: 404 });
        }

        return c.json(video);
    } catch (err) {
        return c.json({ error: "Failed to fetch video" }, { status: 500 });
    }
});