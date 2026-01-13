-- AlterTable
ALTER TABLE "Checkpoint" ALTER COLUMN "roomNumber" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "currentRoom" SET DEFAULT 'AB1 301',
ALTER COLUMN "currentRoom" SET DATA TYPE TEXT;
