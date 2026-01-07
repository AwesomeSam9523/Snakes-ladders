"use client"

import { Clock, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { GameStatus } from "@/app/page"

interface StatusStripProps {
  currentPosition: number
  roomNumber: number
  status: GameStatus
  totalTimeSec: number
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

export function StatusStrip({ currentPosition, roomNumber, status, totalTimeSec }: StatusStripProps) {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Position</div>
              <div className="text-3xl font-bold text-primary">{currentPosition}</div>
            </div>

            <div className="h-12 w-px bg-border" />

            <div>
              <div className="text-sm text-muted-foreground mb-1">Room</div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-xl font-semibold">{roomNumber || "—"}</span>
              </div>
            </div>

            <div className="h-12 w-px bg-border" />

            <div>
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <Badge variant="secondary">{statusLabels[status]}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary">
              <Clock className="w-4 h-4 text-warning" />
              <span className="font-mono text-lg font-semibold">{formatTime(totalTimeSec)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
