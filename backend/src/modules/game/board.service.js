const prisma = require('../../config/db');

const createBoardMap = async (name) => {
  return await prisma.boardMap.create({
    data: { name },
  });
};

const getAllBoardMaps = async () => {
  return await prisma.boardMap.findMany({
    where: { isActive: true },
    include: {
      rules: {
        orderBy: { startPos: 'asc' },
      },
      _count: {
        select: { teams: true },
      },
    },
  });
};

const getBoardMapById = async (mapId) => {
  return await prisma.boardMap.findUnique({
    where: { id: mapId },
    include: {
      rules: {
        orderBy: { startPos: 'asc' },
      },
    },
  });
};

const deleteBoardMap = async (mapId) => {
  return await prisma.boardMap.delete({
    where: { id: mapId },
  });
};

const createBoardRule = async (mapId, type, startPos) => {
  return await prisma.boardRule.create({
    data: {
      mapId,
      type,
      startPos,
    },
  });
};

const deleteBoardRule = async (id) => {
  return await prisma.boardRule.delete({
    where: { id },
  });
};

const getRulesByMap = async (mapId) => {
  return await prisma.boardRule.findMany({
    where: { mapId },
    orderBy: { startPos: 'asc' },
  });
};

const getSnakesByMap = async (mapId) => {
  return await prisma.boardRule.findMany({
    where: { 
      mapId,
      type: 'SNAKE',
    },
    orderBy: { startPos: 'asc' },
  });
};

// ==================== TEAM-SPECIFIC SNAKE CHECKS ====================

const checkSnakeForTeam = async (teamId, position) => {
  // Try to get from cache first
  const cached = boardStateCache.get(teamId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const isSnake = cached.data.snakes.includes(position);
    return isSnake ? { startPos: position, type: 'SNAKE' } : null;
  }

  // Fetch team's mapId only
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { mapId: true },
  });

  if (!team || !team.mapId) {
    return null; // No map assigned, no snake
  }

  // Check if position has a snake
  const snake = await prisma.boardRule.findFirst({
    where: {
      mapId: team.mapId,
      type: 'SNAKE',
      startPos: position,
    },
  });

  return snake;
};

// Check any snake at a position (global check)
const checkSnakeAtPosition = async (position) => {
  const snake = await prisma.boardRule.findFirst({
    where: {
      type: 'SNAKE',
      startPos: position,
    },
  });

  return snake;
};

// ==================== TEAM MAP ASSIGNMENT ====================

const assignMapToTeam = async (teamId, mapId) => {
  return await prisma.team.update({
    where: { id: teamId },
    data: { mapId },
  });
};

const getTeamMap = async (teamId) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      map: {
        include: {
          rules: {
            orderBy: { startPos: 'asc' },
          },
        },
      },
    },
  });
  return team?.map || null;
};

// ==================== BOARD STATE ====================

// In-memory cache for board states (cleared on server restart)
const boardStateCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getBoardStateForTeam = async (teamId) => {
  // Check cache first
  const cached = boardStateCache.get(teamId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Optimized query - only fetch what we need
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      mapId: true,
      map: {
        select: {
          id: true,
          name: true,
          rules: {
            where: { type: 'SNAKE' }, // Only fetch snakes
            select: { startPos: true },
            orderBy: { startPos: 'asc' },
          },
        },
      },
    },
  });

  if (!team || !team.map) {
    const defaultState = {
      boardSize: 150,
      mapName: null,
      snakes: [],
    };
    // Cache even empty state to avoid repeated queries
    boardStateCache.set(teamId, { data: defaultState, timestamp: Date.now() });
    return defaultState;
  }

  const boardState = {
    boardSize: 150,
    mapId: team.map.id,
    mapName: team.map.name,
    snakes: team.map.rules.map(rule => rule.startPos),
  };

  // Cache the result
  boardStateCache.set(teamId, { data: boardState, timestamp: Date.now() });

  return boardState;
};

// Legacy function for backward compatibility
const getBoardState = async () => {
  const maps = await getAllBoardMaps();
  return {
    boardSize: 150,
    totalMaps: maps.length,
    maps: maps.map(m => ({
      id: m.id,
      name: m.name,
      teamsCount: m._count.teams,
    })),
  };
};

// Clear cache for a specific team (call when map changes)
const clearBoardCache = (teamId) => {
  if (teamId) {
    boardStateCache.delete(teamId);
  } else {
    boardStateCache.clear(); // Clear all
  }
};

module.exports = {
  // Map management
  createBoardMap,
  getAllBoardMaps,
  getBoardMapById,
  deleteBoardMap,
  
  // Rule management
  createBoardRule,
  deleteBoardRule,
  getRulesByMap,
  getSnakesByMap,
  
  // Team-specific operations
  checkSnakeForTeam,
  checkSnakeAtPosition,
  assignMapToTeam,
  getTeamMap,
  getBoardStateForTeam,
  clearBoardCache,
  
  // Legacy
  getBoardState,
};

