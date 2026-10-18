import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { uploadRouter } from "@/server/routes/drawing/upload";
import { authorize } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { VideoCommentSchema } from "@/schema/zod";

export const drawingRouter = createRouter()
    .openapi(createRoute({
        method: "delete",
        summary: "Remove drawing",
        description: "Removes the comment's drawing and its file.",
        path: "/",
        request: { query: z.object({ comment_id: z.string().min(1) }) },
        responses: {
            200: {
                description: "Drawing removed",
                content: {
                    "application/json": {
                        schema: VideoCommentSchema,
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            404: errorResponse("Comment not found"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["viewer", "admin", "guest"]);

        const { comment_id } = c.req.valid("query");
        const comment = await prisma.videoComment.findFirst({ where: { id: comment_id, deleted: false } });
        if (!comment) {
            return c.json({ error: "comment not found" }, 404);
        }

        if (!comment.hasDrawing) {
            return c.json(comment, 200);
        }

        const updated = await prisma.videoComment.update({
            where: { id: comment.id },
            data: { hasDrawing: false, updatedAt: new Date() },
        });

        if (comment.drawingPath) {
            await VideoReviewStorage.deleteObject(comment.drawingPath);
        }
        return c.json(updated, 200);
    })
    .route('/upload', uploadRouter);
