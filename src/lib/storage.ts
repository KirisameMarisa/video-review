import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fsPromises from "fs/promises";

const s3 = new S3Client({
    region: process.env.S3_REGION!,
});


export type UploadResult = {
    url: string;
    storageKey: string;
};

export interface FileStorage {
    upload(
        uploadFile: string,
        storageKey: string,
        contentType: string
    ): Promise<void>;

    getPlaybackUrl(storageKey: string): Promise<string>;
}

class LocalVideoStorage implements FileStorage {
    async upload(uploadFile: string, storageKey: string, contentType: string) {
        const fullPath = path.join(process.cwd(), "uploads", storageKey);
        await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
        await fsPromises.rename(uploadFile, fullPath);
    }

    async getPlaybackUrl(storageKey: string) {
        return `/api/uploads/${storageKey}`;
    }
}

class S3VideoStorage implements FileStorage {
    async upload(uploadFile: string, storageKey: string, contentType: string) {
        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: storageKey,
                Body: fs.createReadStream(uploadFile),
                ContentType: contentType,
            })
        );
    }

    async getPlaybackUrl(storageKey: string) {
        return getSignedUrl(
            s3,
            new GetObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: storageKey,
            }),
            { expiresIn: 60 * 10 }
        );
    }
}

export function getVideoStorage(): FileStorage {
    switch (process.env.VIDEO_STORAGE) {
        case "s3":
            return new S3VideoStorage();
        default:
            return new LocalVideoStorage();
    }
}
