import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { VideoReviewStorage } from "@/server/lib/storage";
import { createSession } from "@/server/lib/upload-session";
import { UploadStorageType } from "@/lib/db-types";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { v4 as uuidv4 } from 'uuid';

export const initRouter = new Hono();

initRouter.openapi({
    method: "post",
    summary: "Initialize drawing upload",
    description: "Initializes the drawing upload process.",
    path: "/",
    requestBody: {
        required: true,
        content: {
            "multipart/form-data": {
                schema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "The path where the drawing will be saved",
                        },
                    },
                    required: ["path"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Drawing upload initialized successfully",
        },
        400: {
            description: "Invalid parameters",
        },
        401: {
            description: "Unauthorized",
        },
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["viewer", "admin", "guest"]);
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const formData = await c.req.formData();
    const savePath = formData.get("path") as string;
    const storageKey = savePath ? savePath : `drawing/${uuidv4()}.png`;

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
    return c.json({ url, session });
});