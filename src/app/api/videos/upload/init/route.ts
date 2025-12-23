import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { authorize, JwtError } from "@/lib/jwt";
import { VideoReviewStorage } from "@/lib/storage";
import path from "path";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/upload-session";
import { UploadStorageType } from "@prisma/client";
import Busboy from "busboy";
import { Readable } from "stream";

export async function POST(req: Request) {
    try {
        authorize(req, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return apiError(e.message, e.status);
        }
        return apiError("unauthorized", 401);
    }

    return new Promise<Response>((resolve) => {
        const contentType = req.headers.get("content-type") || "";
        const busboy = Busboy({ headers: { "content-type": contentType } });
        const fields: { [key: string]: string } = {};

        const fail = (err: any) => {
            return apiError("Upload failed", 500);
        };

        busboy.on("field", (name, val) => {
            fields[name] = val;
        });

        busboy.on('finish', async function () {
            const title = fields["title"];
            const folderKey = fields["folderKey"];
            const scenePath = fields["scenePath"];

            if (!title || !folderKey) {
                return apiError(`missing parameter`, 400);
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
            resolve(NextResponse.json({ url, session }));
        });

        busboy.on("error", err => fail(err));

        const readable = Readable.fromWeb(req.body as any);
        readable.on("error", err => fail(err));
        readable.pipe(busboy);
    });
}
