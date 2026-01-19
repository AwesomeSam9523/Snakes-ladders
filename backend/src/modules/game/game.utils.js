const { GAME_CONFIG, ROOMS } = require('../../config/constants');
const prisma = require('../../config/db');

const calculateNewPosition = (currentPosition, diceValue) => {
  const newPosition = currentPosition + diceValue;
  
  // Cannot exceed board size
  if (newPosition > GAME_CONFIG.BOARD_SIZE) {
    return currentPosition; // Stay at current position if would exceed 150
  }
  
  return newPosition;
};


const isWinningPosition = (position) => {
  return position === GAME_CONFIG.BOARD_SIZE;
};

const getRandomRoom = async (currentRoom, teamId = null) => {
  // Get all rooms with their capacities from database
  const rooms = await prisma.room.findMany();
  
  // Get team counts per room
  const roomCounts = await prisma.team.groupBy({
    by: ['currentRoom'],
    _count: { id: true },
    where: {
      status: 'ACTIVE',
      id: teamId ? { not: teamId } : undefined, // Exclude current team from count
    },
  });

  // Create a map of room -> count
  const roomCountMap = {};
  roomCounts.forEach(rc => {
    roomCountMap[rc.currentRoom] = rc._count.id;
  });

  // Find available rooms (not current room and has capacity)
  const availableRooms = rooms.filter(roomData => {
    if (roomData.roomNumber === currentRoom) return false;
    const count = roomCountMap[roomData.roomNumber] || 0;
    return count < roomData.capacity;
  });

  if (availableRooms.length === 0) {
    // If no rooms with capacity, just pick any other room (edge case)
    const otherRooms = rooms.filter(roomData => roomData.roomNumber !== currentRoom);
    const randomIndex = Math.floor(Math.random() * otherRooms.length);
    return otherRooms[randomIndex].roomNumber;
  }

  const randomIndex = Math.floor(Math.random() * availableRooms.length);
  return availableRooms[randomIndex].roomNumber;
};

const rollDice = () => {
  return Math.floor(Math.random() * GAME_CONFIG.DICE_MAX) + GAME_CONFIG.DICE_MIN;
};

const hasReachedGoal = (position) => {
  return position >= GAME_CONFIG.BOARD_SIZE;
};

module.exports = {
  calculateNewPosition,
  isWinningPosition,
  getRandomRoom,
  rollDice,
  hasReachedGoal,
};

