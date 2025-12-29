import { prisma } from "@/lib/prisma";
import { Hono } from "hono";
import { authorize, JwtError } from "@/server/lib/auth/token";
import { VideoReviewStorage } from "@/server/lib/storage";
import path from "path";
import { createSession } from "@/lib/upload-session";
import { UploadStorageType } from "@prisma/client";
import Busboy from "busboy";
import { Readable } from "stream";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const initRouter = new Hono();

initRouter.post('/', async (c) => {
    try {
        authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    return new Promise<Response>((resolve) => {
        const contentType = c.req.header("content-type") || "";
        const busboy = Busboy({ headers: { "content-type": contentType } });
        const fields: { [key: string]: string } = {};

        const fail = (err: any) => {
            return c.json({ error: "Upload failed" }, { status: 500 });
        };

        busboy.on("field", (name, val) => {
            fields[name] = val;
        });

        busboy.on('finish', async function () {
            const title = fields["title"];
            const folderKey = fields["folderKey"];
            const scenePath = fields["scenePath"];

            if (!title || !folderKey) {
                return c.json({ error: "missing parameter" }, { status: 400 });
            }

            let nextRev = 1;
            let video = await prisma.video.findFirst({ where: { title, folderKey } });
            if (video) {
                nextRev = await prisma.$transaction(async (tx) => {
                    const latest = await tx.videoRevision.findFirst({
                        where: { videoId: video.id },
                        orderBy: { revision: "desc" },
                    });
                    return (latest?.revision ?? 0) + 1;
                });
            }

            const filenameOut = `rev_${String(nextRev).padStart(3, "0")}.mp4`;
            const storageKey = path.join(
                "videos",
                folderKey,
                title,
                filenameOut
            ).replace(/\\/g, "/");

            const type = VideoReviewStorage.type();
            const session = await createSession({
                nextRev,
                title,
                folderKey,
                scenePath,
                storageKey,
                storage: type as UploadStorageType,
            });

            const url = await VideoReviewStorage.uploadURL(session.id, storageKey, "video/mp4");
            resolve(c.json({ url, session }));
        });

        busboy.on("error", err => fail(err));

        const readable = Readable.fromWeb(c.req.raw.body as any);
        readable.on("error", err => fail(err));
        readable.pipe(busboy);
    });
});