import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const byIdRouter = new Hono();

byIdRouter.get("/", async (c) => {
    try {
        const id = c.req.param("id");

        const comment = await prisma.videoComment.findUnique({
            where: { id },
        });

        // 404
        if (!comment) {
            return c.json({ error: "comment not found" }, 404);
        }

        return c.json(comment, { status: 200 });
    } catch (err) {
        return c.json({ error: "failed to fetch comment" }, 500);
    }
});