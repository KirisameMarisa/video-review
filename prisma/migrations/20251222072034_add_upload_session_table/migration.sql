-- CreateEnum
CREATE TYPE "UploadSessionStatus" AS ENUM ('INIT', 'UPLOADING', 'FINISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "UploadStorageType" AS ENUM ('LOCAL', 'S3');

-- CreateTable
CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storage" "UploadStorageType" NOT NULL,
    "title" TEXT NOT NULL,
    "folderKey" TEXT NOT NULL,
    "scenePath" TEXT NOT NULL,
    "nextRev" INTEGER NOT NULL,
    "status" "UploadSessionStatus" NOT NULL DEFAULT 'INIT',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadSession_status_idx" ON "UploadSession"("status");

-- CreateIndex
CREATE INDEX "UploadSession_expiresAt_idx" ON "UploadSession"("expiresAt");
