-- CreateTable
CREATE TABLE "VCSFetchedRange" (
    "repoName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "VCSFetchedRange_repoName_date_key" ON "VCSFetchedRange"("repoName", "date");
