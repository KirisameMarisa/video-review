/*
  Warnings:

  - You are about to drop the column `userEmail` on the `UserVideoReadStatus` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,videoId]` on the table `UserVideoReadStatus` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserVideoReadStatus_userEmail_videoId_key";

-- AlterTable
ALTER TABLE "UserVideoReadStatus" DROP COLUMN "userEmail";

-- CreateIndex
CREATE UNIQUE INDEX "UserVideoReadStatus_userId_videoId_key" ON "UserVideoReadStatus"("userId", "videoId");
