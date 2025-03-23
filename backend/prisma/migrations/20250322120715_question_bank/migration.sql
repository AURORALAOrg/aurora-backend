/*
  Warnings:

  - You are about to drop the column `type` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `explanation` on the `sentence_orderings` table. All the data in the column will be lost.
  - You are about to drop the column `sentence` on the `sentence_orderings` table. All the data in the column will be lost.
  - You are about to drop the column `words` on the `sentence_orderings` table. All the data in the column will be lost.
  - Added the required column `content` to the `sentence_orderings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "questions_type_idx";

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "sentence_orderings" DROP COLUMN "explanation",
DROP COLUMN "sentence",
DROP COLUMN "words",
ADD COLUMN     "content" JSONB NOT NULL;
