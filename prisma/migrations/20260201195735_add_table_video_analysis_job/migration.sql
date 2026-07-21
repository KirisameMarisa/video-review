-- CreateEnum
CREATE TYPE "VideoAnalysisStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "VideoAnalysisJob" (
    "id" TEXT NOT NULL,
    "videoRevisionId" TEXT NOT NULL,
    "status" "VideoAnalysisStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAnalysisJob_videoRevisionId_key" ON "VideoAnalysisJob"("videoRevisionId");

-- CreateIndex
CREATE INDEX "VideoAnalysisJob_status_idx" ON "VideoAnalysisJob"("status");

-- AddForeignKey
ALTER TABLE "VideoAnalysisJob" ADD CONSTRAINT "VideoAnalysisJob_videoRevisionId_fkey" FOREIGN KEY ("videoRevisionId") REFERENCES "VideoRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
