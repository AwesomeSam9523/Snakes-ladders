const leaderboardService = require('./leaderboard.service');
const { sendSuccess, sendError } = require('../../utils/response.util');

// Get global leaderboard
const getGlobalLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await leaderboardService.getGlobalLeaderboard();
    return sendSuccess(res, leaderboard, 'Global leaderboard fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getTeamRank = async (req, res, next) => {
  try {
    const teamId = req.user?.teamId || req.params.teamId;
    const rank = await leaderboardService.getTeamRank(teamId);
    
    if (!rank) {
      return sendError(res, 'Team not found in leaderboard', 404);
    }
    
    return sendSuccess(res, rank, 'Team rank fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Get top N teams
const getTopTeams = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const topTeams = await leaderboardService.getTopTeams(parseInt(limit));
    return sendSuccess(res, topTeams, 'Top teams fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Get finished teams
const getFinishedTeams = async (req, res, next) => {
  try {
    const finishedTeams = await leaderboardService.getFinishedTeams();
    return sendSuccess(res, finishedTeams, 'Finished teams fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Get leaderboard stats
const getLeaderboardStats = async (req, res, next) => {
  try {
    const stats = await leaderboardService.getLeaderboardStats();
    return sendSuccess(res, stats, 'Leaderboard stats fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Get live leaderboard (for real-time updates)
const getLiveLeaderboard = async (req, res, next) => {
  try {
    const liveData = await leaderboardService.getLiveLeaderboard();
    return sendSuccess(res, liveData, 'Live leaderboard fetched successfully');
  } catch (error) {
    next(error);
  }
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
