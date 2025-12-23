export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Busboy from "busboy";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { Readable } from "stream";
import { apiError } from "@/lib/api-response";
import { VideoReviewStorage } from "@/lib/storage";
import { authorize, JwtError } from "@/lib/jwt";

/**
 * @swagger
 * /api/videos/upload:
 *   post:
 *     summary: Upload a video file
 *     description: >
 *       Uploads a video file and creates a new video revision.
 *       If a video with the same title and folderKey already exists,
 *       a new revision will be added.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *               - folderKey
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Video file (mp4)
 *               title:
 *                 type: string
 *                 description: Video title
 *               folderKey:
 *                 type: string
 *                 description: Folder key to group videos
 *               scenePath:
 *                 type: string
 *                 description: Optional scene path
 *     responses:
 *       200:
 *         description: Video revision created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoRevision'
 *       500:
 *         description: Upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function POST(req: Request): Promise<Response> {
    return new Promise((resolve) => {
        const contentType = req.headers.get("content-type") || "";
        const busboy = Busboy({ headers: { "content-type": contentType } });

        let title = "";
        let folderKey = "";
        let scenePath = "";

        let tmpFilePath: string | null = null;
        let writeFinished: Promise<void> | null = null;

        let responded = false;
        const fail = (err: any) => {
            if (responded) return;
            responded = true;
            return apiError("Upload failed", 500);
        };

        busboy.on("field", (name, val) => {
            if (name === "title") title = val;
            if (name === "folderKey") folderKey = val;
            if (name === "scenePath") scenePath = val;
        });

        busboy.on("file", (_name, file, info) => {
            try {
                const tmpDir = path.join(process.cwd(), "uploads", "tmp");
                fs.mkdirSync(tmpDir, { recursive: true });

                const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
                tmpFilePath = path.join(tmpDir, unique + "_" + info.filename);

                const writeStream = fs.createWriteStream(tmpFilePath);

                file.on("error", err => fail(err));
                writeStream.on("error", err => fail(err));

                writeFinished = new Promise((resolveWrite) => {
                    writeStream.on("finish", resolveWrite);
                });

                try {
                    file.pipe(writeStream);
                } catch (err) {
                    fail(err);
                }
            } catch (err) {
                fail(err);
            }
        });

        busboy.on("error", err => fail(err));

        busboy.on("finish", async () => {
            if (responded) return;

            try {
                if (writeFinished) {
                    await writeFinished;
                } else {
                    return fail("No file stream started.");
                }

                if (!tmpFilePath) return fail("tmpFilePath missing");
                if (!title || !folderKey) return fail("Missing fields");

                let video = await prisma.video.findFirst({ where: { title, folderKey } });
                if (!video) {
                    video = await prisma.video.create({ data: { title, folderKey, scenePath } });
                } else {
                    await prisma.video.update({
                        where: { id: video.id },
                        data: { latestUpdatedAt: new Date() },
                    });
                }

                const latestRev = await prisma.videoRevision.findFirst({
                    where: { videoId: video.id },
                    orderBy: { revision: "desc" },
                });

                const nextRev = (latestRev?.revision ?? 0) + 1;
                const filenameOut = `rev_${String(nextRev).padStart(3, "0")}.mp4`;
                const storageKey = path.join(
                    "videos",
                    folderKey,
                    title,
                    filenameOut
                ).replace(/\\/g, "/");

                const fullPath = path.join(process.cwd(), "uploads", storageKey);
                await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
                await fsPromises.rename(tmpFilePath, fullPath);

                const revision = await prisma.videoRevision.create({
                    data: {
                        videoId: video.id,
                        revision: nextRev,
                        filePath: storageKey,
                    },
                });

                if (fs.existsSync(tmpFilePath)) {
                    fs.rmSync(tmpFilePath);
                }

                responded = true;
                resolve(NextResponse.json(revision));
            } catch (err) {
                fail(err);
            }
        });

        const readable = Readable.fromWeb(req.body as any);
        readable.on("error", err => fail(err));
        readable.pipe(busboy);
    });
}
