/*
  Warnings:

  - The values [INIT,UPLOADING,FINISHED,FAILED] on the enum `UploadSessionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UploadSessionStatus_new" AS ENUM ('init', 'finished', 'failed');
ALTER TABLE "public"."UploadSession" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UploadSession" ALTER COLUMN "status" TYPE "UploadSessionStatus_new" USING ("status"::text::"UploadSessionStatus_new");
ALTER TYPE "UploadSessionStatus" RENAME TO "UploadSessionStatus_old";
ALTER TYPE "UploadSessionStatus_new" RENAME TO "UploadSessionStatus";
DROP TYPE "public"."UploadSessionStatus_old";
ALTER TABLE "UploadSession" ALTER COLUMN "status" SET DEFAULT 'init';
COMMIT;

-- AlterTable
ALTER TABLE "UploadSession" ALTER COLUMN "status" SET DEFAULT 'init';
