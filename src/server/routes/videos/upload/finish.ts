import { prisma } from "@/server/lib/db";
import { Hono } from "hono";
import { authorize, JwtError } from "@/server/lib/token";
import { deleteSession, getSession } from "@/server/lib/upload-session";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const finishRouter = new Hono();

finishRouter.post('/', async (c) => {
    try {
        authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
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
    const nextRev = session.nextRev;
    const storageKey = session.storageKey;

    const revision = await prisma.$transaction(async (tx) => {
        let video = await prisma.video.findFirst({ where: { title, folderKey } });
        if (!video) {
            video = await prisma.video.create({ data: { title, folderKey, scenePath } });
        } else {
            await prisma.video.update({
                where: { id: video.id },
                data: { latestUpdatedAt: new Date() },
            });
        }

        return await prisma.videoRevision.create({
            data: {
                id: session.id,
                videoId: video.id,
                revision: nextRev,
                filePath: storageKey,
            },
        });
    });


    await deleteSession(session_id);
    return c.json(revision);
});