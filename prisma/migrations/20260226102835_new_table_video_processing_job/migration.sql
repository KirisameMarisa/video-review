/*
  Warnings:

  - The `status` column on the `VideoAnalysisJob` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed');

-- AlterTable
ALTER TABLE "VideoAnalysisJob" DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'pending';

-- DropEnum
DROP TYPE "VideoAnalysisStatus";

-- CreateTable
CREATE TABLE "VideoProcessingJob" (
    "id" TEXT NOT NULL,
    "videoRevisionId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoProcessingJob_videoRevisionId_key" ON "VideoProcessingJob"("videoRevisionId");

-- CreateIndex
CREATE INDEX "VideoProcessingJob_status_idx" ON "VideoProcessingJob"("status");

-- CreateIndex
CREATE INDEX "VideoAnalysisJob_status_idx" ON "VideoAnalysisJob"("status");

-- AddForeignKey
ALTER TABLE "VideoProcessingJob" ADD CONSTRAINT "VideoProcessingJob_videoRevisionId_fkey" FOREIGN KEY ("videoRevisionId") REFERENCES "VideoRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
