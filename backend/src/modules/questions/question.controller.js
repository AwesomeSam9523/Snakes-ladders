const questionService = require('./question.service');
const { sendSuccess, sendError, sendNotFound, sendBadRequest, sendCreated } = require('../../utils/response.util');

const createQuestion = async (req, res, next) => {
  try {
    const { content, text, difficulty, type, options, correctAnswer, hint } = req.body;

    const questionText = text || content;
    
    if (!questionText) {
      return sendBadRequest(res, 'Question text is required');
    }

    if (!hint || hint.trim() === '') {
      return sendBadRequest(res, 'Hint is required');
    }

    // Validate MCQ has options
    if (type === 'MCQ' && (!options || options.length < 2)) {
      return sendBadRequest(res, 'MCQ questions must have at least 2 options');
    }

    // Validate MCQ correct answer is in options
    if (type === 'MCQ' && correctAnswer && !options.includes(correctAnswer)) {
      return sendBadRequest(res, 'Correct answer must be one of the options');
    }

    // Validate NUMERICAL has correct answer
    if (type === 'NUMERICAL' && !correctAnswer) {
      return sendBadRequest(res, 'Numerical questions must have a correct answer');
    }

    const question = await questionService.createQuestion({
      text: questionText,
      hint,
      difficulty,
      type,
      options: options || [],
      correctAnswer: correctAnswer || null,
    });

    return sendCreated(res, question, 'Question created successfully');
  } catch (error) {
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { content, text, difficulty, type, options, correctAnswer, isActive, hint } = req.body;

    // Validate MCQ has options
    if (type === 'MCQ' && options && options.length < 2) {
      return sendBadRequest(res, 'MCQ questions must have at least 2 options');
    }

    // Validate MCQ correct answer is in options
    if (type === 'MCQ' && correctAnswer && options && !options.includes(correctAnswer)) {
      return sendBadRequest(res, 'Correct answer must be one of the options');
    }

    const question = await questionService.updateQuestion(questionId, {
      content,
      text,
      difficulty,
      type,
      options,
      correctAnswer,
      isActive,
      hint,
    });
    
    return sendSuccess(res, question, 'Question updated successfully');
  } catch (error) {
    if (error.code === 'P2025') {
      return sendNotFound(res, 'Question not found');
    }
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    await questionService.deleteQuestion(questionId);

    return sendSuccess(res, null, 'Question deleted successfully');
  } catch (error) {
    if (error.code === 'P2025') {
      return sendNotFound(res, 'Question not found');
    }
    next(error);
  }
};

const getAllQuestions = async (req, res, next) => {
  try {
    const { difficulty, category, isActive } = req.query;

    const filters = {};
    if (difficulty) filters.difficulty = difficulty;
    if (category) filters.category = category;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const questions = await questionService.getAllQuestions(filters);
    return sendSuccess(res, questions, 'Questions fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getQuestionById = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const question = await questionService.getQuestionById(questionId);

    if (!question) {
      return sendNotFound(res, 'Question not found');
    }

    return sendSuccess(res, question, 'Question fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getRandomQuestion = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { difficulty } = req.query;

    const question = await questionService.getRandomQuestion(teamId, difficulty || null);

    if (!question) {
      return sendNotFound(res, 'No questions available');
    }

    // Return question without correct answer for participant
    const safeQuestion = {
      id: question.id,
      content: question.content,
      options: question.options,
      difficulty: question.difficulty,
      category: question.category,
      points: question.points,
    };

    return sendSuccess(res, safeQuestion, 'Question fetched successfully');
  } catch (error) {
    next(error);
  }
};

const assignQuestionToCheckpoint = async (req, res, next) => {
  try {
    const { checkpointId } = req.params;
    const { questionId } = req.body;

    if (!questionId) {
      return sendBadRequest(res, 'Question ID is required');
    }

    const checkpoint = await questionService.assignQuestionToCheckpoint(checkpointId, questionId);
    return sendSuccess(res, checkpoint, 'Question assigned successfully');
  } catch (error) {
    if (error.code === 'P2025') {
      return sendNotFound(res, 'Checkpoint or question not found');
    }
    next(error);
  }
};

const submitAnswer = async (req, res, next) => {
  try {
    const { checkpointId } = req.params;
    const { answer } = req.body;

    if (!answer) {
      return sendBadRequest(res, 'Answer is required');
    }

    const result = await questionService.submitAnswer(checkpointId, answer);
    return sendSuccess(res, result, result.isCorrect ? 'Correct answer!' : 'Incorrect answer');
  } catch (error) {
    if (error.message === 'Checkpoint not found') {
      return sendNotFound(res, error.message);
    }
    if (error.message === 'No question assigned to this checkpoint') {
      return sendBadRequest(res, error.message);
    }
    next(error);
  }
};

const getQuestionStats = async (req, res, next) => {
  try {
    const stats = await questionService.getQuestionStats();
    return sendSuccess(res, stats, 'Question statistics fetched successfully');
  } catch (error) {
    next(error);
  }
};

const bulkCreateQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return sendBadRequest(res, 'Questions array is required');
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.content || !q.options || !q.correctAnswer) {
        return sendBadRequest(res, `Question at index ${i} is missing required fields`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return sendBadRequest(res, `Question at index ${i} must have at least 2 options`);
      }
      if (!q.options.includes(q.correctAnswer)) {
        return sendBadRequest(res, `Question at index ${i} has invalid correct answer`);
      }
    }

    const result = await questionService.bulkCreateQuestions(questions);
    return sendCreated(res, { count: result.count }, `${result.count} questions created successfully`);
  } catch (error) {
    next(error);
  }
};

const toggleQuestionStatus = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const question = await questionService.toggleQuestionStatus(questionId);

    return sendSuccess(res, question, `Question ${question.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    if (error.message === 'Question not found') {
      return sendNotFound(res, error.message);
    }
    next(error);
  }
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

