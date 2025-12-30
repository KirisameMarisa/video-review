import { NextResponse } from "next/server";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/server/lib/storage/integrations/s3";
import { UploadStorageType } from'@/lib/db-types';
import { FileStorage } from "@/server/lib/storage";

import "server-only"

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
                    ? { ChecksumCRC32: '' }
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
