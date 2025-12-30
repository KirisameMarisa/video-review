import { prisma } from "@/server/lib/db";
import { Hono } from "hono";
import path from "path";
import Busboy from "busboy";
import { Readable } from "stream";
import fs from "fs";

export const oldUploadRouter = new Hono();

oldUploadRouter.post('/', async (c) => {
    return new Promise<Response>((resolve) => {
        const contentType = c.req.header("content-type") || "";
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
            return c.json({ error: "Upload failed" }, { status: 500 });
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
                await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.promises.rename(tmpFilePath, fullPath);

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
                resolve(c.json(revision));
            } catch (err) {
                fail(err);
            }
        });

        const readable = Readable.fromWeb(c.req.raw.body as any);
        readable.on("error", err => fail(err));
        readable.pipe(busboy);
    });
});