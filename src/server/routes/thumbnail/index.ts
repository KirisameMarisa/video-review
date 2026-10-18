import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { VideoReviewStorage } from "@/server/lib/storage";
import { Readable } from "stream";
import { thumbnailKey } from "@/lib/storage-key";

const TransferBodySchema = z.object({
    videoId: z.string(),
    file: z.any().openapi({
        type: "string",
        format: "binary",
        description: "Upload file",
    }),
});

export const thumbnailRouter = createRouter()
    .openapi(createRoute({
        method: "put",
        summary: "Upload thumbnail",
        description: "Transfers a thumbnail to the specified storage.",
        path: "/upload",
        request: {
            body: {
                content: {
                    "multipart/form-data": {
                        schema: TransferBodySchema,
                    },
                },
            },
        },
        responses: {
            200: {description: "thumbnail transferred successfully"},
            400: {description: "Invalid parameters"},
            401: {description: "Unauthorized"},
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
        }

        const formData = await c.req.formData();
        const videoId = formData.get("videoId") as string | null;
        if (!videoId) {
            return c.json({ error: "missing videoId" }, { status: 400 });
        }
        const file = formData.get("file") as File | null;
        if (!file) {
            return c.json({ error: "missing file" }, { status: 400 });
        }

        const storageKey = thumbnailKey(videoId);
        const buffer = Buffer.from(await file.arrayBuffer());
        await VideoReviewStorage.directUploadFromBuffer(storageKey, Readable.from(buffer), "image/png", "public, max-age=86400, immutable");
        return c.json({ ok: true });
    });
