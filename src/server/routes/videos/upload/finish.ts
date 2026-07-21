import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { deleteSession, getSession } from "@/server/lib/upload-session";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const finishRouter = new Hono();

finishRouter.openapi({
    method: "post",
    summary: "Finish upload",
    description: "Finalizes the upload session and creates video and revision records in the database.",
    path: "/",
    parameters: [
        {
            name: "session_id",
            in: "query",
            required: true,
            schema: {
                type: "string",
            },
            description: "The upload session ID",
        },
    ],
    responses: {
        200: {
            description: "Finish upload",
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

    const title = session.title
    const folderKey = session.folderKey
    const scenePath = session.scenePath
    const vcsWatchPaths = session.vcsWatchPaths
    const nextRev = session.nextRev;
    const storageKey = session.storageKey;

    const revision = await prisma.$transaction(async (tx) => {
        let video = await tx.video.findFirst({ where: { title, folderKey } });
        if (video) {
            const newRevision = await tx.videoRevision.create({
                data: {
                    id: session_id,
                    videoId: video.id,
                    revision: nextRev,
                    filePath: storageKey,
                },
            });

            await tx.video.update({
                where: { id: video.id },
                data: { scenePath, vcsWatchPaths, latestRevisionNum: newRevision.revision, deleted: false },
            });
            return newRevision;
        }
    });

    await deleteSession(session_id);
    return c.json(revision);
});