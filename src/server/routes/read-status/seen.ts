import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize, userIdOf } from "@/server/lib/token";
import { authorizeVideo } from "@/server/lib/videos/guest-access";

export const seenRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get seen revisions",
        description: "Returns the newest revision a user has opened of each video.",
        path: "/",
        responses: {
            200: {
                description: "The newest opened revision by video ID",
                content: {
                    "application/json": {
                        schema: z.object({ seen: z.record(z.string(), z.number().int()) }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        const userId = userIdOf(await authorize(c.req.raw, ["viewer", "admin"]));

        const rows = await prisma.userVideoReadStatus.findMany({
            where: { userId, lastSeenRevision: { not: null } },
            select: { videoId: true, lastSeenRevision: true },
        });

        return c.json({ seen: Object.fromEntries(rows.map((r) => [r.videoId, r.lastSeenRevision!])) }, 200);
    })
    .openapi(createRoute({
        method: "post",
        summary: "Record a seen revision",
        description: "Records that a user opened a revision of a video. Opening an older one again keeps the newer one.",
        path: "/",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({
                            videoId: z.string().min(1),
                            revision: z.number().int().min(1),
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Recorded",
                content: {
                    "application/json": {
                        schema: z.object({ ok: z.boolean() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            400: errorResponse("Invalid request body"),
        },
    }), async (c) => {
        const { videoId, revision } = c.req.valid("json");
        const userId = userIdOf(await authorizeVideo(c.req.raw, ["viewer", "admin"], videoId));

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) {
            return c.json({ ok: true }, 200);
        }

        await prisma.userVideoReadStatus.upsert({
            where: { userId_videoId: { userId, videoId } },
            create: { userId, videoId, lastSeenRevision: revision },
            update: {},
        });

        // Only ever moves forward, so going back to an older revision keeps the newer one seen.
        await prisma.userVideoReadStatus.updateMany({
            where: { userId, videoId, OR: [{ lastSeenRevision: null }, { lastSeenRevision: { lt: revision } }] },
            data: { lastSeenRevision: revision },
        });

        return c.json({ ok: true }, 200);
    });
