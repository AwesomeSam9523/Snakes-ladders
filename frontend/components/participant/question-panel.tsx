"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, AlertTriangle, HelpCircle } from "lucide-react"
import type { GameStatus } from "@/app/page"

interface QuestionPanelProps {
  gameStatus: GameStatus
  checkpoint: any
  questionData: any
  onViewQuestion: () => void
  onSubmitAnswer: (answer: string, file?: File) => void
  onHint: () => void
}

export function QuestionPanel({
  gameStatus,
  checkpoint,
  questionData,
  onViewQuestion,
  onSubmitAnswer,
  onHint,
}: QuestionPanelProps) {
  const [answer, setAnswer] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmitAnswer(answer, file || undefined)
      setAnswer("")
      setFile(null)
    }
  }

  if (gameStatus === "IDLE" || gameStatus === "ROLLING") {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Roll the dice to begin</p>
        </div>
      </div>
    )
  }

  if (gameStatus === "PENDING_APPROVAL") {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning/20 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <p className="font-semibold">Checkpoint Reached!</p>
          <p className="text-sm text-muted-foreground">Go to Room {checkpoint?.roomNumber} and wait for admin approval</p>
        </div>
      </div>
    )
  }

  if (gameStatus === "AWAITING_QUESTION") {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
          <p className="font-semibold">Checkpoint Approved!</p>
          <p className="text-sm text-muted-foreground">Waiting for admin to assign a question...</p>
        </div>
      </div>
    )
  }

  if (gameStatus === "QUESTION_ASSIGNED" && questionData) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Question</h3>
            <div className="flex items-center gap-2">
              {questionData.isSnakeDodge && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Snake Dodge
                </Badge>
              )}
              <Badge variant="outline">{questionData.question.difficulty === 1 ? "Easy" : questionData.question.difficulty === 2 ? "Medium" : questionData.question.difficulty === 3 ? "Hard" : questionData.question.difficulty}</Badge>
            </div>
          </div>

          <p className="text-sm leading-relaxed">{questionData.question.text}</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="answer">Your Answer</Label>
            <Textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="mt-2 min-h-32"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!answer.trim()} className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Submit Answer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if ((gameStatus === "SOLVING" || gameStatus === "LOCKED") && questionData) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Question</h3>
            <div className="flex items-center gap-2">
              {questionData.isSnakeDodge && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Snake Dodge
                </Badge>
              )}
              <Badge variant="outline">{questionData.question.difficulty === 1 ? "Easy" : questionData.question.difficulty === 2 ? "Medium" : questionData.question.difficulty === 3 ? "Hard" : questionData.question.difficulty}</Badge>
            </div>
          </div>

          <p className="text-sm leading-relaxed">{questionData.question.text}</p>
        </div>

        <div className="p-4 rounded-lg bg-secondary text-center">
          <p className="text-sm font-semibold">✓ Answer Submitted</p>
          <p className="text-xs text-muted-foreground mt-1">Waiting for admin to evaluate your answer...</p>
        </div>
      </div>
    )
  }

  return null
}
