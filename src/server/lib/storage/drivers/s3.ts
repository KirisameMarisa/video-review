import { S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { FileDriver } from "@/server/lib/storage/drivers";
import fs, { createReadStream } from "fs";
import { lookup } from "mime-types";

export class S3Driver implements FileDriver {
    readonly s3: S3Client | undefined = undefined;
    readonly bucket: string | undefined = undefined;
    readonly localStackEndpoint: string | undefined = undefined;

    constructor(s3LocalStackEndpoint: string | undefined, region: string | undefined, bucket: string | undefined) {
        this.bucket = bucket;
        this.localStackEndpoint = s3LocalStackEndpoint;
        if (this.localStackEndpoint) {
            this.s3 = new S3Client({
                endpoint: this.localStackEndpoint,
                forcePathStyle: true,
                region: region,
                requestChecksumCalculation: "WHEN_SUPPORTED",
                responseChecksumValidation: "WHEN_SUPPORTED",
            });
        } else {
            this.s3 = new S3Client({
                region: region,
            });
        }
    }

    type(): string {
        return "s3";
    }

    async hasObject(storageKey: string): Promise<boolean> {
        if (!this.s3 || !this.bucket) return false;

        try {
            await this.s3.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
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

    async directUploadFromBuffer(storageKey: string, src: Readable, contentType: string, cacheControl?: string): Promise<void> {
        if (!this.s3 || !this.bucket) return Promise.reject(undefined);

        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: storageKey,
                Body: src,
                ContentType: contentType,
                CacheControl: cacheControl,
                ...(this.localStackEndpoint
                    ? { ChecksumCRC32: "" }
                    : {}
                ),
            });
            await this.s3.send(command);
        } catch (e) { return; }
    }

    async directUploadFromFile(storageKey: string, src: string): Promise<void> {
        if (!this.s3 || !this.bucket) return Promise.reject(undefined);

        try {
            await this.directUploadFromBuffer(
                storageKey,
                createReadStream(src),
                lookup(src) || "application/octet-stream");
        } catch (e) { return; }
    }

    async uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if (!this.s3 || !this.bucket) return Promise.reject(undefined);

        let url = await getSignedUrl(
            this.s3,
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: storageKey,
                ContentType: contentType,
                ...(this.localStackEndpoint
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
        if (!this.s3 || !this.bucket) return Promise.reject(undefined);

        const hasObject = await this.hasObject(storageKey);
        if (!hasObject) {
            return Promise.reject(undefined);
        }

        try {
            let ret = await getSignedUrl(
                this.s3,
                new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: storageKey,
                }),
                { expiresIn: 60 * 10 }
            );
            if (ret.includes("http://localstack")) {
                ret = ret.replace("http://localstack", "http://localhost");
            }

            return ret;
        } catch (err) {
            console.error("Failed to get signed URL:", err);
            return Promise.reject(undefined);
        }
    }

    async directReadStream(storageKey: string) {
        if (!this.s3 || !this.bucket) return Promise.reject(undefined);

        const obj = await this.s3.send(new GetObjectCommand({
            Bucket: this.bucket,
            Key: storageKey,
        }));
        return obj.Body as Readable;
    }

    async deleteObject(storageKey: string): Promise<boolean> {
        if (!this.s3 || !this.bucket) return Promise.reject(undefined);

        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: storageKey,
            });

            await this.s3.send(command);
            return true;
        } catch (e) {
            return false;
        }
    }

    async download(storageKey: string): Promise<Readable | string> {
        if (!this.s3 || !this.bucket) return Promise.reject(undefined);

        let url = await getSignedUrl(
            this.s3,
            new GetObjectCommand({
                Bucket: this.bucket,
                Key: storageKey,
            }),
            { expiresIn: 600 }
        );

        if (url.includes("http://localstack")) {
            url = url.replace("http://localstack", "http://localhost");
        }
        return url;
    }
}
