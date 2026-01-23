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
        where: {
          status: 'PENDING', // Only load pending checkpoints for performance
        },
        orderBy: { checkpointNumber: 'desc' },
        take: 3, // Limit to last 3 checkpoints per team
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
    select: {
      id: true,
      checkpointNumber: true,
      positionBefore: true,
      positionAfter: true,
      roomNumber: true,
      status: true,
      isSnakePosition: true,
      createdAt: true,
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
        select: {
          id: true,
          status: true,
          participantAnswer: true,
          question: {
            select: {
              id: true,
              text: true,
              type: true,
              isSnakeQuestion: true,
            },
          },
        },
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


// assignQuestionToCheckpoint has been removed - questions are now auto-assigned during dice roll
// See dice.service.js processDiceRoll() for automatic assignment logic


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

  // Calculate points based on snake position and answer correctness
  let pointsChange = 0;
  if (assignment.checkpoint.isSnakePosition) {
    // Snake position: correct = 0, incorrect = -1
    pointsChange = isCorrect ? 0 : -1;
  } else {
    // Normal position: correct = +1, incorrect = 0
    pointsChange = isCorrect ? 1 : 0;
  }

  // Batch all updates in a transaction for speed
  const [updatedAssignment] = await prisma.$transaction([
    // Update question status
    prisma.questionAssignment.update({
      where: { id: assignmentId },
      data: {
        status: isCorrect ? 'CORRECT' : 'INCORRECT',
        answeredAt: new Date(),
      },
    }),
    
    // Update team points, position, and room
    prisma.team.update({
      where: { id: assignment.checkpoint.teamId },
      data: {
        currentPosition: assignment.checkpoint.positionAfter,
        currentRoom: assignment.checkpoint.roomNumber,
        points: { increment: pointsChange },
        canRollDice: true,
      },
    }),
    
    // Approve checkpoint
    prisma.checkpoint.update({
      where: { id: assignment.checkpointId },
      data: { status: 'APPROVED' },
    }),
  ]);

  // Fire and forget: Log the answer marking to audit (don't block response)
  logAdminAction(
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
  ).catch(err => console.error('Audit logging error:', err));

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
// This reveals the pre-assigned question to the team
// NOTE: Dice is NOT unlocked here - it will be unlocked only after question is marked
const approveCheckpoint = async (checkpointId, adminUsername = 'admin') => {
  // Parallel query: Get checkpoint and latest pending checkpoint simultaneously
  const [checkpoint, latestPendingCheckpoint] = await Promise.all([
    prisma.checkpoint.findUnique({
      where: { id: checkpointId },
      include: {
        team: true,
        questionAssign: {
          include: { question: true },
        },
      },
    }),
    prisma.checkpoint.findFirst({
      where: { 
        id: checkpointId // First find the teamId from this checkpoint
      },
      select: { teamId: true }
    }).then(cp => cp ? prisma.checkpoint.findFirst({
      where: { 
        teamId: cp.teamId,
        status: 'PENDING'
      },
      orderBy: { checkpointNumber: 'desc' }
    }) : null)
  ]);

  if (!checkpoint) {
    throw new Error('Checkpoint not found');
  }

  if (!checkpoint.questionAssign) {
    throw new Error('No question assigned to this checkpoint - this should not happen');
  }

  // Validation: Only allow approving the latest pending checkpoint for this team
  if (latestPendingCheckpoint && latestPendingCheckpoint.id !== checkpointId) {
    throw new Error(`Cannot approve checkpoint #${checkpoint.checkpointNumber}. Please approve the latest checkpoint #${latestPendingCheckpoint.checkpointNumber} first, or delete invalid checkpoints.`);
  }

  // Update checkpoint status to APPROVED (reveals question to team)
  const updatedCheckpoint = await prisma.checkpoint.update({
    where: { id: checkpointId },
    data: { status: 'APPROVED' },
    include: {
      team: true,
      questionAssign: {
        include: { question: true },
      },
    },
  });

  // NOTE: Dice roll is NOT unlocked here
  // The flow is: roll dice → question auto-assigned → admin approves (reveals question) → participant answers → admin marks → dice unlocked

  // Fire and forget: Log the checkpoint approval to audit (don't block response)
  logAdminAction(
    adminUsername,
    'admin',
    AUDIT_ACTIONS.CHECKPOINT_APPROVED,
    checkpoint.team.teamName,
    { 
      checkpointId,
      checkpointNumber: checkpoint.checkpointNumber,
      position: checkpoint.positionAfter,
      questionType: checkpoint.questionAssign.question.type,
      message: `Approved checkpoint #${checkpoint.checkpointNumber} for ${checkpoint.team.teamName} - revealed ${checkpoint.questionAssign.question.type} question`
    }
  ).catch(err => console.error('Audit logging error:', err));

  return updatedCheckpoint;
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

const deleteCheckpoint = async (checkpointId, adminUsername = 'admin') => {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: {
      team: true,
      questionAssign: true,
    },
  });

  if (!checkpoint) {
    throw new Error('Checkpoint not found');
  }

  // Only allow deleting PENDING checkpoints
  if (checkpoint.status !== 'PENDING') {
    throw new Error('Can only delete pending checkpoints');
  }

  // Delete the question assignment first (if exists)
  if (checkpoint.questionAssign) {
    await prisma.questionAssignment.delete({
      where: { id: checkpoint.questionAssign.id },
    });
  }

  // Delete the checkpoint
  await prisma.checkpoint.delete({
    where: { id: checkpointId },
  });

  // Log the deletion to audit
  await logAdminAction(
    adminUsername,
    'admin',
    'CHECKPOINT_DELETED',
    checkpoint.team.teamName,
    {
      checkpointId,
      checkpointNumber: checkpoint.checkpointNumber,
      position: checkpoint.positionAfter,
      message: `Deleted checkpoint #${checkpoint.checkpointNumber} for ${checkpoint.team.teamName}`
    }
  );

  return { success: true, message: 'Checkpoint deleted successfully' };
};

module.exports = {
  getAllTeams,
  getTeamById,
  getPendingCheckpoints,
  getCheckpointById,
  // assignQuestionToCheckpoint removed - now automatic in dice roll
  markQuestionAnswer,
  getAvailableQuestions,
  getTeamProgress,
  approveCheckpoint,
  pauseTeamTimer,
  resumeTeamTimer,
  deleteCheckpoint,
};

