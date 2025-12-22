/*
  Warnings:

  - The values [LOCAL,S3] on the enum `UploadStorageType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UploadStorageType_new" AS ENUM ('local', 's3');
ALTER TABLE "UploadSession" ALTER COLUMN "storage" TYPE "UploadStorageType_new" USING ("storage"::text::"UploadStorageType_new");
ALTER TYPE "UploadStorageType" RENAME TO "UploadStorageType_old";
ALTER TYPE "UploadStorageType_new" RENAME TO "UploadStorageType";
DROP TYPE "public"."UploadStorageType_old";
COMMIT;
