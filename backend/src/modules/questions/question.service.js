const prisma = require('../../prisma/client');
const { CHECKPOINT_STATUS } = require('../../config/constants');

// Map difficulty string to number
const difficultyMap = {
  'EASY': 1,
  'MEDIUM': 2,
  'HARD': 3,
  'easy': 1,
  'medium': 2,
  'hard': 3,
};

const createQuestion = async (questionData) => {
  const { content, text, difficulty, type } = questionData;

  // Use text or content (frontend sends content)
  const questionText = text || content;
  
  // Convert difficulty string to number
  const difficultyLevel = typeof difficulty === 'number' 
    ? difficulty 
    : (difficultyMap[difficulty] || 2);

  return prisma.question.create({
    data: {
      text: questionText,
      difficulty: difficultyLevel,
      type: type || 'NORMAL',
      isActive: true,
    },
  });
};

const updateQuestion = async (questionId, questionData) => {
  return prisma.question.update({
    where: { id: questionId },
    data: questionData,
  });
};

const deleteQuestion = async (questionId) => {
  return prisma.question.delete({
    where: { id: questionId },
  });
};

const getAllQuestions = async (filters = {}) => {
  const where = {};

  if (filters.difficulty) {
    where.difficulty = filters.difficulty;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Map difficulty number back to string for frontend
  const difficultyLabels = { 1: 'easy', 2: 'medium', 3: 'hard' };
  
  return questions.map(q => ({
    ...q,
    content: q.text, // Frontend expects 'content'
    difficultyLabel: difficultyLabels[q.difficulty] || 'medium',
  }));
};

const getQuestionById = async (questionId) => {
  return prisma.question.findUnique({
    where: { id: questionId },
  });
};

const getRandomQuestion = async (teamId, difficulty = null) => {
  // Get questions already answered by this team recently
  const recentCheckpoints = await prisma.checkpoint.findMany({
    where: {
      teamId,
      questionId: { not: null },
      createdAt: {
        gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
      },
    },
    select: { questionId: true },
  });

  const usedQuestionIds = recentCheckpoints
    .map((c) => c.questionId)
    .filter(Boolean);

  const where = {
    isActive: true,
    id: { notIn: usedQuestionIds },
  };

  if (difficulty) {
    where.difficulty = difficulty;
  }

  // Get count of available questions
  const count = await prisma.question.count({ where });

  if (count === 0) {
    // If no unused questions, allow any question
    delete where.id;
    const totalCount = await prisma.question.count({ 
      where: { isActive: true, difficulty: difficulty || undefined } 
    });
    
    if (totalCount === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * totalCount);
    const questions = await prisma.question.findMany({
      where: { isActive: true, difficulty: difficulty || undefined },
      skip: randomIndex,
      take: 1,
    });

    return questions[0] || null;
  }

  // Get random question
  const randomIndex = Math.floor(Math.random() * count);
  const questions = await prisma.question.findMany({
    where,
    skip: randomIndex,
    take: 1,
  });

  return questions[0] || null;
};

const assignQuestionToCheckpoint = async (checkpointId, questionId) => {
  return prisma.checkpoint.update({
    where: { id: checkpointId },
    data: { 
      questionId,
      status: CHECKPOINT_STATUS.QUESTION_ASSIGNED,
    },
    include: {
      question: true,
    },
  });
};

const submitAnswer = async (checkpointId, answer) => {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: { question: true },
  });

  if (!checkpoint) {
    throw new Error('Checkpoint not found');
  }

  if (!checkpoint.question) {
    throw new Error('No question assigned to this checkpoint');
  }

  const isCorrect = checkpoint.question.correctAnswer === answer;

  // Update checkpoint with answer result
  const updatedCheckpoint = await prisma.checkpoint.update({
    where: { id: checkpointId },
    data: {
      answerSubmitted: answer,
      isCorrect,
      status: CHECKPOINT_STATUS.APPROVED, // Question answered = approved
    },
    include: {
      question: true,
      team: true,
    },
  });

  // Update question usage stats
  await prisma.question.update({
    where: { id: checkpoint.questionId },
    data: {
      timesUsed: { increment: 1 },
      timesCorrect: isCorrect ? { increment: 1 } : undefined,
    },
  });

  return {
    checkpoint: updatedCheckpoint,
    isCorrect,
    correctAnswer: isCorrect ? null : checkpoint.question.correctAnswer,
    points: isCorrect ? checkpoint.question.points : 0,
  };
};

const getQuestionStats = async () => {
  const stats = await prisma.question.aggregate({
    _count: { id: true },
    _sum: { timesUsed: true, timesCorrect: true },
    _avg: { timesUsed: true },
  });

  const byDifficulty = await prisma.question.groupBy({
    by: ['difficulty'],
    _count: { id: true },
  });

  const byCategory = await prisma.question.groupBy({
    by: ['category'],
    _count: { id: true },
  });

  return {
    total: stats._count.id,
    totalUsed: stats._sum.timesUsed || 0,
    totalCorrect: stats._sum.timesCorrect || 0,
    averageUsage: stats._avg.timesUsed || 0,
    byDifficulty: byDifficulty.reduce((acc, item) => {
      acc[item.difficulty] = item._count.id;
      return acc;
    }, {}),
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {}),
  };
};

const bulkCreateQuestions = async (questions) => {
  return prisma.question.createMany({
    data: questions.map((q) => ({
      content: q.content,
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty || 'MEDIUM',
      category: q.category || 'GENERAL',
      points: q.points || 10,
    })),
  });
};

const toggleQuestionStatus = async (questionId) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    throw new Error('Question not found');
  }

  return prisma.question.update({
    where: { id: questionId },
    data: { isActive: !question.isActive },
  });
};

const getQuestionForPosition = async (position, teamId) => {
  // Determine difficulty based on position
  let difficulty;
  if (position <= 33) {
    difficulty = 'EASY';
  } else if (position <= 66) {
    difficulty = 'MEDIUM';
  } else {
    difficulty = 'HARD';
  }

  return getRandomQuestion(teamId, difficulty);
};

module.exports = {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAllQuestions,
  getQuestionById,
  getRandomQuestion,
  assignQuestionToCheckpoint,
  submitAnswer,
  getQuestionStats,
  bulkCreateQuestions,
  toggleQuestionStatus,
  getQuestionForPosition,
};

