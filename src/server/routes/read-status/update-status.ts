import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { userIdOf } from "@/server/lib/token";
import { authorizeVideo } from "@/server/lib/videos/guest-access";

export const updateStatusRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Update read status",
        description: "Updates the read status of a video for a user.",
        path: "/",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({
                            videoId: z.string().min(1),
                            lastReadCommentId: z.string().min(1),
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Update read status",
                content: {
                    "application/json": {
                        schema: z.object({ ok: z.boolean() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            400: errorResponse("Invalid request body"),
            500: errorResponse("Failed to update read status"),
        },
    }), async (c) => {
        const { videoId, lastReadCommentId } = c.req.valid("json");
        const userId = userIdOf(await authorizeVideo(c.req.raw, ["viewer", "admin"], videoId));

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true },
            });

            if (!user) {
                return c.json({ ok: true }, 200);
            }

            await prisma.userVideoReadStatus.upsert({
                where: {
                    userId_videoId: { userId, videoId },
                },
                update: {
                    lastReadCommentId,
                },
                create: {
                    userId,
                    videoId,
                    lastReadCommentId,
                },
            });

            return c.json({ ok: true }, 200);
        } catch {
            return c.json({ error: "failed to update read status" }, 500);
        }
    });
