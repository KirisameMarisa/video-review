-- AlterTable
ALTER TABLE "VideoRevision" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
