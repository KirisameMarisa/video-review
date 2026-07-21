/*
  Warnings:

  - You are about to drop the `PromptContextKinds` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "PromptContextKinds";

-- CreateTable
CREATE TABLE "VideoEventKind" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "VideoEventKind_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoEventKind_label_key" ON "VideoEventKind"("label");
