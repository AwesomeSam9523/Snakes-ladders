"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"

interface Checkpoint {
  id: string
  checkpointNumber: number
  positionBefore?: number
  positionAfter?: number
  position?: number
  roomNumber?: number
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
  currentRoom: number
  status: string
  totalTimeSec: number
  checkpoints: Checkpoint[]
}

interface Question {
  id: string
  content: string
  type?: string
  questionNumber?: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  // Fetch teams from backend
  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/admin/teams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setTeams(data.data.map((t: any) => ({
            ...t,
            teamId: t.user?.username || t.teamCode,
          })))
        }
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch available questions
  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/admin/questions/available`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          // Add question numbers (Q1, Q2, etc.)
          setQuestions(data.data.map((q: any, index: number) => ({
            ...q,
            questionNumber: `Q${index + 1}`,
          })))
        }
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  useEffect(() => {
    const userRole = localStorage.getItem("userRole")
    if (userRole !== "admin") {
      router.push("/login")
    } else {
      fetchTeams()
      fetchQuestions()
      
      // Auto-refresh teams every 10 seconds to see position updates
      const interval = setInterval(fetchTeams, 10000)
      return () => clearInterval(interval)
    }
  }, [router])

  // Approve checkpoint via API
  const handleApproveCheckpoint = async (checkpointId: string) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/admin/checkpoints/${checkpointId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        // Refresh teams to get updated data
        fetchTeams()
        alert("Checkpoint approved successfully!")
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'Failed to approve checkpoint'}`)
      }
    } catch (error) {
      console.error("Error approving checkpoint:", error)
      alert("Failed to approve checkpoint")
    }
  }

  // Assign question via API
  const handleAssignQuestion = async () => {
    if (!selectedCheckpoint || !selectedQuestion) return

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/admin/checkpoints/${selectedCheckpoint.id}/assign-question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questionId: selectedQuestion }),
      })

      if (res.ok) {
        fetchTeams()
        fetchQuestions() // Refresh available questions
        alert("Question assigned successfully!")
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'Failed to assign question'}`)
      }
    } catch (error) {
      console.error("Error assigning question:", error)
      alert("Failed to assign question")
    }

    setShowQuestionModal(false)
    setSelectedQuestion("")
    setSelectedCheckpoint(null)
    setSelectedTeam(null)
  }

  // Mark answer as correct or incorrect via API
  const handleMarkAnswer = async (checkpointId: string, isCorrect: boolean) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/admin/checkpoints/${checkpointId}/mark`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isCorrect }),
      })

      if (res.ok) {
        fetchTeams()
        alert(`Answer marked as ${isCorrect ? 'correct' : 'incorrect'}!`)
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'Failed to mark answer'}`)
      }
    } catch (error) {
      console.error("Error marking answer:", error)
      alert("Failed to mark answer")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar role="admin" />
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
      <Navbar role="admin" />

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
                            </span>
                            
                            {/* Step 1: Checkpoint Approval Status */}
                            {checkpoint.status === "PENDING" ? (
                              <button
                                onClick={() => handleApproveCheckpoint(checkpoint.id)}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium"
                              >
                                Approve Checkpoint
                              </button>
                            ) : checkpoint.status === "APPROVED" ? (
                              <span className="text-xs text-green-600 font-medium">✓ Checkpoint Approved</span>
                            ) : (
                              <span className="text-xs text-red-600 font-medium">✗ Rejected</span>
                            )}
                          </div>

                          {/* Step 2: Question Assignment (only show if checkpoint is approved) */}
                          {checkpoint.status === "APPROVED" && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              {!checkpoint.questionAssign ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTeam(team)
                                    setSelectedCheckpoint(checkpoint)
                                    setShowQuestionModal(true)
                                  }}
                                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
                                >
                                  Assign Question
                                </button>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs text-gray-600">
                                    Question: <span className="font-medium text-gray-800">
                                      {`Q${checkpoint.questionAssign.questionId?.substring(0, 4)}`}
                                    </span>
                                    {checkpoint.questionAssign.question?.type && (
                                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                                        checkpoint.questionAssign.question.type === "CODING" ? "bg-purple-100 text-purple-700" :
                                        checkpoint.questionAssign.question.type === "NUMERICAL" ? "bg-blue-100 text-blue-700" :
                                        checkpoint.questionAssign.question.type === "MCQ" ? "bg-cyan-100 text-cyan-700" :
                                        "bg-orange-100 text-orange-700"
                                      }`}>
                                        {checkpoint.questionAssign.question.type}
                                      </span>
                                    )}
                                  </span>

                                  {/* Show participant's submitted answer */}
                                  {checkpoint.questionAssign.participantAnswer && (
                                    <div className="bg-gray-50 p-2 rounded text-xs">
                                      <p className="text-gray-500 mb-1">Answer:</p>
                                      <p className="text-gray-800 font-mono whitespace-pre-wrap">{checkpoint.questionAssign.participantAnswer}</p>
                                    </div>
                                  )}

                                  {/* Show correct answer for auto-check types */}
                                  {(checkpoint.questionAssign.question?.type === "MCQ" || checkpoint.questionAssign.question?.type === "NUMERICAL") && 
                                   checkpoint.questionAssign.question?.correctAnswer && (
                                    <p className="text-xs text-gray-500">
                                      Correct answer: <span className="font-medium text-gray-700">{checkpoint.questionAssign.question.correctAnswer}</span>
                                    </p>
                                  )}

                                  {/* Step 3: Mark Answer (only show if question is assigned) */}
                                  {checkpoint.questionAssign.status === "PENDING" ? (
                                    <div className="flex flex-col gap-2">
                                      {!checkpoint.questionAssign.participantAnswer && (
                                        <p className="text-xs text-amber-600">⏳ Waiting for participant to submit answer...</p>
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
                                    </div>
                                  ) : (
                                    <span
                                      className={`text-xs font-medium ${
                                        checkpoint.questionAssign.status === "CORRECT" ? "text-green-600" : "text-red-600"
                                      }`}
                                    >
                                      {checkpoint.questionAssign.status === "CORRECT" ? "✓ Correct" : "✗ Incorrect"}
                                    </span>
                                  )}
                                </div>
                              )}
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

      {/* Question Modal */}
      {showQuestionModal && selectedTeam && selectedCheckpoint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Assign Question to {selectedTeam.teamId || selectedTeam.teamName} - Checkpoint #{selectedCheckpoint.checkpointNumber}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Question</label>
                <select
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                >
                  <option value="">Choose a question</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.questionNumber || `Q${questions.indexOf(q) + 1}`}
                    </option>
                  ))}
                </select>
                {questions.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">No available questions. Add questions first.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowQuestionModal(false)
                  setSelectedQuestion("")
                  setSelectedCheckpoint(null)
                  setSelectedTeam(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignQuestion}
                disabled={!selectedQuestion}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded font-medium text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
