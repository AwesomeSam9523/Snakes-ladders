// Mock data for development

export const mockTeamStatus = {
    teamId: "dolly_15716_69573",
    currentPosition: 1,
    currentRoom: null,
    mapId: "map_1",
    canRollDice: true,
    score: 0,
    totalTimeSec: 0,
    timerStartedAt: new Date().toISOString(),
  }
  
  export const mockTeams = Array.from({ length: 50 }, (_, i) => ({
    id: `team_${String(i + 1).padStart(2, "0")}`,
    position: Math.floor(Math.random() * 100) + 1,
  })).sort((a, b) => b.position - a.position)
  
  export const mockRollResponse = {
    diceRoll: {
      id: "roll_123",
      value: 5,
      positionFrom: 1,
      positionTo: 6,
    },
    checkpoint: {
      id: "cp_456",
      roomNumber: 12,
      status: "PENDING",
      isSnakePosition: false,
    },
    team: {
      canRollDice: false,
      currentPosition: 6,
    },
  }
  
  export const mockQuestionResponse = {
    assignmentId: "qa_789",
    question: {
      id: "q_101",
      text: "What is the time complexity of binary search on a sorted array?",
      difficulty: "MEDIUM",
      type: "TEXT",
    },
    isSnakeDodge: false,
  }
  