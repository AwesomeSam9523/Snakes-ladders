const prisma = require('../../config/db');

/**
 * Get available questions for a team based on position type
 * Excludes questions already assigned to this team
 */
const getAvailableQuestions = async (teamId, isSnakePosition) => {
  // Get all questions already assigned to this team
  const assignedQuestions = await prisma.questionAssignment.findMany({
    where: { 
      checkpoint: { teamId }
    },
    select: { questionId: true },
  });

  const assignedQuestionIds = assignedQuestions.map(q => q.questionId);

  // Build query filters
  const whereClause = {
    id: { notIn: assignedQuestionIds }, // Exclude already assigned questions
  };

  if (isSnakePosition) {
    // Snake position: Only CODING questions with isSnakeQuestion = true
    whereClause.type = 'CODING';
    whereClause.isSnakeQuestion = true;
  } else {
    // Normal position: Any question type, not snake questions
    whereClause.isSnakeQuestion = false;
  }

  // Get available questions
  const availableQuestions = await prisma.question.findMany({
    where: whereClause,
  });

  return availableQuestions;
};

/**
 * Select a random question for a team
 * Returns question and determines room type needed
 */
const selectRandomQuestion = async (teamId, isSnakePosition) => {
  const availableQuestions = await getAvailableQuestions(teamId, isSnakePosition);

  if (availableQuestions.length === 0) {
    throw new Error(`No available questions for team. Snake position: ${isSnakePosition}`);
  }

  // For normal positions, weight question types
  // 30% CODING, 70% others (NUMERICAL, MCQ, PHYSICAL)
  let selectedQuestion;

  if (!isSnakePosition) {
    const codingQuestions = availableQuestions.filter(q => q.type === 'CODING');
    const otherQuestions = availableQuestions.filter(q => q.type !== 'CODING');

    // 30% chance for coding question
    const shouldSelectCoding = Math.random() < 0.3 && codingQuestions.length > 0;

    if (shouldSelectCoding) {
      // Pick random coding question
      selectedQuestion = codingQuestions[Math.floor(Math.random() * codingQuestions.length)];
    } else if (otherQuestions.length > 0) {
      // Pick random non-coding question
      selectedQuestion = otherQuestions[Math.floor(Math.random() * otherQuestions.length)];
    } else if (codingQuestions.length > 0) {
      // Fallback to coding if no other questions available
      selectedQuestion = codingQuestions[Math.floor(Math.random() * codingQuestions.length)];
    } else {
      throw new Error('No available questions');
    }
  } else {
    // Snake position: Pick random from available snake questions
    selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  }

  // Determine room type based on question type
  const roomType = selectedQuestion.type === 'CODING' ? 'TECH' : 'NON_TECH';

  return {
    question: selectedQuestion,
    roomType,
  };
};

module.exports = {
  getAvailableQuestions,
  selectRandomQuestion,
};
