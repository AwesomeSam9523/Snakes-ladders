const prisma = require('../../config/db');
const { logAdminAction, AUDIT_ACTIONS } = require('../audit/audit.service');

const getAllTeams = async () => {
  return await prisma.team.findMany({
    include: {
      members: true,
      user: {
        select: {
          username: true,
        },
      },
      checkpoints: {
        orderBy: { checkpointNumber: 'desc' },
        include: {
          questionAssign: {
            include: { question: true },
          },
        },
      },
    },
    orderBy: { currentPosition: 'desc' },
  });
};

const getTeamById = async (teamId) => {
  return await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: true,
      user: {
        select: {
          username: true,
        },
      },
      checkpoints: {
        orderBy: { checkpointNumber: 'asc' },
        include: {
          questionAssign: {
            include: { question: true },
          },
        },
      },
      diceRolls: {
        orderBy: { createdAt: 'desc' },
      },
      timeLogs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};
 //Get all pending checkpoints for admin view

const getPendingCheckpoints = async () => {
  return await prisma.checkpoint.findMany({
    where: { status: 'PENDING' },
    include: {
      team: {
        select: {
          id: true,
          teamCode: true,
          teamName: true,
          currentPosition: true,
          currentRoom: true,
          timerPaused: true,
        },
      },
      questionAssign: {
        include: { question: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
};


const getCheckpointById = async (checkpointId) => {
  return await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: {
      team: true,
      questionAssign: {
        include: { question: true },
      },
    },
  });
};


const assignQuestionToCheckpoint = async (checkpointId, questionId, adminUsername = 'admin') => {
  // Check if question is already assigned to another pending checkpoint
  const existingAssignment = await prisma.questionAssignment.findFirst({
    where: {
      questionId,
      status: 'PENDING',
    },
  });

  if (existingAssignment) {
    throw new Error('Question is already assigned to another team');
  }

  // Get question details to check type
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    throw new Error('Question not found');
  }

  // Get checkpoint with team details
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: { team: true },
  });

  if (!checkpoint) {
    throw new Error('Checkpoint not found');
  }

  // Determine if room change is needed based on question type
  // CODING or snake position → TECH room
  // Others (NUMERICAL, MCQ, PHYSICAL) → NON-TECH room
  const needsTechRoom = question.type === 'CODING' || checkpoint.isSnakePosition;
  const { getRandomRoom } = require('../game/game.utils');

  let newRoom = checkpoint.roomNumber;
  const currentRoom = checkpoint.team.currentRoom;

  // If current room type doesn't match question requirement, reassign room
  const currentRoomData = await prisma.room.findUnique({
    where: { roomNumber: currentRoom },
  });

  if (currentRoomData) {
    const currentRoomIsTech = currentRoomData.roomType === 'TECH';
    
    // If room type doesn't match requirement, get new room
    if ((needsTechRoom && !currentRoomIsTech) || (!needsTechRoom && currentRoomIsTech)) {
      newRoom = await getRandomRoom(currentRoom, checkpoint.team.id, needsTechRoom ? 'TECH' : 'NON_TECH');
      
      // Update team's current room and checkpoint room
      await prisma.team.update({
        where: { id: checkpoint.team.id },
        data: { currentRoom: newRoom },
      });

      await prisma.checkpoint.update({
        where: { id: checkpointId },
        data: { roomNumber: newRoom },
      });
    }
  }

  const assignment = await prisma.questionAssignment.create({
    data: {
      checkpointId,
      questionId,
    },
    include: {
      question: true,
      checkpoint: {
        include: { team: true }
      },
    },
  });

  // Log question assignment to audit
  await logAdminAction(
    adminUsername,
    'admin',
    AUDIT_ACTIONS.QUESTION_ASSIGNED,
    assignment.checkpoint.team.teamName,
    {
      checkpointId,
      questionId,
      questionType: question.type,
      roomAssigned: newRoom,
      message: `Assigned ${question.type} question to ${assignment.checkpoint.team.teamName} in room ${newRoom}`
    }
  );

  return assignment;
};


