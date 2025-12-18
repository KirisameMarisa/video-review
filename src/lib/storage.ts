import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { apiError } from "./api-response";

export interface FileStorage {
    upload(tmpFilePath: string, storageKey: string, contentType: string): Promise<void>;
    fallbackURL(storageKey: string): Promise<string>;
    download(filename: string, storageKey: string): Promise<NextResponse>;
}

export class LocalStorage implements FileStorage {
    async upload(tmpFilePath: string, storageKey: string, contentType: string): Promise<void> {
        const fullPath = path.join(process.cwd(), "uploads", storageKey);
        await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
        await fsPromises.rename(tmpFilePath, fullPath);
    }

    async fallbackURL(storageKey: string): Promise<string> {
        if (storageKey.includes("/api/uploads/")) {
            return Promise.reject(undefined);
        } else {
            const url = `/api/uploads/${storageKey}`;
            return await Promise.resolve(url);
        }
    }

    async download(filename: string, storageKey: string): Promise<NextResponse> {
        return new Promise((resolve) => {
            const abs = path.join(process.cwd(), "uploads", storageKey); `/api/uploads/${storageKey}`;
            if (!fs.existsSync(abs)) {
                return resolve(apiError("Video file is missing on server : " + abs, 500));
            }

            const stream = fs.createReadStream(abs);
            return resolve(new NextResponse(stream as any, {
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            }));
        });
    }
}

export class S3Storage implements FileStorage {
    async upload(tmpFilePath: string, storageKey: string, contentType: string): Promise<void> {
        await s3Client?.send(
            new PutObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: storageKey,
                Body: fs.createReadStream(tmpFilePath),
                ContentType: contentType,
            })
        );
    }

    async fallbackURL(storageKey: string): Promise<string> {
        if (!s3Client) return Promise.reject(undefined);
        try {
            let ret = await getSignedUrl(
                s3Client,
                new GetObjectCommand({
                    Bucket: process.env.S3_BUCKET!,
                    Key: storageKey,
                }),
                { expiresIn: 60 * 10 }
            );
            if (ret.includes("http://localstack")) {
                ret = ret.replace("http://localstack", "http://localhost");
            }
            console.log("Signed URL obtained:", ret);

            return ret;
        } catch (err) {
            console.error("Failed to get signed URL:", err);
            return Promise.reject(undefined);
        }
    }


    async download(filename: string, storageKey: string): Promise<NextResponse> {
        if (!s3Client) return Promise.reject(undefined);
        
        let url = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: storageKey,
                ResponseContentDisposition: `attachment; filename="${filename}"`,
            }),
            { expiresIn: 600 }
        );

        if (url.includes("http://localstack")) {
            url = url.replace("http://localstack", "http://localhost");
        }

        return NextResponse.redirect(url, 302);
    }
}

export const VideoReviewStorage: FileStorage = (() => {
    switch (process.env.VIDEO_REVIEW_STORAGE) {
        case "s3":
            return new S3Storage();
        default:
            return new LocalStorage();
    }
})();
