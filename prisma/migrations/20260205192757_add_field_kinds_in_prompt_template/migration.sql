-- AlterTable
ALTER TABLE "PromptTemplate" ADD COLUMN     "kinds" TEXT[] DEFAULT ARRAY[]::TEXT[];
