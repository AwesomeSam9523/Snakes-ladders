const express = require('express');
const router = express.Router();
const participantController = require('./participant.controller');
const { verifyToken } = require('../../middlewares/session.middleware');
const { participantOnly } = require('../../middlewares/role.middleware');
const { checkDiceLock } = require('../../middlewares/lock.middleware');
const { cacheMiddleware, CACHE_KEYS } = require('../../utils/cache.util');

// All routes require authentication and participant role
router.use(verifyToken);
router.use(participantOnly);

// Dashboard
router.get('/dashboard', participantController.getDashboard);

// Team state
router.get('/state', participantController.getTeamState);

// Dice roll
router.post('/dice/roll', checkDiceLock, participantController.rollDice);
router.get('/dice/can-roll', participantController.checkCanRollDice);

// Checkpoints
router.get('/checkpoints', participantController.getCheckpoints);
router.get('/checkpoints/pending', participantController.getPendingCheckpoint);

// Submit answer
router.post('/answer/submit', participantController.submitAnswer);

// Use hint (adds 60 second penalty)
router.post('/hint/use', participantController.useHint);

// Sync timer with database
router.post('/timer/sync', participantController.syncTimer);

// Board
router.get('/board', participantController.getBoard);

// Leaderboard (cached for 8 seconds)
router.get('/leaderboard', cacheMiddleware(CACHE_KEYS.LEADERBOARD, 8), participantController.getLeaderboardData);

module.exports = router;

