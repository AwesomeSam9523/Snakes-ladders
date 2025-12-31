"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/participant/header"
import { StatusStrip } from "@/components/participant/status-strip"
import { Dice } from "@/components/participant/dice"
import { Board } from "@/components/participant/board"
import { TeamsList } from "@/components/participant/teams-list"
import { QuestionPanel } from "@/components/participant/question-panel"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"

/* ---------- TYPES ---------- */

interface TeamData {
  teamId: string
  currentPosition: number
  currentRoom: number | null
  canRollDice: boolean
  totalTimeSec: number
}

interface LeaderboardTeam {
  id: string
  position: number
}

export type GameStatus =
  | "IDLE"
  | "ROLLING"
  | "PENDING_APPROVAL"
  | "AWAITING_QUESTION"
  | "QUESTION_ASSIGNED"
  | "SOLVING"
  | "LOCKED"

/* ---------- COMPONENT ---------- */

export default function ParticipantDashboard() {
  const router = useRouter()
  const [teamData, setTeamData] = useState<TeamData>({
    teamId: "",
    currentPosition: 1,
    currentRoom: null,
    canRollDice: true,
    totalTimeSec: 0,
  })
  const [gameStatus, setGameStatus] = useState<GameStatus>("IDLE")
  const [currentCheckpoint, setCurrentCheckpoint] = useState<any>(null)
  const [questionData, setQuestionData] = useState<any>(null)
  const [teams, setTeams] = useState<LeaderboardTeam[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  // Fetch team's own data from backend
  const fetchTeamData = async () => {
    try {
      const token = localStorage.getItem("token")
      const username = localStorage.getItem("username")
      
      if (!token) {
        router.push("/login")
        return
      }

      // Set teamId from localStorage (username is the Team ID like "TEAM001")
      setTeamData(prev => ({
        ...prev,
        teamId: username || localStorage.getItem("teamCode") || "",
      }))

      // Fetch team state from backend
      const res = await fetch(`${API_URL}/participant/state`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setTeamData(prev => ({
            ...prev,
            currentPosition: data.data.currentPosition || 1,
            currentRoom: data.data.currentRoom || null,
            canRollDice: data.data.canRollDice ?? true,
            totalTimeSec: data.data.totalTimeSec || 0,
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching team data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch leaderboard teams from backend
  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/participant/leaderboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setTeams(data.data.map((t: any) => ({
            id: t.teamId || t.teamName || t.id,
            position: t.currentPosition || 1,
          })))
        }
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  useEffect(() => {
    const userRole = localStorage.getItem("userRole")
    if (userRole !== "participant" && userRole !== "PARTICIPANT") {
      router.push("/login")
      return
    }
    
    fetchTeamData()
    fetchTeams()
    
    // Refresh leaderboard every 30 seconds
    const interval = setInterval(fetchTeams, 30000)
    return () => clearInterval(interval)
  }, [router])

  /* ---------- TIMER ---------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setTeamData((prev) => ({
        ...prev,
        totalTimeSec: prev.totalTimeSec + 1,
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  /* ---------- HANDLERS ---------- */

  const handleRoll = () => {
    setGameStatus("ROLLING")

    setTimeout(() => {
      const diceValue = Math.floor(Math.random() * 6) + 1
      const newPosition = Math.min(teamData.currentPosition + diceValue, 100)
      const roomNumber = Math.floor(Math.random() * 20) + 1

      setTeamData((prev) => ({
        ...prev,
        currentPosition: newPosition,
        currentRoom: roomNumber,
        canRollDice: false,
      }))

      setCurrentCheckpoint({
        id: `cp_${Date.now()}`,
        roomNumber,
        status: "PENDING",
        isSnakePosition: newPosition % 13 === 0,
      })

      setGameStatus("PENDING_APPROVAL")

      toast({
        title: `Rolled ${diceValue}!`,
        description: `Go to Room ${roomNumber}`,
      })
    }, 2000)
  }

  const handleViewQuestion = () => {
    setQuestionData({
      assignmentId: "qa_123",
      question: {
        id: "q_456",
        text: "What is the time complexity of binary search?",
        difficulty: "MEDIUM",
        type: "TEXT",
      },
      isSnakeDodge: currentCheckpoint?.isSnakePosition,
    })

    setGameStatus("SOLVING")
  }

  const handleSubmitAnswer = async (_answer: string, _file?: File) => {
    setGameStatus("LOCKED")

    toast({
      title: "Answer submitted",
      description: "Waiting for admin evaluation...",
    })
  }

  const handleHint = () => {
    setTeamData((prev) => ({
      ...prev,
      totalTimeSec: prev.totalTimeSec + 60,
    }))

    toast({
      title: "Hint requested",
      description: "+60 seconds penalty applied",
      variant: "destructive",
    })
  }

  /* ---------- UI ---------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header teamId={teamData.teamId} />

      <StatusStrip
        currentPosition={teamData.currentPosition}
        roomNumber={teamData.currentRoom || 0}
        status={gameStatus}
        totalTimeSec={teamData.totalTimeSec}
        onHint={handleHint}
      />

      <main className="flex-1 container mx-auto p-4 lg:p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <Dice
              onRoll={handleRoll}
              canRoll={teamData.canRollDice && gameStatus === "IDLE"}
              isRolling={gameStatus === "ROLLING"}
            />

            <Board
              currentPosition={teamData.currentPosition}
              teamId={teamData.teamId}
            />

            <TeamsList teams={teams} />
          </div>

          {/* Right column */}
          <div className="lg:col-span-1">
            <QuestionPanel
              gameStatus={gameStatus}
              checkpoint={currentCheckpoint}
              questionData={questionData}
              onViewQuestion={handleViewQuestion}
              onSubmitAnswer={handleSubmitAnswer}
              onHint={handleHint}
            />
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  )
}
