import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorizeComment } from "@/server/lib/videos/guest-access";
import { VideoReviewStorage } from "@/server/lib/storage";
import { createSession } from "@/server/lib/upload-session";
import { UploadStorageType } from "@/lib/db-types";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { UploadSessionSchema } from "@/schema/zod";
import { drawingKey } from "@/lib/storage-key";

export const initRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Initialize drawing upload",
        description: "Opens an upload for the comment's drawing.",
        path: "/",
        responses: {
            200: {
                description: "Drawing upload initialized successfully",
                content: {
                    "application/json": {
                        schema: z.object({ url: z.string(), session: UploadSessionSchema }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("Comment not found"),
        },
    }), async (c) => {
        const id = c.req.param("id") as string;
        const { comment } = await authorizeComment(c.req.raw, ["viewer", "admin", "guest"], id);
        if (comment.deleted) {
            return c.json({ error: "comment not found" }, 404);
        }

        const storageKey = drawingKey(comment.id);
        const type = VideoReviewStorage.type();
        const session = await createSession({
            nextRev: 0,
            title: "",
            folderKey: "",
            scenePath: "",
            vcsWatchPaths: [],
            storageKey,
            storage: type as UploadStorageType,
        });
        const url = await VideoReviewStorage.uploadURL(session.id, storageKey, "image/png");
        return c.json({ url, session }, 200);
    });
