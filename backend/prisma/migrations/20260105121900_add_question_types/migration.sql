/*
  Warnings:

  - The values [NORMAL,SNAKE_DODGE] on the enum `QuestionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QuestionType_new" AS ENUM ('CODING', 'NUMERICAL', 'MCQ', 'PHYSICAL');
ALTER TABLE "Question" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Question" ALTER COLUMN "type" TYPE "QuestionType_new" USING ("type"::text::"QuestionType_new");
ALTER TYPE "QuestionType" RENAME TO "QuestionType_old";
ALTER TYPE "QuestionType_new" RENAME TO "QuestionType";
DROP TYPE "QuestionType_old";
ALTER TABLE "Question" ALTER COLUMN "type" SET DEFAULT 'CODING';
COMMIT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "type" SET DEFAULT 'CODING';

-- AlterTable
ALTER TABLE "QuestionAssignment" ADD COLUMN     "participantAnswer" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);
