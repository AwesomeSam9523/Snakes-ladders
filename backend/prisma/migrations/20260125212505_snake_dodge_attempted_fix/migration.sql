-- AlterTable
ALTER TABLE "Checkpoint" ALTER COLUMN "snakeDodgeAttempted" DROP NOT NULL,
ALTER COLUMN "snakeDodgeAttempted" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "timerPausedAt" TIMESTAMP(3),
ADD COLUMN     "timerStartedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BoardRule_mapId_type_idx" ON "BoardRule"("mapId", "type");

-- CreateIndex
CREATE INDEX "BoardRule_mapId_type_startPos_idx" ON "BoardRule"("mapId", "type", "startPos");
