"use client"

import {useEffect, useState} from "react"
import {useRouter} from "next/navigation"
import {Navbar} from "@/components/navbar"
import {apiService} from "@/lib/service";

interface Checkpoint {
  id: string
  checkpointNumber: number
  positionBefore?: number
  positionAfter?: number
  position?: number
  roomNumber?: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  isSnakePosition?: boolean
  questionAssign?: {
    id: string
    questionId: string
    status: "PENDING" | "CORRECT" | "INCORRECT"
    participantAnswer?: string
    submittedAt?: string
    question?: {
      id: string
      content: string
      type?: "CODING" | "NUMERICAL" | "MCQ" | "PHYSICAL"
      options?: string[]
      correctAnswer?: string
    }
  } | null
}

interface Team {
  id: string
  teamCode: string
  teamName: string
  teamId?: string  // User's username like "TEAM001"
  members: Array<{ name: string }>
  currentPosition: number
  currentRoom: string
  status: string
  totalTimeSec: number
  timerPaused?: boolean
  checkpoints: Checkpoint[]
}

interface Question {
  id: string
  content: string
  type?: string
  questionNumber?: string
  isSnakeQuestion?: boolean
}

export default function AdminDashboard() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  // questions state removed - no longer needed for manual assignment
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  // showQuestionModal removed - no longer needed
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null)
  // selectedQuestion removed - no longer needed
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  // Fetch teams from backend
  const fetchTeams = async () => {
    try {
      const data = await apiService.fetchTeams();
      if (data.data) {
        setTeams(data.data.map((t: any) => ({
          ...t,
          teamId: t.user?.username || t.teamCode,
        })))
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoading(false)
    }
  }

  // fetchQuestions removed - no longer needed for automatic assignment

  useEffect(() => {
    const userRole = localStorage.getItem("userRole")
    if (userRole !== "admin") {
      router.push("/login")
    } else {
      fetchTeams()
      // fetchQuestions removed - questions auto-assigned now

      // Auto-refresh teams every 15 seconds to see position updates
      const interval = setInterval(fetchTeams, 15000)
      return () => clearInterval(interval)
    }
  }, [router])

  // Approve checkpoint via API
  const handleApproveCheckpoint = async (checkpointId: string) => {
    try {
      await apiService.approveCheckpoint(checkpointId);
      alert('Checkpoint approved successfully!');
      await apiService.fetchTeams();
    } catch (error) {
      console.error("Error approving checkpoint:", error)
      alert("Failed to approve checkpoint")
    }
  }

  // handleAssignQuestion removed - questions are now auto-assigned during dice roll

  // Mark answer as correct or incorrect via API
  const handleMarkAnswer = async (checkpointId: string, isCorrect: boolean) => {
    try {
      await apiService.markAnswer(checkpointId, isCorrect);
      alert(`Answer marked as ${isCorrect ? 'correct' : 'incorrect'}!`)
      await apiService.fetchTeams();
    } catch (error) {
      console.error("Error marking answer:", error)
      alert("Failed to mark answer")
    }
  }

  // Delete checkpoint
  const handleDeleteCheckpoint = async (checkpointId: string, checkpointNumber: number) => {
    if (!confirm(`Are you sure you want to delete Checkpoint #${checkpointNumber}? This action cannot be undone.`)) {
      return
    }

    try {
      await apiService.deleteCheckpoint(checkpointId);
      await apiService.fetchTeams();
      alert("Checkpoint deleted successfully!")
    } catch (error) {
      console.error("Error deleting checkpoint:", error)
      alert("Failed to delete checkpoint")
    }
  }

  // Pause team timer
  const handlePauseTimer = async (teamId: string) => {
    try {
      await apiService.pauseTimer(teamId);
      await apiService.fetchTeams();
      alert("Timer paused successfully!")
    } catch (error) {
      console.error("Error pausing timer:", error)
      alert("Failed to pause timer")
    }
  }

  // Resume team timer
  const handleResumeTimer = async (teamId: string) => {
    try {
      await apiService.resumeTimer(teamId);
      alert("Timer resumed successfully!")
    } catch (error) {
      console.error("Error resuming timer:", error)
      alert("Failed to resume timer")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar role="admin"/>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600">Loading teams...</p>
        </div>
      </div>
    )
  }

  const filteredTeams = teams.filter(
    (team) =>
      (team.teamId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.teamCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.teamName || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white">
      <Navbar role="admin"/>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Team Management</h2>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Team Name or Code..."
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
          />
        </div>

        {/* Teams List */}
        <div className="space-y-4">
          {filteredTeams.length === 0 ? (
            <p className="text-gray-500">No teams found in your room.</p>
          ) : (
            filteredTeams.map((team) => (
              <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 uppercase">Team ID</p>
                    <p className="font-bold text-gray-900">{team.teamId || team.teamCode || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase">Team Name</p>
                    <p className="font-bold text-gray-900">{team.teamName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase">Position</p>
                    <p className="font-bold text-gray-900">{team.currentPosition}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase">Room</p>
                    <p className="font-bold text-gray-900">{team.currentRoom}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase">Status</p>
                    <p className="font-bold text-gray-900 capitalize">{team.status}</p>
                  </div>
                </div>

                {/* Members */}
                <div className="mb-4">
                  <p className="text-xs text-gray-600 uppercase mb-1">Members</p>
                  <p className="text-sm text-gray-800">
                    {team.members.map((m) => m.name).join(", ") || "No members"}
                  </p>
                </div>

                {/* Checkpoints */}
                <div className="mb-4 bg-gray-50 p-3 rounded">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Checkpoints</p>
                  <div className="space-y-2">
                    {team.checkpoints.length > 0 ? (
                      team.checkpoints.map((checkpoint) => (
                        <div
                          key={checkpoint.id}
                          className="bg-white p-3 rounded border border-gray-200"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Checkpoint #{checkpoint.checkpointNumber} (Position {checkpoint.positionAfter || checkpoint.position})
                              {checkpoint.isSnakePosition && (
                                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                  🐍 Snake
                                </span>
                              )}
                            </span>

                            {/* Step 1: Checkpoint Approval Status */}
                            {checkpoint.status === "PENDING" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveCheckpoint(checkpoint.id)}
                                  className="px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors font-medium"
                                >
                                  Approve Checkpoint
                                </button>
                                <button
                                  onClick={() => handleDeleteCheckpoint(checkpoint.id, checkpoint.checkpointNumber)}
                                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
                                  title="Delete this checkpoint"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            ) : checkpoint.status === "APPROVED" ? (
                              <span className="text-xs text-green-600 font-medium">✓ Checkpoint Approved</span>
                            ) : (
                              <span className="text-xs text-red-600 font-medium">✗ Rejected</span>
                            )}
                          </div>

                          {/* Step 2: Show Pre-assigned Question */}
                          {checkpoint.questionAssign && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="mb-2">
                                <p className="text-xs text-gray-600 uppercase mb-1">Auto-Assigned Question</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                                    {checkpoint.questionAssign.question?.type || 'N/A'}
                                  </span>
                                  <p
                                    className="text-xs text-gray-700">{checkpoint.questionAssign.question?.content || 'Question content unavailable'}</p>
                                </div>
                              </div>

                              {/* Step 3: Mark Answer (only show if checkpoint is approved and question assigned) */}
                              {checkpoint.status === "APPROVED" && checkpoint.questionAssign.status === "PENDING" ? (
                                <div className="flex flex-col gap-2 mt-2">
                                  {!checkpoint.questionAssign.participantAnswer && (
                                    <p className="text-xs text-amber-600">⏳ Waiting for participant to submit
                                      answer...</p>
                                  )}
                                  {checkpoint.questionAssign.participantAnswer && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleMarkAnswer(checkpoint.id, true)}
                                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium"
                                      >
                                        ✓ Correct
                                      </button>
                                      <button
                                        onClick={() => handleMarkAnswer(checkpoint.id, false)}
                                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium"
                                      >
                                        ✗ Incorrect
                                      </button>
                                    </div>
                                  )}

                                  {/* Timer controls for CODING/PHYSICAL questions */}
                                  {(checkpoint.questionAssign.question?.type === "CODING" || checkpoint.questionAssign.question?.type === "PHYSICAL") && (
                                    <div className="flex gap-2 mt-1">
                                      {team.timerPaused ? (
                                        <button
                                          onClick={() => handleResumeTimer(team.id)}
                                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium"
                                        >
                                          ▶️ Resume Timer
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handlePauseTimer(team.id)}
                                          className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors font-medium"
                                        >
                                          ⏸️ Pause Timer
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : checkpoint.questionAssign.status !== "PENDING" ? (
                                <span className="text-xs font-medium text-gray-600">
                                  Marked
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">No checkpoints yet</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      {/* Question Modal removed - no longer needed for automatic assignment */}
    </div>
  )
}
