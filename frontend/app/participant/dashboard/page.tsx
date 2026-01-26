"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/participant/header"
import { StatusStrip } from "@/components/participant/status-strip"
import { Dice } from "@/components/participant/dice"
import { Board } from "@/components/participant/board"
import { TeamsList } from "@/components/participant/teams-list"
import { QuestionPanel } from "@/components/participant/question-panel"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { useCheckVersion } from "@/hooks/use-check-version"

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
  | "QUESTION_ASSIGNED"
  | "SOLVING"
  | "LOCKED"

/* ---------- COMPONENT ---------- */

export default function ParticipantDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  useCheckVersion()

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

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
  const [lastDiceValue, setLastDiceValue] = useState(6)
  const [answer, setAnswer] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)

  /* ---------- DATA FETCHING ---------- */

  const fetchTeamData = async () => {
    try {
      const token = localStorage.getItem("token")
      const username = localStorage.getItem("username")

      if (!token) {
        router.push("/login")
        return
      }

      setTeamData(prev => ({
        ...prev,
        teamId: username || localStorage.getItem("teamCode") || "",
      }))

      const res = await fetch(`${API_URL}/participant/state`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()

        if (data) {
          setTeamData(prev => ({
            ...prev,
            currentPosition: data.currentPosition ?? 1,
            currentRoom: data.currentRoom ?? null,
            canRollDice: data.canRollDice ?? true,
            totalTimeSec: data.totalTimeSec ?? 0,
            status: data.status ?? "ACTIVE",
            timerPaused: data.timerPaused ?? false,
          }))
        }
      }

      const checkpointRes = await fetch(
        `${API_URL}/participant/checkpoints/pending`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (checkpointRes.ok) {
        const { data } = await checkpointRes.json()

        if (!data) {
          setGameStatus("IDLE")
          setCurrentCheckpoint(null)
          setQuestionData(null)
          return
        }

        setCurrentCheckpoint(data)

        if (data.status === "PENDING") {
          setGameStatus("PENDING_APPROVAL")
        }

        if (data.status === "APPROVED" && data.questionAssign?.question) {
          setQuestionData({
            assignmentId: data.questionAssign.id,
            question: data.questionAssign.question,
            isSnakeDodge: data.isSnakePosition,
          })
          setGameStatus("QUESTION_ASSIGNED")
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/participant/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        setTeams(
          data.map((t: any) => ({
            id: t.teamId || t.id,
            position: t.currentPosition,
          }))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  /* ---------- EFFECTS ---------- */

  useEffect(() => {
    const role = localStorage.getItem("userRole")
    if (role?.toUpperCase() !== "PARTICIPANT") {
      router.push("/login")
      return
    }

    fetchTeamData()
    fetchTeams()

    const teamInterval = setInterval(fetchTeamData, 5000)
    const leaderboardInterval = setInterval(fetchTeams, 15000)

    return () => {
      clearInterval(teamInterval)
      clearInterval(leaderboardInterval)
    }
  }, [])

  /* ---------- ACTIONS ---------- */

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

  const handleRoll = async () => {
    setGameStatus("ROLLING")

    try {
      const token = localStorage.getItem("token")

      const res = await fetch(`${API_URL}/participant/dice/roll`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      await new Promise(r => setTimeout(r, 2000))

      if (!res.ok) throw new Error("Dice roll failed")

      const { data } = await res.json()

      setLastDiceValue(data.diceValue)
      setTeamData(prev => ({
        ...prev,
        currentPosition: data.positionAfter,
        currentRoom: data.roomAssigned,
        canRollDice: false,
      }))

      setGameStatus("PENDING_APPROVAL")
      fetchTeams()
    } catch (err) {
      setGameStatus("IDLE")
      toast({
        title: "Error",
        description: "Failed to roll dice",
        variant: "destructive",
      })
    }
  }

  const handleViewQuestion = () => {
    // Question is already visible when checkpoint is approved
    if (questionData) {
      setGameStatus("SOLVING")
    } else {
      toast({
        title: "No Question Available",
        description: "Please wait for admin to approve your checkpoint",
        variant: "destructive",
      })
    }
  }

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !questionData?.assignmentId) return

    setSubmitting(true)

    try {
      const token = localStorage.getItem("token")

      const res = await fetch(
        `${API_URL}/participant/answer/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assignmentId: questionData.assignmentId,
            answer,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Submission failed")
      }

      setSubmitResult(data.data)
      setAnswer("")
      setGameStatus("IDLE")
      setTeamData(prev => ({ ...prev, canRollDice: true }))

      fetchTeamData()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- UI ---------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header teamId={teamData.teamId} />

      <StatusStrip
        currentPosition={teamData.currentPosition}
        roomNumber={teamData.currentRoom || "—"}
        status={gameStatus}
        totalTimeSec={teamData.totalTimeSec}
        timerPaused={teamData.timerPaused}
      />

      <main className="flex-1 container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          <QuestionPanel
            gameStatus={gameStatus}
            checkpoint={currentCheckpoint}
            questionData={questionData}
            answer={answer}
            setAnswer={setAnswer}
            submitting={submitting}
            submitResult={submitResult}
            handleSubmitAnswer={handleSubmitAnswer}
            onUseHint={handleUseHint}
            onViewQuestion={handleViewQuestion}
          />
        </div>
      </main>

      <Toaster />
    </div>
  )
}
