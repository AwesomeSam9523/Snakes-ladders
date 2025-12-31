"use client"

import { useState, useEffect } from "react"

import { Header } from "@/components/participant/header"
import { StatusStrip } from "@/components/participant/status-strip"
import { Dice } from "@/components/participant/dice"
import { Board } from "@/components/participant/board"
import { TeamsList } from "@/components/participant/teams-list"
import { QuestionPanel } from "@/components/participant/question-panel"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { mockTeamStatus, mockTeams } from "@/lib/mock-data"

/* ---------- TYPES ---------- */

interface TeamData {
  teamId: string
  currentPosition: number
  currentRoom: number | null
  canRollDice: boolean
  totalTimeSec: number
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
  const [teamData, setTeamData] = useState<TeamData>(mockTeamStatus)
  const [gameStatus, setGameStatus] = useState<GameStatus>("IDLE")
  const [currentCheckpoint, setCurrentCheckpoint] = useState<any>(null)
  const [questionData, setQuestionData] = useState<any>(null)
  const { toast } = useToast()

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

            <TeamsList teams={mockTeams} />
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
