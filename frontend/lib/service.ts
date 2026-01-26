"use client";

const routeTypes = {
  participant: "participant",
  admin: "admin",
  superadmin: "superadmin",
};

const handleLogout = () => {
  localStorage.removeItem("userRole")
  localStorage.removeItem("userId")
  localStorage.removeItem("username")
  localStorage.removeItem("token")
  window.location.href = '/login';
}

class ApiService {
  private API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole") as keyof typeof routeTypes;
    const routeType =
      userRole
      && !endpoint.startsWith("/auth")
      && !endpoint.startsWith("/version")
        ? `/${routeTypes[userRole]}`
        : "";
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && {Authorization: `Bearer ${token}`}),
        ...options.headers,
      },
      ...options,
    };

    if (!token && endpoint !== "/auth/login") {
      // If no token and not a login request, redirect to log in
      handleLogout();
      throw new Error("Unauthorized");
    }

    const response = await fetch(
      `${this.API_BASE_URL}${routeType}${endpoint}`,
      config,
    );

    if (response.status === 401 || response.status === 403) {
      handleLogout();
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} at ${endpoint}`);
    }

    return response.json();
  }

  async fetchTeams(): Promise<any> {
    return this.request('/teams')
  }

  async approveCheckpoint(checkpointId: string): Promise<any> {
    return this.request(`/checkpoints/${checkpointId}/approve`, {
      method: 'POST',
    });
  }

  async markAnswer(answerId: string, isCorrect: boolean): Promise<any> {
    return this.request(`/checkpoints/${answerId}/mark`, {
      method: 'POST',
      body: JSON.stringify({ isCorrect }),
    });
  }

  async deleteCheckpoint(checkpointId: string): Promise<any> {
    return this.request(`/checkpoints/${checkpointId}`, {
      method: 'DELETE',
    });
  }

  async pauseTimer(teamId: string): Promise<any> {
    return this.request(`/teams/${teamId}/timer/pause`, {
      method: 'POST',
    });
  }

  async resumeTimer(teamId: string): Promise<any> {
    return this.request(`/teams/${teamId}/timer/resume`, {
      method: 'POST',
    });
  }

  async getParticipantState(): Promise<any> {
    return this.request('/state');
  }

  async getPendingCheckpoints(): Promise<any> {
    return this.request('/checkpoints/pending');
  }

  async getLeaderboard(): Promise<any> {
    return this.request('/leaderboard');
  }

  async useHint(assignmentId: string): Promise<any> {
    return this.request('/hint/use', {
      method: 'POST',
      body: JSON.stringify({ assignmentId }),
    });
  }

  async rollDice(): Promise<any> {
    return this.request('/dice/roll', {
      method: 'POST',
    });
  }

  async submitAnswer(assignmentId: string, answer: string): Promise<any> {
    return this.request('/answer/submit', {
      method: 'POST',
      body: JSON.stringify({ assignmentId, answer }),
    });
  }

  async getBoard(): Promise<any> {
    return this.request('/board');
  }

  async getVersion(): Promise<string> {
    const data = await this.request<{ version: string }>('/version');
    return data.version;
  }
}

export const apiService = new ApiService();