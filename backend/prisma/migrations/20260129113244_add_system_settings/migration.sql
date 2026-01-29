-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "floor" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "currentRoom" SET DEFAULT 'AB1 201';

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");
