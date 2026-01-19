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

const getRandomRoom = async (currentRoom, teamId = null, roomType = null) => {
  // Get all rooms with their capacities from database
  let rooms = await prisma.room.findMany();
  
  // Filter by room type if specified (TECH or NON_TECH)
  if (roomType) {
    rooms = rooms.filter(r => r.roomType === roomType);
  }
  
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

  // Find available rooms (ALWAYS exclude current room, check capacity)
  const availableRooms = rooms.filter(roomData => {
    if (roomData.roomNumber === currentRoom) return false; // Never same room
    const count = roomCountMap[roomData.roomNumber] || 0;
    return count < roomData.capacity;
  });

  if (availableRooms.length === 0) {
    // If no rooms with capacity, pick least full room (excluding current)
    const otherRooms = rooms.filter(roomData => roomData.roomNumber !== currentRoom);
    if (otherRooms.length === 0) {
      throw new Error('No available rooms');
    }
    // Find least full room
    const leastFullRoom = otherRooms.reduce((min, room) => {
      const count = roomCountMap[room.roomNumber] || 0;
      const minCount = roomCountMap[min.roomNumber] || 0;
      return count < minCount ? room : min;
    }, otherRooms[0]);
    return leastFullRoom.roomNumber;
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

