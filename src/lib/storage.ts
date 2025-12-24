import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { apiError } from "./api-response";
import { UploadStorageType } from "@prisma/client";

export interface FileStorage {
    type(): string;
    uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string>;
    fallbackURL(storageKey: string): Promise<string>;
    download(storageKey: string): Promise<NextResponse>;
    hasObject(storageKey: string): Promise<boolean>;
}

export class LocalStorage implements FileStorage {
    type(): string {
        return UploadStorageType.local;
    }

    async hasObject(storageKey: string): Promise<boolean> {
        const abs = path.join(process.cwd(), "uploads", storageKey);
        return fs.existsSync(abs);
    }

    async uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if(contentType === "image/png") {
            return `/api/drawing/upload/transfer/local?session_id=${session_id}`
        } 
        // "video/mp4"
        return `/api/videos/upload/transfer/local?session_id=${session_id}`
    }

    async fallbackURL(storageKey: string): Promise<string> {
        if (storageKey.includes("api/uploads/")) {
            return await Promise.resolve(`/${storageKey}`);
        } else {
            const url = `/api/uploads/${storageKey}`;
            return await Promise.resolve(url);
        }
    }

    async download(storageKey: string): Promise<NextResponse> {
        return new Promise((resolve) => {
            const abs = path.join(process.cwd(), "uploads", storageKey); `/api/uploads/${storageKey}`;
            if (!fs.existsSync(abs)) {
                return resolve(apiError("Video file is missing on server : " + abs, 500));
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

export class S3Storage implements FileStorage {
    type(): string {
        return UploadStorageType.s3;
    }

    async hasObject(storageKey: string): Promise<boolean> {
        if (!s3Client) return false;

        try {
            await s3Client.send(
                new HeadObjectCommand({
                    Bucket: process.env.S3_BUCKET!,
                    Key: storageKey,
                })
            );
            return true;
        } catch (err: any) {
            if (err?.$metadata?.httpStatusCode === 404) {
                return false;
            }
            console.warn("S3 hasObject error:", err);
            return false;
        }
    }

    async uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if (!s3Client) return Promise.reject(undefined);


        
        let url = await getSignedUrl(
            s3Client,
            new PutObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: storageKey,
                ContentType: contentType,
                ...(process.env.S3_LOCALSTACK_ENDPOINT !== ""
                    ? {ChecksumCRC32: ''}
                    : {}
                ),
            }),
            { expiresIn: 300 }
        );
        if (url.includes("http://localstack")) {
            url = url.replace("http://localstack", "http://localhost");
        }
        return url;
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

    async download(storageKey: string): Promise<NextResponse> {
        if (!s3Client) return Promise.reject(undefined);

        let url = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: storageKey,
            }),
            { expiresIn: 600 }
        );

        if (url.includes("http://localstack")) {
            url = url.replace("http://localstack", "http://localhost");
        }
        console.log("download", url);

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
