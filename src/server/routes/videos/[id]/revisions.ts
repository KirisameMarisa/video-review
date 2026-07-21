import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import * as z from "@/schema/zod"

export const revisionsRouter = new Hono();

revisionsRouter.openapi({
    method: "get",
    summary: "Get revisions",
    description: "Returns all revisions of a video by its ID.",
    path: "/",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID of the video to retrieve revisions for",
        },
    ],
    responses: {
        200: {
            description: "Get revisions",
            content: {
                "application/json": {
                    schema: z.VideoRevisionSchema,
                },
            },
        },
        404: {
            description: "Video not found",
        },
    },
}, async (c) => {
    const id = c.req.param("id");

    try {
        const revisions = await prisma.videoRevision.findMany({
            where: { videoId: id, deleted: false },
            orderBy: { revision: "desc" },
        });

        return c.json(revisions);
    } catch (err) {
        return c.json({ error: "Failed to fetch revisions" }, { status: 500 });
    }
});