import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { authorize, JwtError } from "@/lib/jwt";
import { VideoReviewStorage } from "@/lib/storage";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/upload-session";
import { UploadStorageType } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        authorize(req, ["viewer", "admin", "guest"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return apiError(e.message, e.status);
        }
        return apiError("unauthorized", 401);
    }

    const formData = await req.formData();
    const savePath = formData.get("path") as string;
    const storageKey = savePath ? savePath : `drawing/${uuidv4()}.png`;

    const type = VideoReviewStorage.type();
    const session = await createSession({
        nextRev: 0,
        title: "",
        folderKey: "",
        scenePath: "",
        storageKey,
        storage: type as UploadStorageType,
    });
    const url = await VideoReviewStorage.uploadURL(session.id, storageKey, "image/png");
    return NextResponse.json({ url, session });
}
