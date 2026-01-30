"use client"

import {useEffect, useRef, useState} from "react"
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
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"

/* ---------- TYPES ---------- */

interface TeamData {
  teamId: string
  currentPosition: number
  currentRoom: string
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
    currentRoom: "",
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
  const [systemSettings, setSystemSettings] = useState<any>({})
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)

  /* ---------- SCROLL TO TOP ON MANUAL MARKING ---------- */
  useEffect(() => {
    // Scroll to top when manual check is marked by admin
    if (submitResult && !previousSubmitResultRef.current) {
      // If submitResult appears and it's NOT auto-marked, scroll to top
      if (!submitResult.autoMarked) {
        window.scrollTo({top: 0, behavior: 'smooth'})
      }
    }
    previousSubmitResultRef.current = submitResult
  }, [submitResult])

  useEffect(() => {
    if (teamData.status === 'COMPLETED' && teamData.currentPosition === 150) {
      setShowCompletionDialog(true)
    }
  }, [teamData.status, teamData.currentPosition])

  const fetchTeamData = async () => {
    try {
      const username = localStorage.getItem("username")

      setTeamData(prev => ({
        ...prev,
        teamId: username || localStorage.getItem("teamCode") || "",
      }))

      const {data} = await apiService.getParticipantState();
      setTeamData(prev => ({
        ...prev,
        currentPosition: data.currentPosition ?? 1,
        currentRoom: data.currentRoom ?? null,
        canRollDice: data.canRollDice ?? true,
        totalTimeSec: data.totalTimeSec ?? 0,
        status: data.status ?? "ACTIVE",
        timerPaused: data.timerPaused ?? false,
      }))

      let systemSettingsData = await apiService.getSystemSettings();
      setSystemSettings(systemSettingsData.data);

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
          id: t.teamCode || t.id,
          position: t.currentPosition,
        }))
      )
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSystemSettings = async () => {
    try {
      const {data} = await apiService.getSystemSettings();
      setSystemSettings(data);
    } catch (err) {
      console.error("Error fetching system settings:", err);
    }
  }

  function incrementTimer() {
    if (teamData.timerPaused) return;
    if (teamData.currentPosition === 150) return; 
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
    fetchSystemSettings();

    const lastDice = localStorage.getItem("lastDiceValue")
    if (lastDice) {
      setLastDiceValue(parseInt(lastDice, 10))
    }

    const lastAnswer = localStorage.getItem("currentAnswer")
    if (lastAnswer) {
      setAnswer(lastAnswer)
    }

    const teamInterval = setInterval(fetchTeamData, 5000)
    const leaderboardInterval = setInterval(fetchTeams, 5000)
    const systemSettingsInterval = setInterval(fetchSystemSettings, 10000);
    const timerInterval = setInterval(incrementTimer, 1000);

    return () => {
      clearInterval(teamInterval)
      clearInterval(leaderboardInterval)
      clearInterval(timerInterval);
      clearInterval(systemSettingsInterval);
    }
  }, [])

  /* ---------- ACTIONS ---------- */

  const handleUseHint = async (assignmentId: string): Promise<void> => {
    if (systemSettings.locked === 'true') return;
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
    if (systemSettings.locked === 'true') return;
    setGameStatus("ROLLING")
    try {
      const {data} = await apiService.rollDice();
      setSubmitResult(null);

      setLastDiceValue(data.diceValue);
      localStorage.setItem("lastDiceValue", data.diceValue.toString());

      if (data.invalidRoll) {
        setGameStatus("IDLE");
        toast({
          title: "Too Far!",
          description: `🎲 You need ${150 - data.positionBefore}${data.positionBefore !== 149 ? ' or less' : ''}.`,
          variant: "default",
        })
        return;
      }

      // Extract floor info for display
      const getFloor = (room: string) => {
        const match = room.match(/(\d)\d{2}$/);
        return match ? (parseInt(match[1]) === 1 ? "1st" : "2nd") : "";
      };
      const fromFloor = getFloor(data.positionBefore ? teamData.currentRoom : "");
      const toFloor = getFloor(data.roomAssigned);

      // Update position immediately from dice roll response (don't wait for refetch)
      setTeamData(prev => ({
        ...prev,
        currentPosition: data.positionAfter,
        currentRoom: data.roomAssigned,
        canRollDice: false,
      }))

      // Show dice roll result popup (even at position 150)
      toast({
        title: `🎲 Rolled: ${data.diceValue}`,
        description: `Position ${data.positionBefore} → ${data.positionAfter}${data.hasWon ? ' 🏆 Finish Line!' : ''}${fromFloor && toFloor ? ` | ${fromFloor} → ${toFloor} Floor` : ''}`,
        variant: "default",
        duration: data.hasWon ? 6000 : 4000,
      })

      setGameStatus("PENDING_APPROVAL")

      // Update leaderboard immediately for other teams
      await fetchTeams()
    } catch (err: any) {
      setGameStatus("IDLE")
      toast({
        title: "Error",
        description: err?.message || "Failed to roll dice",
        variant: "destructive",
      })
    }
  }

  const saveAndSetAnswer = (answer: string) => {
    localStorage.setItem("currentAnswer", answer);
    setAnswer(answer);
  }

  const handleSubmitAnswer = async () => {
    if (systemSettings.locked === 'true') return;
    if (!answer.trim() || !questionData?.assignmentId) return

    setSubmitting(true)

    try {
      const {data} = await apiService.submitAnswer(questionData.assignmentId, answer)

      setSubmitResult(data)
      setAnswer("")
      setGameStatus("IDLE")
      setTeamData(prev => ({...prev, canRollDice: true}))

      // Immediate refetch for faster feedback
      await Promise.all([fetchTeamData(), fetchTeams()])

      // Scroll to top after submission
      // For auto-check (NUMERICAL/MCQ): scroll immediately
      // For manual-check (CODING/PHYSICAL): scroll will happen when marked by admin
      if (data.autoMarked) {
        window.scrollTo({top: 0, behavior: 'smooth'})
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

  if (systemSettings.locked === 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className={"text-3xl pb-4"}>Welcome to Venom by IEEE CS!</h1>
          <p>{"Game locked. Kindly wait for the organizers to start the game."}</p>
        </div>
      </div>
    )
  }

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
              canRoll={teamData.canRollDice && gameStatus === "IDLE" && teamData.currentPosition < 150 && teamData.status !== 'COMPLETED'}
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
            setAnswer={saveAndSetAnswer}
            submitting={submitting}
            submitResult={submitResult}
            handleSubmitAnswer={handleSubmitAnswer}
            onUseHint={handleUseHint}
          />
        </div>
      </main>

      <Toaster/>

      {/* Game Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center text-green-600">
              🎉 Congratulations! 🎉
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-3">
            <div className="text-xl font-semibold">Game Completed!</div>
            <div>Team {teamData.teamId} has successfully reached position 150!</div>
            <div className="pt-2 text-4xl">🏆</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
