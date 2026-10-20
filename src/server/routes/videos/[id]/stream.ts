import { createRoute } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeVideoMedia } from "@/server/lib/videos/guest-access";
import { subscribeVideoStream } from "@/server/lib/video-stream";

// Under the common 60s idle timeout of proxies in front of the app.
const KEEPALIVE_MS = 25_000;

export const streamRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Stream updates for one video",
        description: "Server-sent events while a review screen has the video open. `sync` carries the number of connections in the video's sync session. `sync=1` puts this connection in the session.",
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
            const unsubscribe = subscribeVideoStream(id, syncing, (event, data) => {
                void stream.writeSSE({ event, data: JSON.stringify(data) });
            });
            stream.onAbort(unsubscribe);

            try {
                while (!stream.aborted) {
                    await stream.sleep(KEEPALIVE_MS);
                    await stream.write(": keepalive\n\n");
                }
            } finally {
                unsubscribe();
            }
        });
    });
