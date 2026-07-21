/*
  Warnings:

  - You are about to drop the column `changeSet` on the `VCSRevisionLink` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VCSRevisionLink" DROP COLUMN "changeSet",
ADD COLUMN     "commitResults" JSONB,
ADD COLUMN     "mergeResults" JSONB,
ADD COLUMN     "rangeFrom" TIMESTAMP(3),
ADD COLUMN     "rangeTo" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VCSCachedMerge" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT NOT NULL,
    "mergedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    "labels" TEXT[],
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filesFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VCSCachedMerge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VCSCachedCommit" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "shortHash" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filesFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VCSCachedCommit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VCSCachedMerge_externalId_repoName_key" ON "VCSCachedMerge"("externalId", "repoName");

-- CreateIndex
CREATE UNIQUE INDEX "VCSCachedCommit_hash_repoName_key" ON "VCSCachedCommit"("hash", "repoName");
