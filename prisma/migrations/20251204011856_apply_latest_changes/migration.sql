/*
  Warnings:

  - You are about to drop the column `videoRev` on the `VideoComment` table. All the data in the column will be lost.
  - Added the required column `videoRevNum` to the `VideoComment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Video
ALTER TABLE "Video"
    ADD COLUMN "latestUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: VideoComment
ALTER TABLE "VideoComment"
    ADD COLUMN "videoRevNum" INTEGER;

-- 既存データに暫定値を入れる
UPDATE "VideoComment"
SET "videoRevNum" = 0
WHERE "videoRevNum" IS NULL;

-- 最後に NOT NULL 制約を有効化
ALTER TABLE "VideoComment"
    ALTER COLUMN "videoRevNum" SET NOT NULL;
