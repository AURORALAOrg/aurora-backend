-- CreateEnum
CREATE TYPE "EnglishLevel" AS ENUM ('a1', 'a2', 'b1', 'b2', 'c1', 'c2');

-- CreateEnum
CREATE TYPE "TopicCategory" AS ENUM ('daily_life', 'work_business', 'travel', 'education', 'entertainment', 'health', 'technology', 'culture', 'grammar', 'vocabulary');

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TopicCategory" NOT NULL,
    "englishLevel" "EnglishLevel" NOT NULL,
    "prompts" JSONB NOT NULL,
    "keywords" JSONB NOT NULL,
    "objectives" JSONB NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topics_englishLevel_category_idx" ON "topics"("englishLevel", "category");

-- CreateIndex
CREATE INDEX "topics_status_idx" ON "topics"("status");
