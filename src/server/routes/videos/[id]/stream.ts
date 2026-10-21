import { randomUUID } from "node:crypto";
import { createRoute } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeVideo, authorizeVideoMedia } from "@/server/lib/videos/guest-access";
import { subscribeVideoStream, touchVideoStream } from "@/server/lib/video-stream";

export const streamRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Stream updates for one video",
        description: "Server-sent events while a review screen has the video open. `sync` carries the number of connections in the video's sync session and its playback state. `sync=1` puts this connection in the session. `hello` comes first with the connection id the browser pings with.",
        path: "/",
        request: {
            query: z.object({
                sync: z.enum(["1"]).optional(),
            }),
        },
        responses: {
            200: {
                description: "Event stream",
                content: {
                    "text/event-stream": {
                        schema: z.string(),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        const id = c.req.param("id") as string;
        await authorizeVideoMedia(c, ["guest", "viewer", "admin"], id);
        const syncing = c.req.valid("query").sync === "1";

        return streamSSE(c, async (stream) => {
            const connectionId = randomUUID();
            await stream.writeSSE({ event: "hello", data: JSON.stringify({ connectionId }) });
            if (stream.aborted) {
                return;
            }

            // Open until the browser closes it or the patrol in video-stream finds it stopped pinging.
            await new Promise<void>((closed) => {
                const unsubscribe = subscribeVideoStream(id, connectionId, syncing, {
                    send: (event, data) => {
                        void stream.writeSSE({ event, data: JSON.stringify(data) });
                    },
                    keepAlive: () => {
                        void stream.write(": keepalive\n\n");
                    },
                    close: closed,
                });
                stream.onAbort(() => {
                    unsubscribe();
                    closed();
                });
            });
        });
    })
    .openapi(createRoute({
        method: "post",
        summary: "Keep a video stream alive",
        description: "Sent by the browser every 20 seconds with the id from `hello`. A stream without pings for 90 seconds is closed and leaves the sync session.",
        path: "/ping",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({ connectionId: z.string().min(1) }),
                    },
                },
            },
        },
        responses: {
            204: { description: "Still open" },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("The server no longer has this connection"),
        },
    }), async (c) => {
        const id = c.req.param("id") as string;
        await authorizeVideo(c.req.raw, ["guest", "viewer", "admin"], id);

        if (!touchVideoStream(id, c.req.valid("json").connectionId)) {
            return c.json({ error: "unknown connection" }, 404);
        }
        return c.body(null, 204);
    });
