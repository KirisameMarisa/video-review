export const runtime = "nodejs";
import { NextResponse } from "next/server";
import Busboy from "busboy";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { apiError } from "@/lib/api-response";
import { authorize, JwtError } from "@/lib/jwt";
import { getSession } from "@/lib/upload-session";

export async function PUT(req: Request): Promise<Response> {
    try {
        authorize(req, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return apiError(e.message, e.status);
        }
        return apiError("unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
        return apiError("missing session_id", 400);
    }

    const session = await getSession(session_id);
    if (!session) {
        return apiError("missing session", 400);
    }

    return new Promise((resolve) => {
        const contentType = req.headers.get("content-type") || "";
        const busboy = Busboy({ headers: { "content-type": contentType } });

        let tmpFilePath: string | null = null;
        let writeFinished: Promise<void> | null = null;

        let responded = false;
        const fail = (err: any) => {
            if (responded) return;
            responded = true;
            return apiError("Upload failed", 500);
        };

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

                const fullPath = path.join(process.cwd(), "uploads", session.storageKey);
                await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
                await fsPromises.rename(tmpFilePath, fullPath);

                if (fs.existsSync(tmpFilePath)) {
                    fs.rmSync(tmpFilePath);
                }

                responded = true;
                resolve(NextResponse.json({ok: true}));
            } catch (err) {
                fail(err);
            }
        });

        const readable = Readable.fromWeb(req.body as any);
        readable.on("error", err => fail(err));
        readable.pipe(busboy);
    });
}
