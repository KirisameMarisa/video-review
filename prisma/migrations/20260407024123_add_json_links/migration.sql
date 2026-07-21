/*
  Warnings:

  - You are about to drop the column `link` on the `VideoEvent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "links" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "VideoEvent" DROP COLUMN "link",
ADD COLUMN     "links" JSONB NOT NULL DEFAULT '[]';
