-- CreateTable
CREATE TABLE "VideoEvent" (
    "id" TEXT NOT NULL,
    "videoRevisionId" TEXT NOT NULL,
    "kindId" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoEvent_videoRevisionId_idx" ON "VideoEvent"("videoRevisionId");

-- CreateIndex
CREATE INDEX "VideoEvent_kindId_idx" ON "VideoEvent"("kindId");

-- CreateIndex
CREATE INDEX "VideoEvent_videoRevisionId_kindId_startMs_idx" ON "VideoEvent"("videoRevisionId", "kindId", "startMs");

-- AddForeignKey
ALTER TABLE "VideoEvent" ADD CONSTRAINT "VideoEvent_videoRevisionId_fkey" FOREIGN KEY ("videoRevisionId") REFERENCES "VideoRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoEvent" ADD CONSTRAINT "VideoEvent_kindId_fkey" FOREIGN KEY ("kindId") REFERENCES "VideoEventKind"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
