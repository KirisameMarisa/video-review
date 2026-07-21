export type {
    Video,
    VideoRevision,
    UploadSession,
    User,
    UserVideoReadStatus,
    Identity,
    VideoComment,
    VideoEvent,
    VideoEventKind,
} from "@prisma/client";

export { UploadStorageType } from "@prisma/client";
export { Prisma as PrismaTypes } from "@prisma/client";

import { Video, VideoRevision, VideoEvent, VideoEventKind } from "@prisma/client";
export type VideoWithRevision = Video & {
  latestRevision: Pick<VideoRevision, "revision" | "uploadedAt" | "tags"> | null;
};

export type VideoEventLink = { label?: string; url: string };

export type VideoEventWithKind = Omit<VideoEvent, "links"> & {
    kind: Pick<VideoEventKind, "label">;
    links: VideoEventLink[];
};
