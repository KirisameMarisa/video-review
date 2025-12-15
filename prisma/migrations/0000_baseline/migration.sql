-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "folderKey" TEXT NOT NULL,
    "scenePath" TEXT,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoRevision" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoComment" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "videoRev" TEXT,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL DEFAULT '',
    "comment" TEXT NOT NULL,
    "time" DOUBLE PRECISION NOT NULL,
    "issueId" TEXT,
    "drawingPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "thumbsUp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VideoComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JiraAvatarCache" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JiraAvatarCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JiraAvatarCache_email_key" ON "JiraAvatarCache"("email");

-- AddForeignKey
ALTER TABLE "VideoRevision" ADD CONSTRAINT "VideoRevision_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

