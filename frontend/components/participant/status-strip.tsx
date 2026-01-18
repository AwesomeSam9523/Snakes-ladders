"use client"

import { Clock, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { GameStatus } from "@/app/page"

interface StatusStripProps {
  currentPosition: number
  roomNumber: string | number
  status: GameStatus
  totalTimeSec: number
  timerPaused?: boolean
}

const statusLabels: Record<GameStatus, string> = {
  IDLE: "Ready to roll",
  ROLLING: "Rolling dice...",
  PENDING_APPROVAL: "Waiting for admin",
  AWAITING_QUESTION: "Question pending",
  QUESTION_ASSIGNED: "Question available",
  SOLVING: "Solving question",
  LOCKED: "Answer submitted",
}

export function StatusStrip({ currentPosition, roomNumber, status, totalTimeSec, timerPaused = false }: StatusStripProps) {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto">
            <div className="flex-shrink-0">
              <div className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Position</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">{currentPosition}</div>
            </div>

            <div className="h-10 sm:h-12 w-px bg-border flex-shrink-0" />

            <div className="flex-shrink-0">
              <div className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Room</div>
              <div className="flex items-center gap-1 sm:gap-2">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                <span className="text-base sm:text-xl font-semibold">{roomNumber || "—"}</span>
              </div>
            </div>

            <div className="h-10 sm:h-12 w-px bg-border flex-shrink-0" />

            <div className="flex-shrink-0">
              <div className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Status</div>
              <Badge variant="secondary" className="text-xs sm:text-sm">{statusLabels[status]}</Badge>
            </div>
          </div>

          <div className="flex items-center">
            <div className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${timerPaused ? 'bg-orange-100' : 'bg-secondary'} w-full sm:w-auto justify-center`}>
              <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${timerPaused ? 'text-orange-600' : 'text-warning'}`} />
              <span className={`font-mono text-base sm:text-lg font-semibold ${timerPaused ? 'text-orange-700' : ''}`}>
                {formatTime(totalTimeSec)}
              </span>
              {timerPaused && (
                <span className="text-[10px] sm:text-xs font-medium text-orange-700 ml-1 sm:ml-2">⏸️ PAUSED</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
