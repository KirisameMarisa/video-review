/*
  Warnings:

  - You are about to drop the column `status` on the `UploadSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UploadSession" DROP COLUMN "status";

-- DropEnum
DROP TYPE "UploadSessionStatus";
