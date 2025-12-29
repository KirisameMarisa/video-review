import { S3Client } from "@aws-sdk/client-s3";

import "server-only"

function createS3Client(): S3Client | null {
    let s3: S3Client | null = null;
    if (process.env.VIDEO_REVIEW_STORAGE === "s3") {
        if (process.env.S3_LOCALSTACK_ENDPOINT === "") {
            s3 = new S3Client({
                region: process.env.S3_REGION!
            });
        } else {
            s3 = new S3Client({
                endpoint: process.env.S3_LOCALSTACK_ENDPOINT,
                forcePathStyle: true,
                region: process.env.S3_REGION!,
                requestChecksumCalculation: "WHEN_SUPPORTED",
                responseChecksumValidation: "WHEN_SUPPORTED"
            });
        }
    }
    return s3;
}

export const s3Client = createS3Client();
