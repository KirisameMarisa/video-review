-- DropForeignKey: a guest's per-login id is stored here too and has no User row
ALTER TABLE "VideoComment" DROP CONSTRAINT "VideoComment_userId_fkey";

-- AlterTable
ALTER TABLE "VideoComment" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- Backfill authors of comments written while the server did not record one
UPDATE "VideoComment" c SET "userId" = u."id"
FROM "User" u
WHERE c."userId" IS NULL AND c."userEmail" <> '' AND lower(c."userEmail") = lower(u."email");
