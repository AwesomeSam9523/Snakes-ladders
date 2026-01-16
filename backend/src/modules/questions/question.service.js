const prisma = require('../../config/db');
const { CHECKPOINT_STATUS } = require('../../config/constants');

// Valid question types
const validQuestionTypes = ['CODING', 'NUMERICAL', 'MCQ', 'PHYSICAL'];

const createQuestion = async (questionData) => {
  const { content, text, isSnakeQuestion, type, options, correctAnswer, hint } = questionData;

  // Use text or content (frontend sends content)
  const questionText = text || content;
  
  // Validate question type
  const questionType = validQuestionTypes.includes(type) ? type : 'CODING';

  return prisma.question.create({
    data: {
      text: questionText,
      hint: hint || '',
      isSnakeQuestion: isSnakeQuestion === true || isSnakeQuestion === 'true',
      type: questionType,
      options: options || [],
      correctAnswer: correctAnswer || null,
      isActive: true,
    },
  });
};

const updateQuestion = async (questionId, questionData) => {
  const { content, text, isSnakeQuestion, type, options, correctAnswer, isActive, hint } = questionData;
  
  const updateData = {};
  
  if (text || content) {
    updateData.text = text || content;
  }
  
  if (hint !== undefined) {
    updateData.hint = hint;
  }
  
  if (isSnakeQuestion !== undefined) {
    updateData.isSnakeQuestion = isSnakeQuestion === true || isSnakeQuestion === 'true';
  }
  
  if (type && validQuestionTypes.includes(type)) {
    updateData.type = type;
  }
  
  if (options !== undefined) {
    updateData.options = options;
  }
  
  if (correctAnswer !== undefined) {
    updateData.correctAnswer = correctAnswer;
  }
  
  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }

  return prisma.question.update({
    where: { id: questionId },
    data: updateData,
  });
};

const deleteQuestion = async (questionId) => {
  // First delete all question assignments for this question
  await prisma.questionAssignment.deleteMany({
    where: { questionId: questionId },
  });
  
  // Then delete the question
  return prisma.question.delete({
    where: { id: questionId },
  });
};

const getAllQuestions = async (filters = {}) => {
  const where = {};

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return questions.map(q => ({
    ...q,
    content: q.text, // Frontend expects 'content'
  }));
};

const getQuestionById = async (questionId) => {
  return prisma.question.findUnique({
    where: { id: questionId },
  });
};

const getRandomQuestion = async (teamId, isSnakeQuestion = null) => {
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

  if (isSnakeQuestion !== null && isSnakeQuestion !== undefined) {
    where.isSnakeQuestion = isSnakeQuestion === true || isSnakeQuestion === 'true';
  }

  // Get count of available questions
  const count = await prisma.question.count({ where });

  if (count === 0) {
    // If no unused questions, allow any question
    delete where.id;
    const totalCount = await prisma.question.count({ 
      where: { isActive: true, isSnakeQuestion: isSnakeQuestion !== null ? where.isSnakeQuestion : undefined } 
    });
    
    if (totalCount === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * totalCount);
    const questions = await prisma.question.findMany({
      where: { isActive: true, isSnakeQuestion: isSnakeQuestion !== null ? where.isSnakeQuestion : undefined },
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

  const byCategory = await prisma.question.groupBy({
    by: ['category'],
    _count: { id: true },
  });

  return {
    total: stats._count.id,
    totalUsed: stats._sum.timesUsed || 0,
    totalCorrect: stats._sum.timesCorrect || 0,
    averageUsage: stats._avg.timesUsed || 0,
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
};

