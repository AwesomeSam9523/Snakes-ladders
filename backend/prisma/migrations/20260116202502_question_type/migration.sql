/*
  Warnings:

  - You are about to drop the column `difficulty` on the `Question` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Question" DROP COLUMN "difficulty",
ADD COLUMN     "isSnakeQuestion" BOOLEAN NOT NULL DEFAULT false;
