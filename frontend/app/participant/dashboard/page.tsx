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
import {useCheckVersion} from "@/hooks/use-check-version";

/* ---------- TYPES ---------- */

interface TeamData {
  teamId: string
  currentPosition: number
  currentRoom: string | null
  canRollDice: boolean
  totalTimeSec: number
  status?: string
  timerPaused?: boolean
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
    status: "ACTIVE",
    timerPaused: false,
  })
  const [gameStatus, setGameStatus] = useState<GameStatus>("IDLE")
  const [currentCheckpoint, setCurrentCheckpoint] = useState<any>(null)
  const [questionData, setQuestionData] = useState<any>(null)
  const [teams, setTeams] = useState<LeaderboardTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [lastDiceValue, setLastDiceValue] = useState<number>(6)
  const { toast } = useToast()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  useCheckVersion();

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
            status: teamState.status || "ACTIVE",
            timerPaused: teamState.timerPaused ?? false,
          }))
          
          // Update game status based on canRollDice
          // If canRollDice is true, allow rolling again
          if (teamState.canRollDice) {
            if (gameStatus === "PENDING_APPROVAL" || gameStatus === "LOCKED" || gameStatus === "AWAITING_QUESTION" || gameStatus === "QUESTION_ASSIGNED") {
              setGameStatus("IDLE")
              setCurrentCheckpoint(null)
              setQuestionData(null)
            }
          }
        }
      }

      // Fetch pending checkpoint to check for assigned questions
      const checkpointRes = await fetch(`${API_URL}/participant/checkpoints/pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (checkpointRes.ok) {
        const checkpointData = await checkpointRes.json()
        if (checkpointData.data) {
          const checkpoint = checkpointData.data
          setCurrentCheckpoint(checkpoint)
          
          // Check game status based on checkpoint and question assignment
          if (checkpoint.questionAssign?.question) {
            // Question is assigned
            setQuestionData({
              id: checkpoint.questionAssign.id,
              assignmentId: checkpoint.questionAssign.id,
              question: {
                id: checkpoint.questionAssign.question.id,
                text: checkpoint.questionAssign.question.content || checkpoint.questionAssign.question.text,
                hint: checkpoint.questionAssign.question.hint || "",
                difficulty: checkpoint.questionAssign.question.difficulty || "MEDIUM",
                type: checkpoint.questionAssign.question.type || "TEXT",
                options: checkpoint.questionAssign.question.options || [],
                correctAnswer: checkpoint.questionAssign.question.correctAnswer || "",
              },
              participantAnswer: checkpoint.questionAssign.participantAnswer,
              isSnakeDodge: checkpoint.isSnakePosition,
              status: checkpoint.questionAssign.status,
            })
            
            if (checkpoint.questionAssign.status === "PENDING") {
              // Question assigned but not yet answered
              if (gameStatus !== "SOLVING") {
                setGameStatus("QUESTION_ASSIGNED")
              }
            }
          } else if (checkpoint.status === "APPROVED") {
            // Checkpoint approved, waiting for admin to assign question
            setGameStatus("AWAITING_QUESTION")
          } else if (checkpoint.status === "PENDING") {
            // Checkpoint not yet approved - waiting for admin approval
            setGameStatus("PENDING_APPROVAL")
          }
        } else {
          // No pending checkpoint - can roll dice
          if (teamData.canRollDice && gameStatus !== "ROLLING") {
            setGameStatus("IDLE")
            setCurrentCheckpoint(null)
            setQuestionData(null)
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
    
    // Refresh team state and leaderboard (optimized intervals)
    const teamInterval = setInterval(fetchTeamData, 5000)
    const leaderboardInterval = setInterval(fetchTeams, 15000)
    
    return () => {
      clearInterval(teamInterval)
      clearInterval(leaderboardInterval)
    }
  }, [router])

  /* ---------- TIMER ---------- */
  // Client-side timer that increments locally and syncs with DB every 10 seconds
  useEffect(() => {
    // Don't run timer if game is completed or timer is paused
    if (teamData.status === "COMPLETED" || teamData.timerPaused) {
      return
    }

    let lastSyncTime = Date.now()
    let localElapsed = 0

    const interval = setInterval(() => {
      setTeamData((prev) => ({
        ...prev,
        totalTimeSec: prev.totalTimeSec + 1,
      }))
      localElapsed += 1
    }, 1000)

    // Sync with database every 10 seconds
    const syncInterval = setInterval(async () => {
      if (localElapsed > 0) {
        try {
          const token = localStorage.getItem("token")
          const res = await fetch(`${API_URL}/participant/timer/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ elapsedSeconds: localElapsed }),
          })
          
          if (res.ok) {
            const data = await res.json()
            // Update with server time to ensure accuracy
            setTeamData((prev) => ({
              ...prev,
              totalTimeSec: data.data.totalTimeSec,
              status: data.data.status || prev.status,
              timerPaused: data.data.timerPaused ?? prev.timerPaused,
            }))
            localElapsed = 0
            lastSyncTime = Date.now()
          }
        } catch (error) {
          console.error("Error syncing timer:", error)
        }
      }
    }, 10000)

    return () => {
      clearInterval(interval)
      clearInterval(syncInterval)
    }
  }, [API_URL, teamData.status, teamData.timerPaused])

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
    // Use actual question data if available
    if (questionData) {
      setGameStatus("SOLVING")
    } else {
      toast({
        title: "No Question",
        description: "Please wait for the admin to assign a question",
        variant: "destructive",
      })
    }
  }

  const handleSubmitAnswer = async (answer: string, assignmentId: string): Promise<{ autoMarked?: boolean; isCorrect?: boolean; message?: string }> => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/participant/answer/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignmentId,
          answer,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        // Always unlock dice after answer submission
        setTeamData(prev => ({ ...prev, canRollDice: true }))
        setGameStatus("IDLE")

        // Show generic success message for all submissions
        toast({
          title: "Answer Submitted",
          description: "Your answer has been submitted successfully.",
        })

        // Refresh data
        fetchTeamData()
        
        return {
          autoMarked: data.data?.autoMarked,
          isCorrect: data.data?.isCorrect,
          message: data.data?.message || data.message,
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to submit answer",
          variant: "destructive",
        })
        return { message: data.message || "Failed to submit answer" }
      }
    } catch (error) {
      console.error("Error submitting answer:", error)
      toast({
        title: "Error",
        description: "Failed to submit answer. Check your connection.",
        variant: "destructive",
      })
      return { message: "Failed to submit answer" }
    }
  }

  const handleUseHint = async (assignmentId: string): Promise<void> => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/participant/hint/use`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignmentId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        // Update the timer with the new total time
        if (data.data?.newTotalTime !== undefined) {
          setTeamData(prev => ({ ...prev, totalTimeSec: data.data.newTotalTime }))
        }
        
        toast({
          title: "Hint Used",
          description: "+60 seconds penalty added to your time",
          variant: "default",
        })
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to use hint",
          variant: "destructive",
        })
        throw new Error(data.message || "Failed to use hint")
      }
    } catch (error) {
      console.error("Error using hint:", error)
      toast({
        title: "Error",
        description: "Failed to use hint. Check your connection.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleHint = () => {
    // This function is no longer used but kept for compatibility
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
        roomNumber={teamData.currentRoom || "—"}
        status={gameStatus}
        totalTimeSec={teamData.totalTimeSec}
        timerPaused={teamData.timerPaused}
      />

      {/* Game Completed Banner */}
      {teamData.status === "COMPLETED" && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 sm:py-6 md:py-8 px-3 sm:px-4 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">🎉 Congratulations! 🎉</h1>
          <p className="text-base sm:text-lg md:text-xl">You have completed the game!</p>
          <p className="text-sm sm:text-base md:text-lg mt-1 sm:mt-2">Final Time: {Math.floor(teamData.totalTimeSec / 3600).toString().padStart(2, "0")}:{Math.floor((teamData.totalTimeSec % 3600) / 60).toString().padStart(2, "0")}:{(teamData.totalTimeSec % 60).toString().padStart(2, "0")}</p>
        </div>
      )}

      <main className="flex-1 container mx-auto p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
              onUseHint={handleUseHint}
            />
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  )
}
