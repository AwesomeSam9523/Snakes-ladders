"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FileText, Upload, AlertTriangle, HelpCircle, Code, Calculator, List, Dumbbell, CheckCircle, XCircle } from "lucide-react"
import type { GameStatus } from "@/app/page"

interface QuestionPanelProps {
  gameStatus: GameStatus
  checkpoint: any
  questionData: any
  onViewQuestion: () => void
  onSubmitAnswer: (answer: string, assignmentId: string) => Promise<{ autoMarked?: boolean; isCorrect?: boolean; message?: string }>
  onUseHint: (assignmentId: string) => Promise<void>
}

export function QuestionPanel({
  gameStatus,
  checkpoint,
  questionData,
  onViewQuestion,
  onSubmitAnswer,
  onUseHint,
}: QuestionPanelProps) {
  const [answer, setAnswer] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ autoMarked?: boolean; isCorrect?: boolean; message?: string } | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [usingHint, setUsingHint] = useState(false)

  const handleSubmit = async () => {
    if (answer.trim() && questionData?.id) {
      setSubmitting(true)
      try {
        const result = await onSubmitAnswer(answer, questionData.id)
        setSubmitResult(result)
        setAnswer("")
      } catch (error) {
        console.error("Error submitting answer:", error)
      }
      setSubmitting(false)
    }
  }

  const handleHintClick = async () => {
    if (!showHint && questionData?.id) {
      setUsingHint(true)
      try {
        await onUseHint(questionData.id)
        setShowHint(true)
      } catch (error) {
        console.error("Error using hint:", error)
      }
      setUsingHint(false)
    } else {
      setShowHint(!showHint)
    }
  }

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case "CODING":
        return <Code className="w-4 h-4" />
      case "NUMERICAL":
        return <Calculator className="w-4 h-4" />
      case "MCQ":
        return <List className="w-4 h-4" />
      case "PHYSICAL":
        return <Dumbbell className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "CODING":
        return "Coding"
      case "NUMERICAL":
        return "Numerical"
      case "MCQ":
        return "Multiple Choice"
      case "PHYSICAL":
        return "Physical Task"
      default:
        return type
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
    const questionType = questionData.question?.type || "CODING"
    const options = questionData.question?.options || []

    return (
      <div className="rounded-2xl bg-card border border-border p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Question</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {getQuestionTypeIcon(questionType)}
                {getQuestionTypeLabel(questionType)}
              </Badge>
              <Badge variant="outline">{questionData.question.difficulty === 1 ? "Easy" : questionData.question.difficulty === 2 ? "Medium" : questionData.question.difficulty === 3 ? "Hard" : questionData.question.difficulty}</Badge>
            </div>
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap">{questionData.question.text}</p>
        </div>

        {submitResult && (
          <div className={`p-4 rounded-lg ${submitResult.isCorrect ? 'bg-green-100 dark:bg-green-900/30' : submitResult.autoMarked ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
            <div className="flex items-center gap-2">
              {submitResult.autoMarked ? (
                submitResult.isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )
              ) : (
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              )}
              <p className="text-sm font-semibold">{submitResult.message}</p>
            </div>
          </div>
        )}

        {!submitResult && (
          <div className="space-y-4">
            {/* MCQ Type - Radio Buttons */}
            {questionType === "MCQ" && options.length > 0 && (
              <div className="space-y-3">
                <Label>Select your answer:</Label>
                <RadioGroup value={answer} onValueChange={setAnswer} className="space-y-2">
                  {options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-secondary/50 cursor-pointer">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* NUMERICAL Type - Number Input */}
            {questionType === "NUMERICAL" && (
              <div>
                <Label htmlFor="answer">Your Answer (Number)</Label>
                <Input
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Enter your numerical answer..."
                  className="mt-2"
                />
              </div>
            )}

            {/* CODING Type - Code Textarea */}
            {questionType === "CODING" && (
              <div>
                <Label htmlFor="answer">Your Code</Label>
                <Textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write your code here..."
                  className="mt-2 min-h-40 font-mono text-sm"
                />
              </div>
            )}

            {/* PHYSICAL Type - Text Description */}
            {questionType === "PHYSICAL" && (
              <div>
                <Label htmlFor="answer">Describe your completed task</Label>
                <Textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Describe how you completed the physical task..."
                  className="mt-2 min-h-32"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Note: The admin will verify your physical task completion.
                </p>
              </div>
            )}

            {/* Hint Display - Shows above buttons when revealed */}
            {showHint && questionData.question.hint && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">Hint: (+60s penalty)</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">{questionData.question.hint}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleHintClick} 
                variant="outline"
                className="flex items-center gap-2"
                disabled={usingHint}
              >
                <HelpCircle className="w-4 h-4" />
                {usingHint ? "Loading..." : showHint ? "Hide Hint" : "Show Hint (+60s)"}
              </Button>
              <Button onClick={handleSubmit} disabled={!answer.trim() || submitting} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                {submitting ? "Submitting..." : "Submit Answer"}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if ((gameStatus === "SOLVING" || gameStatus === "LOCKED") && questionData) {
    const questionType = questionData.question?.type || "CODING"
    const participantAnswer = questionData.participantAnswer
    const status = questionData.status

    return (
      <div className="rounded-2xl bg-card border border-border p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Question</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {getQuestionTypeIcon(questionType)}
                {getQuestionTypeLabel(questionType)}
              </Badge>
              <Badge variant="outline">{questionData.question.difficulty === 1 ? "Easy" : questionData.question.difficulty === 2 ? "Medium" : questionData.question.difficulty === 3 ? "Hard" : questionData.question.difficulty}</Badge>
            </div>
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap">{questionData.question.text}</p>
        </div>

        {participantAnswer && (
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Your submitted answer:</p>
            <p className="text-sm font-mono whitespace-pre-wrap">{participantAnswer}</p>
          </div>
        )}

        <div className={`p-4 rounded-lg text-center ${
          status === 'CORRECT' ? 'bg-green-100 dark:bg-green-900/30' :
          status === 'INCORRECT' ? 'bg-red-100 dark:bg-red-900/30' :
          'bg-secondary'
        }`}>
          {status === 'CORRECT' ? (
            <>
              <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">✓ Correct!</p>
              <p className="text-xs text-muted-foreground mt-1">You can now roll the dice again.</p>
            </>
          ) : status === 'INCORRECT' ? (
            <>
              <XCircle className="w-6 h-6 mx-auto text-red-600 mb-2" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">✗ Incorrect</p>
              <p className="text-xs text-muted-foreground mt-1">Waiting for admin review...</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">✓ Answer Submitted</p>
              <p className="text-xs text-muted-foreground mt-1">Waiting for admin to evaluate your answer...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}
