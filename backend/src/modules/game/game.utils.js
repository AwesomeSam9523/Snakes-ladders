const { GAME_CONFIG } = require('../../config/constants');
const prisma = require('../../config/db');


const isWinningPosition = (position) => {
  return position === GAME_CONFIG.BOARD_SIZE;
};

// Helper function to extract floor number from room string (e.g., "AB1 201" -> 2, "AB1 105" -> 1)
const getFloorFromRoom = (roomNumber) => {
  const match = roomNumber.match(/(\d)\d{2}$/);
  return match ? parseInt(match[1]) : 1;
};

const getRandomRoom = async (currentRoom, teamId = null, roomType = null) => {
  // Get all rooms with their capacities from database
  let rooms = await prisma.room.findMany();
  
  // Determine current floor and target opposite floor
  const currentFloor = getFloorFromRoom(currentRoom);
  const targetFloor = currentFloor === 1 ? 2 : 1;
  
  // Filter rooms by opposite floor
  rooms = rooms.filter(r => r.floor === targetFloor);
  
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
    // If no rooms with capacity, pick least full room on target floor
    if (rooms.length === 0) {
      throw new Error(`No available rooms on floor ${targetFloor}`);
    }
    // Find least full room on target floor
    const leastFullRoom = rooms.reduce((min, room) => {
      const count = roomCountMap[room.roomNumber] || 0;
      const minCount = roomCountMap[min.roomNumber] || 0;
      return count < minCount ? room : min;
    }, rooms[0]);
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
  isWinningPosition,
  getRandomRoom,
  getFloorFromRoom,
  rollDice,
  hasReachedGoal,
};

