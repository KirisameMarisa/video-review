import { prisma } from "@/server/lib/db";
import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { externalLinksRouter } from "@/server/routes/comments/[id]/external-links";
import { issueRouter } from "@/server/routes/comments/[id]/issue";
import { drawingRouter } from "@/server/routes/comments/[id]/drawing";
import { VideoCommentSchema } from "@/schema/zod";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";

export const byIdRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get comment by ID",
        description: "Retrieves a comment by its ID.",
        path: "/",
        responses: {
            200: {
                description: "Comment retrieved successfully",
                content: {
                    "application/json": {
                        schema: VideoCommentSchema,
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            404: errorResponse("Comment not found"),
            500: errorResponse("Failed to fetch comment"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        try {
            const id = c.req.param("id");

            const comment = await prisma.videoComment.findUnique({
                where: { id },
            });

            // 404
            if (!comment) {
                return c.json({ error: "comment not found" }, 404);
            }

            return c.json(comment, 200);
        } catch (err) {
            return c.json({ error: "failed to fetch comment" }, 500);
        }
    })
    .route("external-links", externalLinksRouter)
    .route("issue", issueRouter)
    .route("drawing", drawingRouter);
