/*
  Warnings:

  - You are about to drop the column `videoRev` on the `VideoComment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VideoComment" DROP COLUMN "videoRev";

-- CreateTable
CREATE TABLE "UserVideoReadStatus" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "lastReadCommentId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVideoReadStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserVideoReadStatus_userEmail_videoId_key" ON "UserVideoReadStatus"("userEmail", "videoId");
