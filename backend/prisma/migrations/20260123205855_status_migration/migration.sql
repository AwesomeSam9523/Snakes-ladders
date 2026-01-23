-- CreateIndex
CREATE INDEX "Checkpoint_teamId_status_idx" ON "Checkpoint"("teamId", "status");

-- CreateIndex
CREATE INDEX "Checkpoint_status_idx" ON "Checkpoint"("status");

-- CreateIndex
CREATE INDEX "QuestionAssignment_status_idx" ON "QuestionAssignment"("status");

-- CreateIndex
CREATE INDEX "QuestionAssignment_questionId_idx" ON "QuestionAssignment"("questionId");

-- CreateIndex
CREATE INDEX "Team_status_idx" ON "Team"("status");

-- CreateIndex
CREATE INDEX "Team_canRollDice_idx" ON "Team"("canRollDice");

-- CreateIndex
CREATE INDEX "Team_currentPosition_idx" ON "Team"("currentPosition");
