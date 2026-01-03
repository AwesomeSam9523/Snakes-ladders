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
  const [lastDiceValue, setLastDiceValue] = useState<number>(6)
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
          const teamState = data.data
          
          setTeamData(prev => ({
            ...prev,
            currentPosition: teamState.currentPosition || 1,
            currentRoom: teamState.currentRoom || null,
            canRollDice: teamState.canRollDice ?? true,
            totalTimeSec: teamState.totalTimeSec || 0,
          }))
          
          // Update game status based on canRollDice
          // If canRollDice is true and we were waiting for approval, set to IDLE
          if (teamState.canRollDice && gameStatus === "PENDING_APPROVAL") {
            setGameStatus("IDLE")
            setCurrentCheckpoint(null)
          }
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
    
    // Refresh team state and leaderboard every 5 seconds
    const teamInterval = setInterval(fetchTeamData, 5000)
    const leaderboardInterval = setInterval(fetchTeams, 10000)
    
    return () => {
      clearInterval(teamInterval)
      clearInterval(leaderboardInterval)
    }
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

  const handleRoll = async () => {
    setGameStatus("ROLLING")

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/participant/dice/roll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (res.ok) {
        const data = await res.json()
        const result = data.data

        // Set the dice value from API
        setLastDiceValue(result.diceValue)

        // Update team data with results from backend
        setTeamData((prev) => ({
          ...prev,
          currentPosition: result.positionAfter,
          currentRoom: result.roomAssigned,
          canRollDice: false,
        }))

        setCurrentCheckpoint({
          id: result.checkpoint?.id || `cp_${Date.now()}`,
          roomNumber: result.roomAssigned,
          status: "PENDING",
          isSnakePosition: result.isSnakePosition,
        })

        setGameStatus("PENDING_APPROVAL")

        toast({
          title: `Rolled ${result.diceValue}!`,
          description: `Go to Room ${result.roomAssigned}`,
        })

        // Refresh teams list to update leaderboard
        fetchTeams()
      } else {
        const error = await res.json()
        toast({
          title: "Cannot roll dice",
          description: error.message || "Failed to roll dice",
          variant: "destructive",
        })
        setGameStatus("IDLE")
      }
    } catch (error) {
      console.error("Error rolling dice:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
      setGameStatus("IDLE")
    }
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
              lastValue={lastDiceValue}
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
