-- AlterTable
ALTER TABLE "UploadSession" ADD COLUMN     "vcsWatchPaths" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "vcsWatchPaths" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "VCSConfig" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "tokenKey" TEXT,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VCSConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VCSRevisionLink" (
    "id" TEXT NOT NULL,
    "videoRevisionId" TEXT NOT NULL,
    "vcsConfigId" TEXT NOT NULL,
    "changeSet" JSONB,
    "fetchedAt" TIMESTAMP(3),

    CONSTRAINT "VCSRevisionLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VCSRevisionLink_videoRevisionId_vcsConfigId_key" ON "VCSRevisionLink"("videoRevisionId", "vcsConfigId");

-- AddForeignKey
ALTER TABLE "VCSRevisionLink" ADD CONSTRAINT "VCSRevisionLink_videoRevisionId_fkey" FOREIGN KEY ("videoRevisionId") REFERENCES "VideoRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VCSRevisionLink" ADD CONSTRAINT "VCSRevisionLink_vcsConfigId_fkey" FOREIGN KEY ("vcsConfigId") REFERENCES "VCSConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
