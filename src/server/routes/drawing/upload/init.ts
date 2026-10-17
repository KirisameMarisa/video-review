import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { VideoReviewStorage } from "@/server/lib/storage";
import { createSession } from "@/server/lib/upload-session";
import { UploadStorageType } from "@/lib/db-types";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { UploadSessionSchema } from "@/schema/zod";
import { newDrawingKey } from "@/server/lib/videos/drawing-key";

export const initRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Initialize drawing upload",
        description: "Initializes the drawing upload process.",
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
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["viewer", "admin", "guest"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const storageKey = newDrawingKey();

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
