const prisma = require('../../config/db');
const { GAME_CONFIG } = require('../../config/constants');

// Get global leaderboard (all teams)
const getGlobalLeaderboard = async () => {
  const teams = await prisma.team.findMany({
    where: {
      status: { not: 'DISQUALIFIED' },
    },
    select: {
      id: true,
      teamCode: true,
      teamName: true,
      currentPosition: true,
      totalTimeSec: true,
      currentRoom: true,
      members: true,
      user: {
        select: {
          username: true,
        },
      },
      checkpoints: {
        where: { status: 'APPROVED' },
        select: { id: true },
      },
    },
    orderBy: [
      { currentPosition: 'desc' },
      { totalTimeSec: 'asc' },
    ],
  });

  return teams.map((team, index) => ({
    rank: index + 1,
    id: team.id,
    teamId: team.user?.username || team.teamCode,
    teamName: team.teamName,
    currentPosition: team.currentPosition,
    totalTimeSec: team.totalTimeSec,
    currentRoom: team.currentRoom,
    membersCount: team.members.length,
    checkpointsCompleted: team.checkpoints.length,
    progress: Math.round((team.currentPosition / GAME_CONFIG.BOARD_SIZE) * 100),
  }));
};

// Get room leaderboard (teams in specific room)
const getRoomLeaderboard = async (roomNumber) => {
  const teams = await prisma.team.findMany({
    where: {
      currentRoom: roomNumber,
      status: { not: 'DISQUALIFIED' },
    },
    select: {
      id: true,
      teamCode: true,
      teamName: true,
      currentPosition: true,
      totalTimeSec: true,
      members: true,
      user: {
        select: {
          username: true,
        },
      },
      checkpoints: {
        where: { status: 'APPROVED' },
        select: { id: true },
      },
    },
    orderBy: [
      { currentPosition: 'desc' },
      { totalTimeSec: 'asc' },
    ],
  });

  return teams.map((team, index) => ({
    rank: index + 1,
    id: team.id,
    teamId: team.user?.username || team.teamCode,
    teamName: team.teamName,
    currentPosition: team.currentPosition,
    totalTimeSec: team.totalTimeSec,
    membersCount: team.members.length,
    checkpointsCompleted: team.checkpoints.length,
    progress: Math.round((team.currentPosition / GAME_CONFIG.BOARD_SIZE) * 100),
  }));
};

// Get team rank
const getTeamRank = async (teamId) => {
  const leaderboard = await getGlobalLeaderboard();
  const teamIndex = leaderboard.findIndex((t) => t.id === teamId);

  if (teamIndex === -1) {
    return null;
  }

  return {
    rank: teamIndex + 1,
    totalTeams: leaderboard.length,
    ...leaderboard[teamIndex],
  };
};

// Get top N teams
const getTopTeams = async (limit = 10) => {
  const leaderboard = await getGlobalLeaderboard();
  return leaderboard.slice(0, limit);
};

// Get teams that have finished
const getFinishedTeams = async () => {
  const teams = await prisma.team.findMany({
    where: {
      currentPosition: GAME_CONFIG.BOARD_SIZE,
      isDisqualified: false,
    },
    select: {
      id: true,
      teamName: true,
      totalTimeTaken: true,
      roomNumber: true,
      members: true,
      updatedAt: true,
    },
    orderBy: [
      { totalTimeTaken: 'asc' },
    ],
  });

  return teams.map((team, index) => ({
    rank: index + 1,
    id: team.id,
    teamName: team.teamName,
    totalTimeTaken: team.totalTimeTaken,
    roomNumber: team.roomNumber,
    membersCount: team.members.length,
    finishedAt: team.updatedAt,
  }));
};

// Get leaderboard statistics
const getLeaderboardStats = async () => {
  const totalTeams = await prisma.team.count({
    where: { isDisqualified: false },
  });

  const finishedTeams = await prisma.team.count({
    where: {
      currentPosition: GAME_CONFIG.BOARD_SIZE,
      isDisqualified: false,
    },
  });

  const disqualifiedTeams = await prisma.team.count({
    where: { isDisqualified: true },
  });

  const avgPosition = await prisma.team.aggregate({
    where: { isDisqualified: false },
    _avg: { currentPosition: true },
  });

  const avgTime = await prisma.team.aggregate({
    where: { isDisqualified: false },
    _avg: { totalTimeTaken: true },
  });

  // Teams by room
  const teamsByRoom = await prisma.team.groupBy({
    by: ['roomNumber'],
    where: { isDisqualified: false },
    _count: { id: true },
    _avg: { currentPosition: true },
  });

  return {
    totalTeams,
    finishedTeams,
    disqualifiedTeams,
    activeTeams: totalTeams - finishedTeams,
    averagePosition: Math.round(avgPosition._avg.currentPosition || 0),
    averageTimeTaken: Math.round(avgTime._avg.totalTimeTaken || 0),
    completionRate: totalTeams > 0 ? Math.round((finishedTeams / totalTeams) * 100) : 0,
    teamsByRoom: teamsByRoom.map((r) => ({
      roomNumber: r.roomNumber,
      teamCount: r._count.id,
      avgPosition: Math.round(r._avg.currentPosition || 0),
    })),
  };
};

// Get live leaderboard updates (for real-time)
const getLiveLeaderboard = async (lastUpdateTime = null) => {
  const where = {
    isDisqualified: false,
  };

  if (lastUpdateTime) {
    where.updatedAt = { gt: new Date(lastUpdateTime) };
  }

  const teams = await prisma.team.findMany({
    where,
    select: {
      id: true,
      teamName: true,
      currentPosition: true,
      totalTimeTaken: true,
      roomNumber: true,
      updatedAt: true,
    },
    orderBy: [
      { currentPosition: 'desc' },
      { totalTimeTaken: 'asc' },
    ],
  });

  return {
    teams,
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  getGlobalLeaderboard,
  getRoomLeaderboard,
  getTeamRank,
  getTopTeams,
  getFinishedTeams,
  getLeaderboardStats,
  getLiveLeaderboard,
};
