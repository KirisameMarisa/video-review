/*
  Warnings:

  - A unique constraint covering the columns `[id,latestRevisionNum]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "latestRevisionNum" INTEGER;

-- Backfill latest revision number for existing videos
UPDATE "Video" v
SET "latestRevisionNum" = s."latestRevisionNum"
FROM (
  SELECT
    vr."videoId",
    MAX(vr."revision") AS "latestRevisionNum"
  FROM "VideoRevision" vr
  WHERE vr."deleted" = false
  GROUP BY vr."videoId"
) s
WHERE v."id" = s."videoId"
  AND v."latestRevisionNum" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Video_id_latestRevisionNum_key" ON "Video"("id", "latestRevisionNum");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_id_latestRevisionNum_fkey" FOREIGN KEY ("id", "latestRevisionNum") REFERENCES "VideoRevision"("videoId", "revision") ON DELETE RESTRICT ON UPDATE CASCADE;
