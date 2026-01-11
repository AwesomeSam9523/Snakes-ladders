"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"

interface Team {
  id: string
  teamCode?: string
  teamName?: string
  teamId?: string  
  members: string[]
  currentPosition: number
  currentRoom: number
  totalTime: number
  points: number
  disqualified: boolean
  mapId?: number
  mapName?: string
  checkpoints: Array<{
    id: string
    checkpointNumber: number
    positionBefore: number
    positionAfter: number
    roomNumber: number
    status: "PENDING" | "APPROVED" | "FAILED"
    isSnakePosition: boolean
    questionAssign?: {
      id: string
      questionId: string
      status: "PENDING" | "CORRECT" | "INCORRECT"
      question?: {
        id: string
        text: string
      }
    } | null
  }>
}

interface Question {
  id: string
  questionNumber?: string
  text: string
  hint: string
  difficulty: "easy" | "medium" | "hard"
  type: "CODING" | "NUMERICAL" | "MCQ" | "PHYSICAL"
  options?: string[]
  correctAnswer?: string
}

interface ActivityLog {
  id: string
  userId: string
  userRole: "admin" | "superadmin" | "participant"
  action: string
  details: string
  timestamp: string
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("leaderboard")
  const [teams, setTeams] = useState<Team[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [showNewTeamModal, setShowNewTeamModal] = useState(false)
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false)
  const [newTeamId, setNewTeamId] = useState("")
  const [newTeamMembers, setNewTeamMembers] = useState("")
  const [newTeamPassword, setNewTeamPassword] = useState("")
  const [newQuestion, setNewQuestion] = useState("")
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [newQuestionType, setNewQuestionType] = useState<"CODING" | "NUMERICAL" | "MCQ" | "PHYSICAL">("CODING")
  const [newQuestionOptions, setNewQuestionOptions] = useState("")
  const [newQuestionCorrectAnswer, setNewQuestionCorrectAnswer] = useState("")
  const [newQuestionHint, setNewQuestionHint] = useState("")
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState<string | null>(null)
  const [newRoom, setNewRoom] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<string, string>>({})
  const [maps, setMaps] = useState<Array<{id: number, name: string, teamsCount: number}>>([])
  const [editingTeam, setEditingTeam] = useState<{teamId: string, field: string, value: any} | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  // Fetch maps from backend
  const fetchMaps = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/superadmin/board/maps`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data && data.data.maps) {
          setMaps(data.data.maps)
        }
      }
    } catch (error) {
      console.error("Error fetching maps:", error)
    }
  }

  // Fetch questions from backend
  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/questions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setQuestions(data.data.map((q: any, index: number) => ({
            id: q.id,
            questionNumber: `Q${String(index + 1).padStart(3, "0")}`,
            text: q.content || q.text,
            hint: q.hint || "",
            difficulty: q.difficultyLabel || (q.difficulty === 1 ? "easy" : q.difficulty === 2 ? "medium" : q.difficulty === 3 ? "hard" : "medium"),
            type: q.type || "CODING",
            options: q.options || [],
            correctAnswer: q.correctAnswer || "",
          })))
        }
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  // Fetch teams from backend
  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/superadmin/teams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setTeams(data.data.map((t: any) => ({
            id: t.id,
            teamCode: t.teamCode,
            teamName: t.teamName,
            teamId: t.user?.username || t.teamCode, // Use username as TEAM ID (e.g., "TEAM001")
            members: t.members?.map((m: any) => m.name) || [],
            currentPosition: t.currentPosition || 1,
            currentRoom: t.currentRoom || 1,
            totalTime: t.totalTimeSec || 0,
            points: t.points || 0,
            disqualified: t.status === 'DISQUALIFIED',
            mapId: t.mapId,
            mapName: t.map?.name,
            checkpoints: t.checkpoints || [],
          })))
        }
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  // Fetch activity logs from backend
  const fetchActivityLogs = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/superadmin/audit-logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setActivityLogs(data.data)
        }
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error)
    }
  }

  useEffect(() => {
    const userRole = localStorage.getItem("userRole")
    if (userRole !== "superadmin") {
      router.push("/login")
    } else {
      fetchTeams()
      fetchActivityLogs()
      fetchQuestions()
      fetchMaps()
      
      // Auto-refresh teams every 10 seconds to see position updates
      const interval = setInterval(fetchTeams, 10000)
      return () => clearInterval(interval)
    }
  }, [router])

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let password = ""
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleGeneratePassword = async (teamId: string) => {
    const newPassword = generateRandomPassword()
    
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/superadmin/teams/${teamId}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      })

      if (res.ok) {
        setGeneratedPasswords((prev) => ({ ...prev, [teamId]: newPassword }))
        alert(`Password updated successfully! New password: ${newPassword}`)
      } else {
        const error = await res.json()
        alert(`Failed to update password: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error updating password:", error)
      alert("Failed to update password. Check if backend is running.")
    }
  }

  const handleCreateTeam = async () => {
    if (!newTeamId || !newTeamMembers) return

    try {
      const token = localStorage.getItem("token")
      const members = newTeamMembers.split(",").map((m) => m.trim()).filter(m => m)
      
      const res = await fetch(`${API_URL}/superadmin/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamName: newTeamId,
          members: members,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Refresh teams list and activity logs from database
        fetchTeams()
        fetchActivityLogs()
        
        // Show the generated credentials
        if (data.data) {
          const team = data.data
          alert(`Team created successfully!\n\nLogin Username: ${team.loginUsername || team.teamCode}\nPassword: ${team.generatedPassword}\n\nPlease save these credentials!`)
        }
        
        setNewTeamId("")
        setNewTeamMembers("")
        setNewTeamPassword("")
        setShowNewTeamModal(false)
      } else {
        const error = await res.json()
        alert(`Failed to create team: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error creating team:", error)
      alert("Failed to create team. Check if backend is running.")
    }
  }

  const handleAddQuestion = async () => {
    if (!newQuestion) return

    if (!newQuestionHint || newQuestionHint.trim() === "") {
      alert("Hint is required")
      return
    }

    // Validate MCQ and NUMERICAL types
    if (newQuestionType === "MCQ") {
      const options = newQuestionOptions.split(",").map(o => o.trim()).filter(o => o)
      if (options.length < 2) {
        alert("MCQ questions must have at least 2 options (comma-separated)")
        return
      }
      if (!newQuestionCorrectAnswer || !options.includes(newQuestionCorrectAnswer.trim())) {
        alert("Correct answer must be one of the options")
        return
      }
    }

    if (newQuestionType === "NUMERICAL" && !newQuestionCorrectAnswer) {
      alert("NUMERICAL questions must have a correct answer")
      return
    }

    try {
      const token = localStorage.getItem("token")
      const payload: any = {
        content: newQuestion,
        hint: newQuestionHint,
        difficulty: newQuestionDifficulty.toUpperCase(),
        category: "GENERAL",
        points: newQuestionDifficulty === "easy" ? 5 : newQuestionDifficulty === "medium" ? 10 : 15,
        type: newQuestionType,
      }

      if (newQuestionType === "MCQ") {
        payload.options = newQuestionOptions.split(",").map(o => o.trim()).filter(o => o)
        payload.correctAnswer = newQuestionCorrectAnswer.trim()
      } else if (newQuestionType === "NUMERICAL") {
        payload.correctAnswer = newQuestionCorrectAnswer.trim()
      }

      const res = await fetch(`${API_URL}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        fetchQuestions() // Refresh questions from DB
        alert("Question created successfully!")
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'Failed to create question'}`)
      }
    } catch (error) {
      console.error("Error creating question:", error)
      alert("Failed to create question. Check if backend is running.")
    }

    setNewQuestion("")
    setNewQuestionDifficulty("medium")
    setNewQuestionType("CODING")
    setNewQuestionOptions("")
    setNewQuestionCorrectAnswer("")
    setNewQuestionHint("")
    setShowNewQuestionModal(false)
  }

  const handleDisqualifyTeam = async (teamId: string) => {
    try {
      const team = teams.find(t => t.id === teamId)
      const endpoint = team?.disqualified ? 'reinstate' : 'disqualify'
      
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/superadmin/teams/${teamId}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        fetchTeams() // Refresh teams from DB
        alert(`Team ${endpoint}d successfully!`)
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || `Failed to ${endpoint} team`}`)
      }
    } catch (error) {
      console.error(`Error updating team status:`, error)
      alert("Failed to update team status. Check if backend is running.")
    }
  }

  const handleChangeRoom = async (teamId: string) => {
    if (!newRoom) return

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/superadmin/teams/${teamId}/room`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomNumber: parseInt(newRoom) }),
      })

      if (res.ok) {
        fetchTeams() // Refresh teams from DB
        setSelectedTeamForEdit(null)
        setNewRoom("")
        alert("Room updated successfully!")
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'Failed to update room'}`)
      }
    } catch (error) {
      console.error("Error updating room:", error)
      alert("Failed to update room. Check if backend is running.")
    }
  }

  const handleAssignMap = async (teamId: string, mapId: number) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/superadmin/teams/${teamId}/map`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mapId }),
      })

      if (res.ok) {
        fetchTeams() // Refresh teams from DB
        alert("Map assigned successfully!")
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'Failed to assign map'}`)
      }
    } catch (error) {
      console.error("Error assigning map:", error)
      alert("Failed to assign map. Check if backend is running.")
    }
  }

  const handleRemoveQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        fetchQuestions() // Refresh questions from DB
        alert("Question deleted successfully!")
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'Failed to delete question'}`)
      }
    } catch (error) {
      console.error("Error deleting question:", error)
      alert("Failed to delete question. Check if backend is running.")
    }
  }

  const handleEditQuestion = async () => {
    if (!editingQuestion) return

    // Validate MCQ and NUMERICAL types
    if (editingQuestion.type === "MCQ") {
      const options = editingQuestion.options || []
      if (options.length < 2) {
        alert("MCQ questions must have at least 2 options")
        return
      }
      if (!editingQuestion.correctAnswer || !options.includes(editingQuestion.correctAnswer.trim())) {
        alert("Correct answer must be one of the options")
        return
      }
    }

    if (editingQuestion.type === "NUMERICAL" && !editingQuestion.correctAnswer) {
      alert("NUMERICAL questions must have a correct answer")
      return
    }

    try {
      const token = localStorage.getItem("token")
      const payload: any = {
        content: editingQuestion.text,
        hint: editingQuestion.hint,
        difficulty: editingQuestion.difficulty.toUpperCase(),
        type: editingQuestion.type,
      }

      if (editingQuestion.type === "MCQ") {
        payload.options = editingQuestion.options
        payload.correctAnswer = editingQuestion.correctAnswer?.trim()
      } else if (editingQuestion.type === "NUMERICAL") {
        payload.correctAnswer = editingQuestion.correctAnswer?.trim()
      }

      const res = await fetch(`${API_URL}/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        fetchQuestions()
        alert("Question updated successfully!")
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'Failed to update question'}`)
      }
    } catch (error) {
      console.error("Error updating question:", error)
      alert("Failed to update question. Check if backend is running.")
    }

    setEditingQuestion(null)
  }

  // Undo checkpoint - calls backend API
  const handleUndoCheckpoint = async (checkpointId: string) => {
    if (!confirm("Are you sure you want to undo this checkpoint? This will restore the team's previous position.")) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/superadmin/checkpoints/${checkpointId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        // Refresh teams and activity logs
        fetchTeams()
        fetchActivityLogs()
        alert("Checkpoint undone successfully!")
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || 'Failed to undo checkpoint'}`)
      }
    } catch (error) {
      console.error("Error undoing checkpoint:", error)
      alert("Failed to undo checkpoint. Check if backend is running.")
    }
  }

  // Calculate leaderboard - sort by points (descending), then by time (ascending)
  const leaderboard = [...teams]
    .filter((t) => !t.disqualified)
    .sort((a, b) => b.points - a.points || a.totalTime - b.totalTime)

  return (
    <div className="min-h-screen bg-white relative">
      <Navbar role="superadmin" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-4 mb-8 border-b border-gray-200 pb-4">
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "leaderboard"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "teams" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Teams
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "questions"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Questions
          </button>
          <button
            onClick={() => {
              setActiveTab("activity")
              fetchActivityLogs()
            }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "activity"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Activity Log
          </button>
        </div>

        {activeTab === "leaderboard" && (
          <div className="mb-12">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Team Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Position</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Points</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaderboard.map((team, idx) => {
                    const formatTime = (seconds: number) => {
                      const h = Math.floor(seconds / 3600)
                      const m = Math.floor((seconds % 3600) / 60)
                      const s = seconds % 60
                      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
                    }
                    
                    return (
                      <tr key={team.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-bold">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{team.teamId || team.teamCode || team.teamName || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{team.currentPosition}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{team.points}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{formatTime(team.totalTime)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "teams" && (
          <div className="mb-12">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Teams</h2>
              <button
                type="button"
                onClick={() => setShowNewTeamModal(true)}
                className="px-4 py-2 bg-gray-800 text-white rounded font-medium hover:bg-gray-700 transition-colors"
              >
                + Create Team
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Team ID..."
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
              />
            </div>

            <div className="space-y-3">
              {teams
                .filter((team) => 
                  (team.teamId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (team.teamCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (team.teamName || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((team) => (
                <div
                  key={team.id}
                  className={`border rounded-lg p-4 ${
                    team.disqualified ? "bg-red-50 border-red-200" : "border-gray-200"
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Team ID</p>
                      <p className="font-bold text-gray-900">{team.teamId || team.teamCode || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Team Name</p>
                      <p className="font-bold text-gray-900">{team.teamName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Position</p>
                      <p className="font-bold text-gray-900">{team.currentPosition}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Points</p>
                      <p className="font-bold text-gray-900">{team.currentRoom}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Time (sec)</p>
                      <p className="font-bold text-gray-900">{team.totalTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Status</p>
                      <p className={`font-bold ${team.disqualified ? "text-red-600" : "text-green-600"}`}>
                        {team.disqualified ? "Disqualified" : "Active"}
                      </p>
                    </div>
                  </div>

                  {/* Map Assignment Section */}
                  <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-gray-700">Board Map:</p>
                      <select
                        value={team.mapId || ""}
                        onChange={(e) => {
                          const mapId = parseInt(e.target.value)
                          if (mapId) {
                            handleAssignMap(team.id, mapId)
                          }
                        }}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white"
                      >
                        <option value="">Select a map...</option>
                        {maps.map((map) => (
                          <option key={map.id} value={map.id}>
                            {map.name} ({map.teamsCount} teams)
                          </option>
                        ))}
                      </select>
                      {team.mapName && (
                        <span className="text-sm text-blue-700 font-medium">
                          ✓ Currently: {team.mapName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedTeamForEdit === team.id ? (
                      <div className="flex gap-2 w-full">
                        <input
                          type="number"
                          value={newRoom}
                          onChange={(e) => setNewRoom(e.target.value)}
                          placeholder="New room number"
                          className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-600"
                        />
                        <button
                          onClick={() => handleChangeRoom(team.id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTeamForEdit(null)
                            setNewRoom("")
                          }}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedTeamForEdit(team.id)
                            setNewRoom(String(team.currentRoom))
                          }}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium"
                        >
                          Change Room
                        </button>
                        <button
                          onClick={() => handleDisqualifyTeam(team.id)}
                          className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                            team.disqualified
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {team.disqualified ? "Reactivate" : "Disqualify"}
                        </button>
                        <button
                          onClick={() => handleGeneratePassword(team.id)}
                          className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
                        >
                          Generate Password
                        </button>
                      </>
                    )}
                  </div>

                  {/* Generated Password Display */}
                  {generatedPasswords[team.id] && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800 mb-1">
                        <span className="font-medium">Login Username:</span>{" "}
                        <span className="font-mono font-bold">{team.teamId || team.teamCode || 'N/A'}</span>
                      </p>
                      <p className="text-sm text-green-800 flex justify-between items-center">
                        <span>
                          <span className="font-medium">New Password:</span>{" "}
                          <span className="font-mono font-bold">{generatedPasswords[team.id]}</span>
                        </span>
                        <button
                          onClick={() => setGeneratedPasswords((prev) => {
                            const newPasswords = { ...prev }
                            delete newPasswords[team.id]
                            return newPasswords
                          })}
                          className="text-green-700 hover:text-green-900 text-sm font-medium"
                        >
                          ✕ Hide
                        </button>
                      </p>
                    </div>
                  )}

                  {/* Checkpoints Section */}
                  {team.checkpoints && team.checkpoints.length > 0 && (
                    <div className="mt-4 bg-gray-50 p-3 rounded">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Checkpoints History ({team.checkpoints.length})</p>
                      <div className="space-y-2">
                        {team.checkpoints.map((checkpoint) => (
                          <div
                            key={checkpoint.id}
                            className="bg-white p-3 rounded border border-gray-200"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">
                                Checkpoint #{checkpoint.checkpointNumber} → Position {checkpoint.positionAfter}
                                {checkpoint.isSnakePosition && (
                                  <span className="ml-2 text-xs text-red-600">🐍 Snake!</span>
                                )}
                              </span>
                              
                              {/* Checkpoint Status */}
                              <div className="flex items-center gap-2">
                                {checkpoint.status === "APPROVED" ? (
                                  <>
                                    <span className="text-xs text-green-600 font-medium">✓ Approved</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUndoCheckpoint(checkpoint.id)}
                                      className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                    >
                                      Undo
                                    </button>
                                  </>
                                ) : checkpoint.status === "FAILED" ? (
                                  <span className="text-xs text-red-600 font-medium">✗ Failed</span>
                                ) : (
                                  <span className="text-xs text-yellow-600 font-medium">⏳ Pending</span>
                                )}
                              </div>
                            </div>

                            {/* Question Info (if assigned) */}
                            {checkpoint.questionAssign && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-600">
                                    Question: <span className="font-medium text-gray-800">
                                      {checkpoint.questionAssign.question?.text?.substring(0, 40) || checkpoint.questionAssign.questionId}
                                      {(checkpoint.questionAssign.question?.text?.length || 0) > 40 ? "..." : ""}
                                    </span>
                                  </span>

                                  {/* Answer Status */}
                                  <div className="flex items-center gap-2">
                                    {checkpoint.questionAssign.status === "CORRECT" ? (
                                      <span className="text-xs text-green-600 font-medium">✓ Correct</span>
                                    ) : checkpoint.questionAssign.status === "INCORRECT" ? (
                                      <span className="text-xs text-red-600 font-medium">✗ Incorrect</span>
                                    ) : (
                                      <span className="text-xs text-yellow-600 font-medium">⏳ Pending</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Room info */}
                            <div className="mt-1 text-xs text-gray-500">
                              Room: {checkpoint.roomNumber} | From: {checkpoint.positionBefore} → {checkpoint.positionAfter}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "questions" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Question Bank</h2>
              <button
                type="button"
                onClick={() => setShowNewQuestionModal(true)}
                className="px-4 py-2 bg-gray-800 text-white rounded font-medium hover:bg-gray-700 transition-colors"
              >
                + Add Question
              </button>
            </div>

            <div className="space-y-2">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex justify-between items-start p-3 border border-gray-200 rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{question.questionNumber || `Q${String(index + 1).padStart(3, "0")}`}</p>
                    <p className="text-gray-700 text-sm mt-1">{question.text}</p>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          question.difficulty === "easy"
                            ? "bg-green-100 text-green-700"
                            : question.difficulty === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          question.type === "CODING"
                            ? "bg-purple-100 text-purple-700"
                            : question.type === "NUMERICAL"
                              ? "bg-blue-100 text-blue-700"
                              : question.type === "MCQ"
                                ? "bg-cyan-100 text-cyan-700"
                                : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {question.type}
                      </span>
                      {(question.type === "MCQ" || question.type === "NUMERICAL") && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          Auto-Check
                        </span>
                      )}
                    </div>
                    {question.type === "MCQ" && question.options && question.options.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Options: {question.options.join(", ")}</p>
                    )}
                    {(question.type === "MCQ" || question.type === "NUMERICAL") && question.correctAnswer && (
                      <p className="text-xs text-gray-500 mt-1">Answer: {question.correctAnswer}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingQuestion(question)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveQuestion(question.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Activity Log</h2>
              <button
                onClick={fetchActivityLogs}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Refresh
              </button>
            </div>

            {activityLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No activity logs yet. Activity will appear here as users interact with the system.</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">User ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activityLogs
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">{log.timestamp}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{log.userId}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              log.userRole === "superadmin"
                                ? "bg-purple-100 text-purple-700"
                                : log.userRole === "admin"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {log.userRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              log.action === "Login"
                                ? "bg-gray-100 text-gray-700"
                                : log.action === "Create"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{log.details}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}
      </main>

      {/* Create Team Modal */}
      {showNewTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Team</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
                <input
                  type="text"
                  value={newTeamId}
                  onChange={(e) => setNewTeamId(e.target.value)}
                  placeholder="Team Alpha"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Members (comma separated)</label>
                <input
                  type="text"
                  value={newTeamMembers}
                  onChange={(e) => setNewTeamMembers(e.target.value)}
                  placeholder="John Doe, Jane Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                />
              </div>

              <p className="text-xs text-gray-500">
                * A login username and password will be auto-generated and shown after creation.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewTeamModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded font-medium text-sm hover:bg-gray-700 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showNewQuestionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative z-50 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Question</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter question..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 h-24 text-gray-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hint <span className="text-red-500">*</span></label>
                <textarea
                  value={newQuestionHint}
                  onChange={(e) => setNewQuestionHint(e.target.value)}
                  placeholder="Enter hint for this question (required)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 h-20 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                <select
                  value={newQuestionType}
                  onChange={(e) => setNewQuestionType(e.target.value as "CODING" | "NUMERICAL" | "MCQ" | "PHYSICAL")}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 text-gray-900"
                >
                  <option value="CODING">Coding (Manual Marking)</option>
                  <option value="PHYSICAL">Physical Task (Manual Marking)</option>
                  <option value="NUMERICAL">Numerical (Auto-Check)</option>
                  <option value="MCQ">MCQ (Auto-Check)</option>
                </select>
              </div>

              {newQuestionType === "MCQ" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options (comma-separated)</label>
                  <input
                    type="text"
                    value={newQuestionOptions}
                    onChange={(e) => setNewQuestionOptions(e.target.value)}
                    placeholder="Option 1, Option 2, Option 3, Option 4"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 text-gray-900"
                  />
                </div>
              )}

              {(newQuestionType === "MCQ" || newQuestionType === "NUMERICAL") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                  <input
                    type="text"
                    value={newQuestionCorrectAnswer}
                    onChange={(e) => setNewQuestionCorrectAnswer(e.target.value)}
                    placeholder={newQuestionType === "MCQ" ? "Must match one of the options" : "Enter the exact numerical answer"}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 text-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={newQuestionDifficulty}
                  onChange={(e) => setNewQuestionDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 text-gray-900"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewQuestionModal(false)
                  setNewQuestion("")
                  setNewQuestionType("CODING")
                  setNewQuestionOptions("")
                  setNewQuestionCorrectAnswer("")
                  setNewQuestionHint("")
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded font-medium text-sm hover:bg-gray-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative z-50 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Question</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                <textarea
                  value={editingQuestion.text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 h-24 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hint <span className="text-red-500">*</span></label>
                <textarea
                  value={editingQuestion.hint}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, hint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 h-20 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                <select
                  value={editingQuestion.type}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value as "CODING" | "NUMERICAL" | "MCQ" | "PHYSICAL" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 text-gray-900"
                >
                  <option value="CODING">Coding (Manual Marking)</option>
                  <option value="PHYSICAL">Physical Task (Manual Marking)</option>
                  <option value="NUMERICAL">Numerical (Auto-Check)</option>
                  <option value="MCQ">MCQ (Auto-Check)</option>
                </select>
              </div>

              {editingQuestion.type === "MCQ" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options (comma-separated)</label>
                  <input
                    type="text"
                    value={editingQuestion.options?.join(", ") || ""}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, options: e.target.value.split(",").map(o => o.trim()) })}
                    placeholder="Option 1, Option 2, Option 3, Option 4"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 text-gray-900"
                  />
                </div>
              )}

              {(editingQuestion.type === "MCQ" || editingQuestion.type === "NUMERICAL") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                  <input
                    type="text"
                    value={editingQuestion.correctAnswer || ""}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })}
                    placeholder={editingQuestion.type === "MCQ" ? "Must match one of the options" : "Enter the exact numerical answer"}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 text-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={editingQuestion.difficulty}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as "easy" | "medium" | "hard" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 text-gray-900"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingQuestion(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditQuestion}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded font-medium text-sm hover:bg-gray-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
