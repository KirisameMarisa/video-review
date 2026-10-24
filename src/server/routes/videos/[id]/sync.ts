import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeVideo } from "@/server/lib/videos/guest-access";
import { updatePresenter, updateSyncState } from "@/server/lib/video-stream";

const SyncStateBody = z.object({
    revisionId: z.string().min(1),
    playing: z.boolean(),
    time: z.number().min(0),
    rate: z.number().positive().max(16),
    by: z.string().min(1).max(64),
    // The sender's stream from `hello`, which tells the server whether it is the presenter.
    connectionId: z.string().min(1),
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
            409: errorResponse("Someone else is presenting, or the server no longer has this connection"),
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

        const { connectionId, ...syncState } = state;
        if (!updateSyncState(id, connectionId, syncState)) {
            return c.json({ error: "someone else is presenting, or this connection is gone" }, 409);
        }
        return c.body(null, 204);
    })
    .openapi(createRoute({
        method: "put",
        summary: "Start or stop presenting",
        description: "While a connection in the sync session presents, only it can change the playback state. Presenting ends when it stops or its stream closes.",
        path: "/presenter",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({
                            connectionId: z.string().min(1),
                            presenting: z.boolean(),
                        }),
                    },
                },
            },
        },
        responses: {
            204: { description: "Accepted" },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            409: errorResponse("Someone else is presenting, or the connection is not in the sync session"),
        },
    }), async (c) => {
        const id = c.req.param("id") as string;
        await authorizeVideo(c.req.raw, ["guest", "viewer", "admin"], id);

        const { connectionId, presenting } = c.req.valid("json");
        if (!updatePresenter(id, connectionId, presenting)) {
            return c.json({ error: "someone else is presenting, or this connection is gone" }, 409);
        }
        return c.body(null, 204);
    });
