import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { getSession } from "@/server/lib/upload-session";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { VideoReviewStorage } from "@/server/lib/storage";
import { Readable } from "stream";
import { FileFormat, isFormat } from "@/server/lib/storage/file-format";

const TransferQuerySchema = z.object({
    session_id: z.string().min(1),
});

const TransferBodySchema = z.object({
    file: z.any().openapi({
        type: "string",
        format: "binary",
        description: "Upload file",
    }),
});

export const transferRouter = createRouter()
    .openapi(createRoute({
        method: "put",
        summary: "Transfer drawing",
        description: "Transfers a drawing to the specified storage.",
        path: "/",
        request: {
            query: TransferQuerySchema,
            body: {
                content: {
                    "multipart/form-data": {
                        schema: TransferBodySchema,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Drawing transferred successfully",
            },
            400: {
                description: "Invalid parameters",
            },
            401: {
                description: "Unauthorized",
            },
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["viewer", "admin", "guest"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(c.req.url);
        const session_id = searchParams.get("session_id");
        if (!session_id) {
            return c.json({ error: "missing session_id" }, { status: 400 });
        }

        const session = await getSession(session_id);
        if (!session) {
            return c.json({ error: "missing session" }, { status: 400 });
        }

        const formData = await c.req.formData();
        const file = formData.get("file") as File | null;
        if (!file) {
            return c.json({ error: "missing file" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (!isFormat(FileFormat.Png, buffer)) {
            return c.json({ error: "the drawing must be a PNG" }, { status: 400 });
        }

        await VideoReviewStorage.directUploadFromBuffer(session.storageKey, Readable.from(buffer), "image/png");
        return c.json({ ok: true });
    });
