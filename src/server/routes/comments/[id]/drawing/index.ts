import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { VideoCommentSchema } from "@/schema/zod";
import { initRouter } from "@/server/routes/comments/[id]/drawing/init";
import { finishRouter } from "@/server/routes/comments/[id]/drawing/finish";

export const drawingRouter = createRouter()
    .openapi(createRoute({
        method: "delete",
        summary: "Remove drawing",
        description: "Removes the comment's drawing and its file.",
        path: "/",
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

        const id = c.req.param("id");
        const comment = await prisma.videoComment.findFirst({ where: { id, deleted: false } });
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
    .route("init", initRouter)
    .route("finish", finishRouter);
