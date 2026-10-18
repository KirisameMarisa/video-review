-- AlterTable
ALTER TABLE "VideoComment" ADD COLUMN     "hasDrawing" BOOLEAN NOT NULL DEFAULT false;

-- Comments that already have a drawing file
UPDATE "VideoComment" SET "hasDrawing" = true WHERE "drawingPath" IS NOT NULL AND "drawingPath" <> '';
