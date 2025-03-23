-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('multiple_choice', 'sentence_ordering');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "gameMetadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentenceOrdering" (
    "id" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "words" TEXT[],
    "explanation" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "gameMetadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',

    CONSTRAINT "SentenceOrdering_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_type_idx" ON "Question"("type");

-- CreateIndex
CREATE INDEX "Question_createdBy_idx" ON "Question"("createdBy");

-- CreateIndex
CREATE INDEX "SentenceOrdering_createdBy_idx" ON "SentenceOrdering"("createdBy");
