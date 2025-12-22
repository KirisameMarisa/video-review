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
        authorize(req, ["viewer", "admin", "guest"]);
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
        return apiError("missing file", 400);
    }

    const tmpDir = path.join(process.cwd(), "uploads", "tmp");
    fsPromises.mkdir(tmpDir, { recursive: true });
    const tmpFilePath = path.join(tmpDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fsPromises.writeFile(tmpFilePath, buffer);

    const fullPath = path.join(process.cwd(), "uploads", session.storageKey);
    await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
    await fsPromises.rename(tmpFilePath, fullPath);

    if(fs.existsSync(tmpFilePath)) {
        fs.rmSync(tmpFilePath);
    }

    return NextResponse.json({ok: true});
}
