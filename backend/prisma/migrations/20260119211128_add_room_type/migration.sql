-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('TECH', 'NON_TECH');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "roomType" "RoomType" NOT NULL DEFAULT 'NON_TECH';
