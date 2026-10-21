import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeVideo } from "@/server/lib/videos/guest-access";
import { updateSyncState } from "@/server/lib/video-stream";

const SyncStateBody = z.object({
    revisionId: z.string().min(1),
    playing: z.boolean(),
    time: z.number().min(0),
    rate: z.number().positive().max(16),
    by: z.string().min(1).max(64),
});

export const syncRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Update the sync session's playback state",
        description: "Sent by a screen in the video's sync session when its viewer plays, pauses, seeks, changes speed or switches revision; every open screen of the video receives it on its stream.",
        path: "/state",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: SyncStateBody,
                    },
                },
            },
        },
        responses: {
            204: { description: "Accepted" },
            400: errorResponse("Invalid body, or a revision of another video"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        const id = c.req.param("id") as string;
        await authorizeVideo(c.req.raw, ["guest", "viewer", "admin"], id);

        const state = c.req.valid("json");
        // A foreign revision would leave every follower unable to find it and stop following.
        const revision = await prisma.videoRevision.findFirst({ where: { id: state.revisionId, videoId: id }, select: { id: true } });
        if (!revision) {
            return c.json({ error: "revision does not belong to this video" }, 400);
        }

        updateSyncState(id, state);
        return c.body(null, 204);
    });
