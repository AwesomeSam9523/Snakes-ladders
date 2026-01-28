"use client"

import {useEffect, useState, useRef} from "react"
import {useRouter} from "next/navigation"

import {Header} from "@/components/participant/header"
import {StatusStrip} from "@/components/participant/status-strip"
import {Dice} from "@/components/participant/dice"
import {Board} from "@/components/participant/board"
import {TeamsList} from "@/components/participant/teams-list"
import {QuestionPanel} from "@/components/participant/question-panel"
import {Toaster} from "@/components/ui/toaster"
import {useToast} from "@/hooks/use-toast"
import {apiService} from "@/lib/service";
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
  | "QUESTION_ASSIGNED"
  | "SOLVING"
  | "LOCKED"

/* ---------- COMPONENT ---------- */

export default function ParticipantDashboard() {
  const router = useRouter()
  const {toast} = useToast()
  useCheckVersion()

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
  const previousSubmitResultRef = useRef<any>(null)

  /* ---------- SCROLL TO TOP ON MANUAL MARKING ---------- */
  useEffect(() => {
    // Scroll to top when manual check is marked by admin
    if (submitResult && !previousSubmitResultRef.current) {
      // If submitResult appears and it's NOT auto-marked, scroll to top
      if (!submitResult.autoMarked) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    previousSubmitResultRef.current = submitResult
  }, [submitResult])

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

      const {data} = await apiService.getParticipantState();
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

      let checkpointData = await apiService.getPendingCheckpoints();
      checkpointData = checkpointData.data;
      if (!checkpointData) {
        setGameStatus("IDLE")
        setCurrentCheckpoint(null)
        setQuestionData(null)
        return
      }

      setCurrentCheckpoint(checkpointData)

      if (checkpointData.status === "PENDING") {
        setGameStatus("PENDING_APPROVAL")
      }

      if (checkpointData.status === "APPROVED" && checkpointData.questionAssign?.question) {
        setQuestionData((prev: any) => ({
          assignmentId: checkpointData.questionAssign.id,
          question: {
            ...checkpointData.questionAssign.question,
            hint: prev?.question?.hint || null,
          },
          isSnakeDodge: checkpointData.isSnakePosition,
        }));
        setGameStatus("QUESTION_ASSIGNED")
      }

      if (checkpointData.status === "APPROVED" && checkpointData.questionAssign?.participantAnswer) {
        setQuestionData((prev: any) => ({
          assignmentId: checkpointData.questionAssign.id,
          question: {
            ...checkpointData.questionAssign.question,
            hint: prev?.question?.hint || null,
          },
          isSnakeDodge: checkpointData.isSnakePosition,
          participantAnswer: checkpointData.questionAssign.participantAnswer,
        }));
        setGameStatus("SOLVING");
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const {data} = await apiService.getLeaderboard();
      setTeams(
        data.map((t: any) => ({
          id: t.teamId || t.id,
          position: t.currentPosition,
        }))
      )
    } catch (err) {
      console.error(err)
    }
  }

  function incrementTimer() {
    if (teamData.timerPaused) return;
    setTeamData((prev) => ({
      ...prev,
      totalTimeSec: prev.totalTimeSec + 1,
    }));
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

    const lastDice = localStorage.getItem("lastDiceValue")
    if (lastDice) {
      setLastDiceValue(parseInt(lastDice, 10))
    }

    const teamInterval = setInterval(fetchTeamData, 5000)
    const leaderboardInterval = setInterval(fetchTeams, 15000)
    const timerInterval = setInterval(incrementTimer, 1000);
    
    // Sync timer with database every 10 seconds so superadmin sees updated times
    const syncTimerInterval = setInterval(async () => {
      try {
        await apiService.syncTimer()
      } catch (error) {
        console.error("Error syncing timer:", error)
      }
    }, 10000)

    return () => {
      clearInterval(teamInterval)
      clearInterval(leaderboardInterval)
      clearInterval(timerInterval);
      clearInterval(syncTimerInterval)
    }
  }, [])

  /* ---------- ACTIONS ---------- */

  const handleUseHint = async (assignmentId: string): Promise<void> => {
    try {
      const {data} = await apiService.useHint(assignmentId);

      if (data?.newTotalTime !== undefined) {
        setTeamData(prev => ({...prev, totalTimeSec: data.newTotalTime}))
      }
      if (data.hint) {
        setQuestionData((prev: any) => ({
          ...prev,
          question: {
            ...prev.question,
            hint: data.hint,
          },
        }));
      }

      toast({
        title: "Hint Used",
        description: "+60 seconds penalty added to your time",
        variant: "default",
      })
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
      const data = await apiService.rollDice();
      setSubmitResult(null);
      setLastDiceValue(data.diceValue);
      localStorage.setItem("lastDiceValue", data.diceValue.toString());
      setTeamData(prev => ({
        ...prev,
        currentPosition: data.positionAfter,
        currentRoom: data.roomAssigned,
        canRollDice: false,
      }))

      setGameStatus("PENDING_APPROVAL")
      await fetchTeams()
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
      const {data} = await apiService.submitAnswer(questionData.assignmentId, answer)

      setSubmitResult(data)
      setAnswer("")
      setGameStatus("IDLE")
      setTeamData(prev => ({...prev, canRollDice: true}))
      await fetchTeamData()

      // Scroll to top after submission
      // For auto-check (NUMERICAL/MCQ): scroll immediately
      // For manual-check (CODING/PHYSICAL): scroll will happen when marked by admin
      if (data.autoMarked) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
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
      <Header teamId={teamData.teamId}/>

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

            <TeamsList teams={teams}/>
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

      <Toaster/>
    </div>
  )
}
