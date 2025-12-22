/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `UploadSession` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UploadSessionStatus" AS ENUM ('init', 'finished', 'failed');

-- AlterTable
ALTER TABLE "UploadSession" DROP COLUMN "updatedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "UploadSessionStatus" NOT NULL DEFAULT 'init';
