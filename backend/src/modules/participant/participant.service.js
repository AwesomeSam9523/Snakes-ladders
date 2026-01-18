const prisma = require('../../config/db');
const { getBoardStateForTeam } = require('../game/board.service');


const getDashboard = async (teamId) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: true,
      checkpoints: {
        include: {
          questionAssign: {
            include: {
              question: {
                select: {
                  id: true,
                  text: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: { checkpointNumber: 'desc' },
        take: 5,
      },
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  const boardState = await getBoardStateForTeam(teamId);

  return {
    team: {
      id: team.id,
      teamCode: team.teamCode,
      teamName: team.teamName,
      currentPosition: team.currentPosition,
      currentRoom: team.currentRoom,
      totalTimeSec: team.totalTimeSec,
      status: team.status,
      canRollDice: team.canRollDice,
      members: team.members,
    },
    recentCheckpoints: team.checkpoints,
    boardState,
  };
};


const getTeamState = async (teamId) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      teamCode: true,
      teamName: true,
      currentPosition: true,
      currentRoom: true,
      totalTimeSec: true,
      status: true,
      canRollDice: true,
      timerPaused: true,
    },
  });

  return team;
};

const getCheckpoints = async (teamId) => {
  return await prisma.checkpoint.findMany({
    where: { teamId },
    include: {
      questionAssign: {
        include: {
          question: {
            select: {
              id: true,
              text: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: { checkpointNumber: 'asc' },
  });
};


const getBoard = async (teamId) => {
  return await getBoardStateForTeam(teamId);
};

// Get current checkpoint (pending approval OR approved but waiting for question/answer)
const getPendingCheckpoint = async (teamId) => {
  // First check if there's an unanswered question assignment
  const checkpointWithQuestion = await prisma.checkpoint.findFirst({
    where: {
      teamId,
      questionAssign: {
        status: 'PENDING', // Question assigned but not answered
      },
    },
    include: {
      questionAssign: {
        include: {
          question: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (checkpointWithQuestion) {
    // Map question text to content for frontend
    if (checkpointWithQuestion.questionAssign?.question) {
      checkpointWithQuestion.questionAssign.question.content = checkpointWithQuestion.questionAssign.question.text;
    }
    return checkpointWithQuestion;
  }

  // Then check for approved checkpoint without question (waiting for admin to assign)
  const approvedWithoutQuestion = await prisma.checkpoint.findFirst({
    where: {
      teamId,
      status: 'APPROVED',
      questionAssign: null,
    },
    include: {
      questionAssign: {
        include: {
          question: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (approvedWithoutQuestion) {
    return approvedWithoutQuestion;
  }

  // Finally check for pending checkpoint (waiting for admin approval)
  const pendingCheckpoint = await prisma.checkpoint.findFirst({
    where: {
      teamId,
      status: 'PENDING',
    },
    include: {
      questionAssign: {
        include: {
          question: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return pendingCheckpoint;
};

 //Check if team can roll dice

const canRollDice = async (teamId) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      canRollDice: true,
      status: true,
    },
  });

  if (!team) {
    return { canRoll: false, reason: 'Team not found' };
  }

  if (team.status === 'COMPLETED') {
    return { canRoll: false, reason: 'Team has completed the game' };
  }

  if (team.status === 'DISQUALIFIED') {
    return { canRoll: false, reason: 'Team is disqualified' };
  }

  if (!team.canRollDice) {
    return { canRoll: false, reason: 'Pending checkpoint approval' };
  }

  return { canRoll: true, reason: null };
};

// Submit answer for a question assignment
const submitAnswer = async (teamId, assignmentId, answer) => {
  // Get the question assignment with question details
  const assignment = await prisma.questionAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      question: true,
      checkpoint: true,
    },
  });

  if (!assignment) {
    throw new Error('Question assignment not found');
  }

  // Verify the assignment belongs to this team
  if (assignment.checkpoint.teamId !== teamId) {
    throw new Error('This question assignment does not belong to your team');
  }

  // Check if answer already submitted
  if (assignment.participantAnswer) {
    throw new Error('Answer already submitted. You cannot re-submit.');
  }

  const question = assignment.question;
  let isAutoMarked = false;
  let isCorrect = false;
  let newStatus = 'PENDING'; // Default - waiting for admin to mark

  // Auto-check for NUMERICAL and MCQ types
  if (question.type === 'NUMERICAL' || question.type === 'MCQ') {
    isAutoMarked = true;
    
    // Normalize answers for comparison
    const submittedAnswer = answer.trim().toLowerCase();
    const correctAnswer = question.correctAnswer?.trim().toLowerCase();
    
    isCorrect = submittedAnswer === correctAnswer;
    newStatus = isCorrect ? 'CORRECT' : 'INCORRECT';
  }

  // Update the question assignment with the answer
  const updatedAssignment = await prisma.questionAssignment.update({
    where: { id: assignmentId },
    data: {
      participantAnswer: answer,
      submittedAt: new Date(),
      status: newStatus,
    },
    include: {
      question: true,
      checkpoint: true,
    },
  });

  // Get checkpoint to check if it's a snake position
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: assignment.checkpointId },
    select: { isSnakePosition: true, teamId: true },
  });

  // Calculate points based on snake position and answer correctness
  let pointsChange = 0;
  if (isAutoMarked) {
    if (checkpoint.isSnakePosition) {
      // Snake position: correct = 0, incorrect = -1
      pointsChange = isCorrect ? 0 : -1;
    } else {
      // Normal position: correct = +1, incorrect = 0
      pointsChange = isCorrect ? 1 : 0;
    }

    // Update team points
    await prisma.team.update({
      where: { id: checkpoint.teamId },
      data: { 
        points: { increment: pointsChange },
      },
    });
  }

  // Approve the checkpoint so team can move on
  await prisma.checkpoint.update({
    where: { id: assignment.checkpointId },
    data: { status: 'APPROVED' },
  });

  // Always unlock dice after answer submission, regardless of correctness
  await prisma.team.update({
    where: { id: teamId },
    data: { canRollDice: true },
  });

  return {
    assignment: updatedAssignment,
    autoMarked: isAutoMarked,
    isCorrect: isAutoMarked ? isCorrect : null,
    message: 'Answer submitted successfully.',
  };
};

// Use hint - adds 60 second penalty
const useHint = async (teamId, assignmentId) => {
  // Get the question assignment to verify it belongs to this team
  const assignment = await prisma.questionAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      checkpoint: true,
      question: {
        select: {
          hint: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new Error('Question assignment not found');
  }

  // Verify the assignment belongs to this team
  if (assignment.checkpoint.teamId !== teamId) {
    throw new Error('This question assignment does not belong to your team');
  }

  // Add 60 seconds penalty to team's total time
  const team = await prisma.team.update({
    where: { id: teamId },
    data: {
      totalTimeSec: {
        increment: 60,
      },
    },
  });

  return {
    hint: assignment.question.hint,
    penalty: 60,
    newTotalTime: team.totalTimeSec,
    message: '+60 seconds penalty added',
  };
};

// Sync timer with database - increments timer by elapsed seconds since last sync
const syncTimer = async (teamId, elapsedSeconds) => {
  // Get team status first
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { totalTimeSec: true, status: true, timerPaused: true },
  });
  
  // If team not found, return null
  if (!team) {
    return null;
  }
  
  // Don't increment timer if game is completed or timer is paused
  if (team.status === 'COMPLETED' || team.timerPaused) {
    return { totalTimeSec: team.totalTimeSec, status: team.status, timerPaused: team.timerPaused };
  }
  
  if (elapsedSeconds <= 0) {
    return { totalTimeSec: team.totalTimeSec, status: team.status, timerPaused: team.timerPaused };
  }

  const updatedTeam = await prisma.team.update({
    where: { id: teamId },
    data: {
      totalTimeSec: {
        increment: elapsedSeconds,
      },
    },
    select: {
      totalTimeSec: true,
      status: true,
      timerPaused: true,
    },
  });

  return { totalTimeSec: updatedTeam.totalTimeSec, status: updatedTeam.status, timerPaused: updatedTeam.timerPaused };
};

module.exports = {
  getDashboard,
  getTeamState,
  getCheckpoints,
  getPendingCheckpoint,
  getBoard,
  canRollDice,
  submitAnswer,
  useHint,
  syncTimer,
};

