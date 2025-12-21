-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'DISQUALIFIED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CheckpointStatus" AS ENUM ('PENDING', 'APPROVED', 'FAILED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('NORMAL', 'SNAKE_DODGE');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'CORRECT', 'INCORRECT');

-- CreateEnum
CREATE TYPE "BoardRuleType" AS ENUM ('SNAKE', 'LADDER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PARTICIPANT', 'ADMIN', 'SUPERADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "teamCode" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "currentPosition" INTEGER NOT NULL DEFAULT 1,
    "currentRoom" INTEGER NOT NULL DEFAULT 1,
    "totalTimeSec" INTEGER NOT NULL DEFAULT 0,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "canRollDice" BOOLEAN NOT NULL DEFAULT true,
    "mapId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiceRoll" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "positionFrom" INTEGER NOT NULL,
    "positionTo" INTEGER NOT NULL,
    "roomAssigned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiceRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "checkpointNumber" INTEGER NOT NULL,
    "positionBefore" INTEGER NOT NULL,
    "positionAfter" INTEGER NOT NULL,
    "roomNumber" INTEGER NOT NULL,
    "status" "CheckpointStatus" NOT NULL DEFAULT 'PENDING',
    "isSnakePosition" BOOLEAN NOT NULL DEFAULT false,
    "snakeDodgeAttempted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "type" "QuestionType" NOT NULL DEFAULT 'NORMAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAssignment" (
    "id" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "QuestionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardMap" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardRule" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "type" "BoardRuleType" NOT NULL,
    "startPos" INTEGER NOT NULL,
    "endPos" INTEGER NOT NULL,

    CONSTRAINT "BoardRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_teamId_key" ON "User"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamCode_key" ON "Team"("teamCode");

-- CreateIndex
CREATE UNIQUE INDEX "Checkpoint_teamId_checkpointNumber_key" ON "Checkpoint"("teamId", "checkpointNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAssignment_checkpointId_key" ON "QuestionAssignment"("checkpointId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardMap_name_key" ON "BoardMap"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BoardRule_mapId_startPos_key" ON "BoardRule"("mapId", "startPos");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "BoardMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiceRoll" ADD CONSTRAINT "DiceRoll_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAssignment" ADD CONSTRAINT "QuestionAssignment_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAssignment" ADD CONSTRAINT "QuestionAssignment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardRule" ADD CONSTRAINT "BoardRule_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "BoardMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
