const prisma = require('../../config/db');
const { rollDice, calculateNewPosition, getRandomRoom, hasReachedGoal } = require('./game.utils');
const { checkSnakeForTeam } = require('./board.service');
const { selectRandomQuestion } = require('./question.assignment');
const { GAME_CONFIG } = require('../../config/constants');
const { logDiceRoll, logCheckpointReached } = require('../audit/audit.service');
const { startTimer } = require('../participant/participant.service');

const processDiceRoll = async (teamId) => {
  // Start timer on first dice roll if not already started
  await startTimer(teamId);

  // Get current team state
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      teamCode: true,
      teamName: true,
      currentPosition: true,
      currentRoom: true,
      status: true,
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  // Roll the dice
  const diceValue = rollDice();
  const positionBefore = team.currentPosition;
  let positionAfter = calculateNewPosition(positionBefore, diceValue);

  // Check if team would exceed 150
  if (positionAfter > GAME_CONFIG.BOARD_SIZE) {
    positionAfter = positionBefore; // Stay at current position
  }

  // Check if team has reached position 150 (win condition)
  const hasWon = hasReachedGoal(positionAfter);

  // Parallel execution: Check snake and get checkpoint count at the same time
  const [snake, checkpointCount] = await Promise.all([
    checkSnakeForTeam(teamId, positionAfter),
    prisma.checkpoint.count({ where: { teamId } })
  ]);
  
  const isSnakePosition = snake !== null;

  // Automatically select question based on position type (even at position 150)
  const { question, roomType } = await selectRandomQuestion(teamId, isSnakePosition);

  // Get new room based on question type (TECH or NON_TECH)
  const newRoom = await getRandomRoom(team.currentRoom, teamId, roomType);

  // Check if team stayed at same position (roll would exceed 150)
  const stayedAtSamePosition = positionBefore === positionAfter && positionBefore !== GAME_CONFIG.BOARD_SIZE;
  
  // Batch all write operations in a transaction for atomicity and speed
  const [diceRollRecord, , checkpoint] = await prisma.$transaction([
    // Record the dice roll
    prisma.diceRoll.create({
      data: {
        teamId,
        value: diceValue,
        positionFrom: positionBefore,
        positionTo: positionAfter,
        roomAssigned: newRoom,
      },
    }),
    
    // Update team position and room
    prisma.team.update({
      where: { id: teamId },
      data: {
        currentPosition: positionAfter,
        currentRoom: newRoom,
        canRollDice: hasWon ? false : stayedAtSamePosition, // Disable dice immediately at position 150
        // Status will be set to COMPLETED when admin approves checkpoint at position 150
      },
    }),
    
    // Create checkpoint - always PENDING, even at position 150
    prisma.checkpoint.create({
      data: {
        teamId,
        checkpointNumber: checkpointCount + 1,
        positionBefore,
        positionAfter,
        roomNumber: newRoom,
        status: 'PENDING',
        isSnakePosition,
      },
    }),
  ]);

  // Create question assignment
  await prisma.questionAssignment.create({
    data: {
      checkpointId: checkpoint.id,
      questionId: question.id,
      status: 'PENDING',
    },
  });

  // Fire and forget: Log operations don't need to block response
  Promise.all([
    logDiceRoll(team.teamCode, team.teamName, diceValue, positionBefore, positionAfter),
    logCheckpointReached(
      team.teamCode, 
      team.teamName, 
      checkpointCount + 1, 
      positionAfter, 
      newRoom, 
      isSnakePosition,
      hasWon ? 'Reached position 150 - Awaiting admin approval' : `Auto-assigned ${question.type} question (${question.id})`
    )
  ]).catch(err => console.error('Audit logging error:', err));

  return {
    diceValue,
    positionBefore,
    positionAfter,
    roomAssigned: newRoom,
    roomType,
    isSnakePosition,
    questionType: question.type,
    questionAssigned: true,
    checkpoint,
    diceRoll: diceRollRecord,
    hasWon,
  };
};

const getDiceRollHistory = async (teamId) => {
  return await prisma.diceRoll.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  processDiceRoll,
  getDiceRollHistory,
};

