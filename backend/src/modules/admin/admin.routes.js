const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { verifyToken } = require('../../middlewares/session.middleware');
const { adminOnly } = require('../../middlewares/role.middleware');

// All routes require admin authentication
router.use(verifyToken);
router.use(adminOnly);

// Team routes
router.get('/teams', adminController.getAllTeams);
router.get('/teams/:teamId', adminController.getTeamById);
router.get('/teams/:teamId/checkpoints', adminController.getTeamCheckpoints);
router.get('/teams/:teamId/progress', adminController.getTeamProgress);
router.post('/teams/:teamId/timer/pause', adminController.pauseTeamTimer);
router.post('/teams/:teamId/timer/resume', adminController.resumeTeamTimer);

// Checkpoint routes
router.get('/checkpoints/pending', adminController.getPendingCheckpoints);
router.post('/checkpoints/:checkpointId/approve', adminController.approveCheckpoint);
// assign-question route removed - questions now auto-assigned during dice roll
router.post('/checkpoints/:checkpointId/mark', adminController.markQuestion);
router.delete('/checkpoints/:checkpointId', adminController.deleteCheckpoint);

// Question routes
router.get('/questions/available', adminController.getAvailableQuestions);

module.exports = router;

