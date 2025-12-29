import { UploadStorageType } from "@prisma/client";
import { NextResponse } from "next/server";
import { FileStorage } from "@/server/lib/storage";
import { nextCloudClient } from "@/server/lib/storage/integrations/nextcloud";

import "server-only"

export class NextCloudStorage implements FileStorage {
    type(): string {
        return UploadStorageType.nextCloud;
    }

    async hasObject(storageKey: string): Promise<boolean> {
        return nextCloudClient?.hasObject(storageKey) || false;
    }

    async uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if (contentType === "image/png") {
            return `/api/v1/drawing/upload/transfer/nextcloud?session_id=${session_id}`
        }
        // "video/mp4"
        return `/api/v1/videos/upload/transfer/nextcloud?session_id=${session_id}`
    }

    async fallbackURL(storageKey: string): Promise<string> {
        return `/api/v1/media/nextcloud/${storageKey}`;
    }

    async download(storageKey: string): Promise<NextResponse> {
        return nextCloudClient!.download(storageKey);
    }
}