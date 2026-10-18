import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { deleteSession, getSession } from "@/server/lib/upload-session";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { drawingKey } from "@/lib/storage-key";
import { VideoCommentSchema } from "@/schema/zod";

export const finishRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Finish drawing upload",
        description: "Marks the uploaded drawing as the comment's drawing.",
        path: "/",
        request: { query: z.object({ session_id: z.string().min(1) }) },
        responses: {
            200: {
                description: "Drawing upload finished successfully",
                content: {
                    "application/json": {
                        schema: VideoCommentSchema,
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            404: errorResponse("Comment not found"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["viewer", "admin", "guest"]);

        const { session_id } = c.req.valid("query");
        const session = await getSession(session_id);
        if (!session) {
            return c.json({ error: "missing session" }, 400);
        }

        const id = c.req.param("id");
        const comment = await prisma.videoComment.findFirst({ where: { id, deleted: false } });
        if (!comment) {
            return c.json({ error: "comment not found" }, 404);
        }

        // The session must be the one opened for this comment; no other key can become its drawing.
        const storageKey = drawingKey(comment.id);
        if (session.storageKey !== storageKey) {
            return c.json({ error: "session does not belong to the comment" }, 400);
        }

        const updated = await prisma.videoComment.update({
            where: { id: comment.id },
            data: { drawingPath: storageKey, hasDrawing: true, updatedAt: new Date() },
        });

        if (comment.drawingPath && comment.drawingPath !== storageKey) {
            await VideoReviewStorage.deleteObject(comment.drawingPath);
        }
        await deleteSession(session_id);
        return c.json(updated, 200);
    });
