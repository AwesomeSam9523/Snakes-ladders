const prisma = require('../../prisma/client');

// Audit action types
const AUDIT_ACTIONS = {
  // Auth actions
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  
  // Team actions
  TEAM_CREATED: 'TEAM_CREATED',
  TEAM_UPDATED: 'TEAM_UPDATED',
  TEAM_DISQUALIFIED: 'TEAM_DISQUALIFIED',
  TEAM_REINSTATED: 'TEAM_REINSTATED',
  TEAM_ROOM_CHANGED: 'TEAM_ROOM_CHANGED',
  
  // Game actions
  DICE_ROLLED: 'DICE_ROLLED',
  CHECKPOINT_REACHED: 'CHECKPOINT_REACHED',
  CHECKPOINT_APPROVED: 'CHECKPOINT_APPROVED',
  CHECKPOINT_UNDONE: 'CHECKPOINT_UNDONE',
  
  // Question actions
  QUESTION_ASSIGNED: 'QUESTION_ASSIGNED',
  QUESTION_ANSWERED: 'QUESTION_ANSWERED',
  ANSWER_MARKED_CORRECT: 'ANSWER_MARKED_CORRECT',
  ANSWER_MARKED_INCORRECT: 'ANSWER_MARKED_INCORRECT',
  HINT_REQUESTED: 'HINT_REQUESTED',
  
  // Admin actions
  TIMER_ADJUSTED: 'TIMER_ADJUSTED',
  TIMER_SET: 'TIMER_SET',
  QUESTION_CREATED: 'QUESTION_CREATED',
  QUESTION_UPDATED: 'QUESTION_UPDATED',
  QUESTION_DELETED: 'QUESTION_DELETED',
  
  // System actions
  GAME_STARTED: 'GAME_STARTED',
  GAME_PAUSED: 'GAME_PAUSED',
  GAME_ENDED: 'GAME_ENDED',
};

// Log an audit event
const logAudit = async ({
  action,
  userId = null,
  teamId = null,
  targetId = null,
  targetType = null,
  details = {},
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    // For now, just log to console since we don't have an AuditLog table
    // In production, you'd save this to a database table
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      teamId,
      targetId,
      targetType,
      details,
      ipAddress,
      userAgent,
    };
    
    console.log('[AUDIT]', JSON.stringify(auditEntry));
    
    // TODO: Save to database when AuditLog table is added
    // await prisma.auditLog.create({ data: auditEntry });
    
    return auditEntry;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
};

// Log login event
const logLogin = async (userId, role, ipAddress, userAgent, success = true) => {
  return logAudit({
    action: success ? AUDIT_ACTIONS.LOGIN : AUDIT_ACTIONS.LOGIN_FAILED,
    userId,
    details: { role, success },
    ipAddress,
    userAgent,
  });
};

// Log logout event
const logLogout = async (userId, ipAddress) => {
  return logAudit({
    action: AUDIT_ACTIONS.LOGOUT,
    userId,
    ipAddress,
  });
};

// Log dice roll
const logDiceRoll = async (teamId, diceValue, fromPosition, toPosition) => {
  return logAudit({
    action: AUDIT_ACTIONS.DICE_ROLLED,
    teamId,
    details: { diceValue, fromPosition, toPosition },
  });
};

// Log checkpoint event
const logCheckpoint = async (teamId, checkpointId, action, details = {}) => {
  return logAudit({
    action,
    teamId,
    targetId: checkpointId,
    targetType: 'CHECKPOINT',
    details,
  });
};

// Log question event
const logQuestionEvent = async (teamId, questionId, action, details = {}) => {
  return logAudit({
    action,
    teamId,
    targetId: questionId,
    targetType: 'QUESTION',
    details,
  });
};

// Log admin action
const logAdminAction = async (adminId, action, targetId, targetType, details = {}) => {
  return logAudit({
    action,
    userId: adminId,
    targetId,
    targetType,
    details,
  });
};

// Get audit logs for a team
const getTeamAuditLogs = async (teamId, limit = 50) => {
  // TODO: Implement when AuditLog table exists
  console.log(`Fetching audit logs for team: ${teamId}`);
  return [];
};

// Get audit logs for a user
const getUserAuditLogs = async (userId, limit = 50) => {
  // TODO: Implement when AuditLog table exists
  console.log(`Fetching audit logs for user: ${userId}`);
  return [];
};

// Get all audit logs (for superadmin)
const getAllAuditLogs = async (filters = {}, limit = 100) => {
  // TODO: Implement when AuditLog table exists
  console.log('Fetching all audit logs with filters:', filters);
  return [];
};

module.exports = {
  AUDIT_ACTIONS,
  logAudit,
  logLogin,
  logLogout,
  logDiceRoll,
  logCheckpoint,
  logQuestionEvent,
  logAdminAction,
  getTeamAuditLogs,
  getUserAuditLogs,
  getAllAuditLogs,
};
