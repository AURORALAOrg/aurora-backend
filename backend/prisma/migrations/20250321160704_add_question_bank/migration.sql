/*
  Warnings:

  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SentenceOrdering` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Question";

-- DropTable
DROP TABLE "SentenceOrdering";

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "gameMetadata" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentence_orderings" (
    "id" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "words" TEXT[],
    "explanation" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "gameMetadata" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sentence_orderings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_type_idx" ON "questions"("type");

-- CreateIndex
CREATE INDEX "questions_createdBy_idx" ON "questions"("createdBy");

-- CreateIndex
CREATE INDEX "sentence_orderings_createdBy_idx" ON "sentence_orderings"("createdBy");
