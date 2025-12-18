const prisma = require('../../prisma/client');


const getAllBoardRules = async () => {
  return await prisma.boardRule.findMany({
    orderBy: { startPos: 'asc' },
  });
};


const getSnakes = async () => {
  return await prisma.boardRule.findMany({
    where: { type: 'SNAKE' },
    orderBy: { startPos: 'asc' },
  });
};

const checkSnake = async (position) => {
  const snake = await prisma.boardRule.findFirst({
    where: {
      type: 'SNAKE',
      startPos: position,
    },
  });
  return snake;
};

const getSnakeEndPosition = async (position) => {
  const snake = await checkSnake(position);
  return snake ? snake.endPos : null;
};


const createBoardRule = async (type, startPos, endPos) => {
  return await prisma.boardRule.create({
    data: {
      type,
      startPos,
      endPos,
    },
  });
};


const deleteBoardRule = async (id) => {
  return await prisma.boardRule.delete({
    where: { id },
  });
};

const getBoardState = async () => {
  const snakes = await getSnakes();
  
  // Create a map of snake positions
  const snakeMap = {};
  snakes.forEach(snake => {
    snakeMap[snake.startPos] = snake.endPos;
  });

  return {
    boardSize: 100,
    snakes: snakeMap,
  };
};

module.exports = {
  getAllBoardRules,
  getSnakes,
  checkSnake,
  getSnakeEndPosition,
  createBoardRule,
  deleteBoardRule,
  getBoardState,
};
