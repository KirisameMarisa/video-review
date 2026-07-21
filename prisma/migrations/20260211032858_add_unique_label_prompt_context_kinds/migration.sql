/*
  Warnings:

  - A unique constraint covering the columns `[label]` on the table `PromptContextKinds` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PromptContextKinds_label_key" ON "PromptContextKinds"("label");
