import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { getSession } from "@/server/lib/upload-session";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { receiveMultipart } from "@/server/lib/utils/receive-multipart";
import { VideoReviewStorage } from "@/server/lib/storage";
import { prisma } from "@/server/lib/db";

export const transferRouter = new Hono();

const TransferQuerySchema = z.object({
    session_id: z.string().min(1),
});

transferRouter.openapi({
    method: "put",
    summary: "Transfer upload data",
    description: "Transfers the uploaded video data to the server storage.",
    path: "/",
    request: {
        query: TransferQuerySchema,
    },
    responses: {
        200: {
            description: "Transfer local",
        },
        400: {
            description: "Bad request",
        },
        401: {
            description: "Unauthorized",
        },
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["admin"]);
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

    const video = await prisma.video.findFirst({ where: { title: session.title, folderKey: session.folderKey } });

    return receiveMultipart(c.req.raw, async (tmpFilePath) => {
        await VideoReviewStorage.directUploadFromFile(session.storageKey, tmpFilePath);
    });
});
