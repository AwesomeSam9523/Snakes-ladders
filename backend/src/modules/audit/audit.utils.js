
const formatAuditEntry = (entry) => {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    action: entry.action,
    actor: entry.userId || entry.teamId || 'SYSTEM',
    target: entry.targetId ? `${entry.targetType}:${entry.targetId}` : null,
    details: entry.details,
    formattedTime: new Date(entry.timestamp).toLocaleString(),
  };
};
const getActionDescription = (action, details = {}) => {
  const descriptions = {
    LOGIN: 'User logged in',
    LOGOUT: 'User logged out',
    LOGIN_FAILED: 'Login attempt failed',
    PASSWORD_CHANGED: 'Password was changed',
    
    TEAM_CREATED: `Team "${details.teamName || 'Unknown'}" was created`,
    TEAM_UPDATED: 'Team details were updated',
    TEAM_DISQUALIFIED: 'Team was disqualified',
    TEAM_REINSTATED: 'Team was reinstated',
    TEAM_ROOM_CHANGED: `Team moved to Room ${details.newRoom || 'Unknown'}`,
    
    DICE_ROLLED: `Rolled ${details.diceValue || '?'}, moved from ${details.fromPosition || '?'} to ${details.toPosition || '?'}`,
    CHECKPOINT_REACHED: `Reached checkpoint at position ${details.position || '?'}`,
    CHECKPOINT_APPROVED: 'Checkpoint was approved',
    CHECKPOINT_UNDONE: 'Checkpoint was undone',
    
    QUESTION_ASSIGNED: 'Question was assigned',
    QUESTION_ANSWERED: 'Answer was submitted',
    ANSWER_MARKED_CORRECT: 'Answer marked as correct',
    ANSWER_MARKED_INCORRECT: 'Answer marked as incorrect',
    HINT_REQUESTED: `Hint requested (+${details.penalty || 60}s penalty)`,
    
    TIMER_ADJUSTED: `Timer adjusted by ${details.seconds || 0} seconds`,
    TIMER_SET: `Timer set to ${details.totalSeconds || 0} seconds`,
    QUESTION_CREATED: 'New question was created',
    QUESTION_UPDATED: 'Question was updated',
    QUESTION_DELETED: 'Question was deleted',
    
    GAME_STARTED: 'Game started',
    GAME_PAUSED: 'Game paused',
    GAME_ENDED: 'Game ended',
  };
  
  return descriptions[action] || `Action: ${action}`;
};

// Filter audit logs by criteria
const filterAuditLogs = (logs, filters = {}) => {
  let filtered = [...logs];
  
  if (filters.action) {
    filtered = filtered.filter(log => log.action === filters.action);
  }
  
  if (filters.userId) {
    filtered = filtered.filter(log => log.userId === filters.userId);
  }
  
  if (filters.teamId) {
    filtered = filtered.filter(log => log.teamId === filters.teamId);
  }
  
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);
  }
  
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    filtered = filtered.filter(log => new Date(log.timestamp) <= endDate);
  }
  
  if (filters.targetType) {
    filtered = filtered.filter(log => log.targetType === filters.targetType);
  }
  
  return filtered;
};

// Group audit logs by action type
const groupLogsByAction = (logs) => {
  return logs.reduce((groups, log) => {
    const action = log.action;
    if (!groups[action]) {
      groups[action] = [];
    }
    groups[action].push(log);
    return groups;
  }, {});
};

// Group audit logs by team
const groupLogsByTeam = (logs) => {
  return logs.reduce((groups, log) => {
    const teamId = log.teamId || 'NO_TEAM';
    if (!groups[teamId]) {
      groups[teamId] = [];
    }
    groups[teamId].push(log);
    return groups;
  }, {});
};

// Get audit summary statistics
const getAuditSummary = (logs) => {
  const actionCounts = {};
  const teamCounts = {};
  
  logs.forEach(log => {
    // Count by action
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    
    // Count by team
    if (log.teamId) {
      teamCounts[log.teamId] = (teamCounts[log.teamId] || 0) + 1;
    }
  });
  
  return {
    totalEvents: logs.length,
    actionCounts,
    teamCounts,
    uniqueTeams: Object.keys(teamCounts).length,
    uniqueActions: Object.keys(actionCounts).length,
    firstEvent: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
    lastEvent: logs.length > 0 ? logs[0].timestamp : null,
  };
};

// Extract IP address from request
const extractIpAddress = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';
};

// Extract user agent from request
const extractUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

module.exports = {
  formatAuditEntry,
  getActionDescription,
  filterAuditLogs,
  groupLogsByAction,
  groupLogsByTeam,
  getAuditSummary,
  extractIpAddress,
  extractUserAgent,
};
