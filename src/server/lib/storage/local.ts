

import { UploadStorageType } from'@/lib/db-types';
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { FileStorage } from "@/server/lib/storage";

import "server-only"

export class LocalStorage implements FileStorage {
    type(): string {
        return UploadStorageType.local;
    }

    async hasObject(storageKey: string): Promise<boolean> {
        const abs = path.join(process.cwd(), "uploads", storageKey);
        return fs.existsSync(abs);
    }

    async uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if (contentType === "image/png") {
            return `/api/v1/drawing/upload/transfer/local?session_id=${session_id}`
        }
        // "video/mp4"
        return `/api/v1/videos/upload/transfer/local?session_id=${session_id}`
    }

    async fallbackURL(storageKey: string): Promise<string> {
        if (storageKey.includes("api/uploads/")) {
            return await Promise.resolve(`/${storageKey.replace("api/uploads/", "api/v1/media/local/")}`);
        } else {
            const url = `/api/v1/media/local/${storageKey}`;
            return await Promise.resolve(url);
        }
    }

    async download(storageKey: string): Promise<NextResponse> {
        return new Promise((resolve) => {
            let key = storageKey;
            if (storageKey.includes("api/uploads/")) {
                key = storageKey.replace("api/uploads/", "");
            }
            const abs = path.join(process.cwd(), "uploads", key);
            if (!fs.existsSync(abs)) {
                return  NextResponse.json({ error: "Video file is missing on server : " + abs }, { status: 500 });
            }
            const stream = fs.createReadStream(abs);
            return resolve(new NextResponse(stream as any, {
                headers: {
                    "Content-Type": "application/octet-stream",
                },
            }));
        });
    }
}
