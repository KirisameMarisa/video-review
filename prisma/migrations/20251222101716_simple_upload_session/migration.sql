/*
  Warnings:

  - You are about to drop the column `createdAt` on the `UploadSession` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `UploadSession` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `UploadSession` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "UploadSession_expiresAt_idx";

-- DropIndex
DROP INDEX "UploadSession_status_idx";

-- AlterTable
ALTER TABLE "UploadSession" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "UploadSessionStatus";
