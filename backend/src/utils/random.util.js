const { GAME_CONFIG, ROOMS } = require('../config/constants');
const prisma = require('../config/db');

//Generate a random dice value between 1 and 6
const generateDiceValue = () => {
  return Math.floor(Math.random() * (GAME_CONFIG.DICE_MAX - GAME_CONFIG.DICE_MIN + 1)) + GAME_CONFIG.DICE_MIN;
};

//Get a random room different from the current room (respecting capacity)
const getRandomRoom = async (currentRoom, teamId = null) => {
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
  const availableRooms = ROOMS.filter(room => {
    if (room === currentRoom) return false;
    const count = roomCountMap[room] || 0;
    return count < GAME_CONFIG.TEAMS_PER_ROOM;
  });

  if (availableRooms.length === 0) {
    // If no rooms with capacity, just pick any other room (edge case)
    const otherRooms = ROOMS.filter(room => room !== currentRoom);
    const randomIndex = Math.floor(Math.random() * otherRooms.length);
    return otherRooms[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * availableRooms.length);
  return availableRooms[randomIndex];
};

//Generate a unique team code
const generateTeamCode = () => {
  const prefix = 'TEAM';
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${randomNum}`;
};

//Generate a random ID for any purpose
const generateRandomId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = {
  generateDiceValue,
  getRandomRoom,
  generateTeamCode,
  generateRandomId,
};

