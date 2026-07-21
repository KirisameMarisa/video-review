import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { externalLinksRouter } from "@/server/routes/comments/[id]/external-links";

export const byIdRouter = new Hono();

byIdRouter.openapi({
    method: "get",
    summary: "Get comment by ID",
    description: "Retrieves a comment by its ID.",
    path: "/",
    responses: {
        200: {
            description: "Comment retrieved successfully",
        },
        404: {
            description: "Comment not found",
        },
    },
}, async (c) => {
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

byIdRouter.route("external-links", externalLinksRouter)