const markQuestionAnswer = async (assignmentId, isCorrect, adminUsername = 'admin') => {
  const assignment = await prisma.questionAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      checkpoint: {
        include: { team: true },
      },
      question: true,
    },
  });

  if (!assignment) {
    throw new Error('Question assignment not found');
  }

  // Check if already marked (for auto-marked types, admin can override)
  const questionType = assignment.question.type;
  const isAutoMarkType = questionType === 'NUMERICAL' || questionType === 'MCQ';
  
  // If it's a CODING or PHYSICAL type and no answer submitted yet
  if (!isAutoMarkType && !assignment.participantAnswer) {
    throw new Error('No answer submitted yet');
  }

  // Update question status
  const updatedAssignment = await prisma.questionAssignment.update({
    where: { id: assignmentId },
    data: {
      status: isCorrect ? 'CORRECT' : 'INCORRECT',
      answeredAt: new Date(),
    },
  });

  // Calculate points based on snake position and answer correctness
  let pointsChange = 0;
  if (assignment.checkpoint.isSnakePosition) {
    // Snake position: correct = 0, incorrect = -1
    pointsChange = isCorrect ? 0 : -1;
  } else {
    // Normal position: correct = +1, incorrect = 0
    pointsChange = isCorrect ? 1 : 0;
  }

  // Update team points, position, and room
  await prisma.team.update({
    where: { id: assignment.checkpoint.teamId },
    data: {
      currentPosition: assignment.checkpoint.positionAfter,
      currentRoom: assignment.checkpoint.roomNumber,
      points: { increment: pointsChange },
      canRollDice: true,
    },
  });

  // Approve checkpoint
  await prisma.checkpoint.update({
    where: { id: assignment.checkpointId },
    data: { status: 'APPROVED' },
  });

  // Log the answer marking to audit
  await logAdminAction(
    adminUsername,
    'admin',
    isCorrect ? AUDIT_ACTIONS.ANSWER_MARKED_CORRECT : AUDIT_ACTIONS.ANSWER_MARKED_INCORRECT,
    assignment.checkpoint.team.teamName,
    {
      assignmentId,
      checkpointId: assignment.checkpointId,
      isCorrect,
      message: `Marked answer as ${isCorrect ? 'correct' : 'incorrect'} for ${assignment.checkpoint.team.teamName}`
    }
  );

  return updatedAssignment;
};

const getAvailableQuestions = async (type = null) => {
  const assignedQuestionIds = await prisma.questionAssignment.findMany({
    where: { status: 'PENDING' },
    select: { questionId: true },
  });

  const excludeIds = assignedQuestionIds.map(a => a.questionId);

  const whereClause = {
    isActive: true,
    id: { notIn: excludeIds },
  };

  if (type) {
    whereClause.type = type;
  }

  const questions = await prisma.question.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
  });

  // Map text to content for frontend compatibility
  return questions.map(q => ({
    ...q,
    content: q.text,
  }));
};

const getTeamProgress = async (teamId) => {
  return await prisma.checkpoint.findMany({
    where: { teamId },
    include: {
      questionAssign: {
        include: { question: true },
      },
    },
    orderBy: { checkpointNumber: 'asc' },
  });
};

// Approve a checkpoint (team has physically reached the checkpoint)
// NOTE: Dice is NOT unlocked here - it will be unlocked only after question is marked
const approveCheckpoint = async (checkpointId, adminUsername = 'admin') => {
  const checkpoint = await prisma.checkpoint.update({
    where: { id: checkpointId },
    data: { status: 'APPROVED' },
    include: {
      team: true,
      questionAssign: true,
    },
  });

  // NOTE: Dice roll is NOT unlocked here anymore
  // The flow is: roll dice → checkpoint created → admin approves → admin assigns question → participant answers → admin marks → dice unlocked

  // Log the checkpoint approval to audit
  await logAdminAction(
    adminUsername,
    'admin',
    AUDIT_ACTIONS.CHECKPOINT_APPROVED,
    checkpoint.team.teamName,
    { 
      checkpointId,
      checkpointNumber: checkpoint.checkpointNumber,
      position: checkpoint.positionAfter,
      message: `Approved checkpoint #${checkpoint.checkpointNumber} for ${checkpoint.team.teamName} at position ${checkpoint.positionAfter}`
    }
  );

  return checkpoint;
};

const pauseTeamTimer = async (teamId) => {
  return await prisma.team.update({
    where: { id: teamId },
    data: { timerPaused: true },
  });
};

const resumeTeamTimer = async (teamId) => {
  return await prisma.team.update({
    where: { id: teamId },
    data: { timerPaused: false },
  });
};

module.exports = {
  getAllTeams,
  getTeamById,
  getPendingCheckpoints,
  getCheckpointById,
  assignQuestionToCheckpoint,
  markQuestionAnswer,
  getAvailableQuestions,
  getTeamProgress,
  approveCheckpoint,
  pauseTeamTimer,
  resumeTeamTimer,
};

