"use client"

import { motion } from "framer-motion"

interface BoardProps {
  currentPosition: number
  teamId: string
}

const BOARD_SIZE = 10
const SNAKE_TILES = [98, 95, 93, 87, 64, 62, 54, 17]

export function Board({ currentPosition, teamId }: BoardProps) {
  const getPosition = (num: number) => {
    const row = Math.floor((num - 1) / BOARD_SIZE)
    const col = (num - 1) % BOARD_SIZE
    const isEvenRow = row % 2 === 0

    return {
      x: isEvenRow ? col : BOARD_SIZE - 1 - col,
      y: BOARD_SIZE - 1 - row,
    }
  }

  const tiles = Array.from({ length: 100 }, (_, i) => i + 1)

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <h3 className="text-lg font-semibold mb-4">Game Board</h3>

      <div className="relative aspect-square w-full max-w-2xl mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Grid */}
          {tiles.map((num) => {
            const pos = getPosition(num)
            const isSnakeTile = SNAKE_TILES.includes(num)
            const isCurrentPosition = currentPosition === num

            return (
              <g key={num}>
                <rect
                  x={pos.x * 10}
                  y={pos.y * 10}
                  width={10}
                  height={10}
                  fill={isSnakeTile ? "oklch(0.55 0.22 25 / 0.15)" : "oklch(0.25 0.015 250)"}
                  stroke={isSnakeTile ? "oklch(0.55 0.22 25 / 0.4)" : "oklch(0.35 0.015 250)"}
                  strokeWidth={isSnakeTile ? 0.3 : 0.1}
                />
                <text
                  x={pos.x * 10 + 5}
                  y={pos.y * 10 + 3.5}
                  fontSize={2}
                  fill="oklch(0.65 0.01 250)"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {num}
                </text>
                {isSnakeTile && (
                  <text
                    x={pos.x * 10 + 5}
                    y={pos.y * 10 + 7.5}
                    fontSize={3}
                    fill="oklch(0.55 0.22 25)"
                    textAnchor="middle"
                  >
                    ⚠
                  </text>
                )}
              </g>
            )
          })}

          {/* Current position with pulsing animation */}
          <motion.circle
            cx={getPosition(currentPosition).x * 10 + 5}
            cy={getPosition(currentPosition).y * 10 + 5}
            r={2}
            fill="oklch(0.65 0.20 280)"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1 }}
          />

          {SNAKE_TILES.includes(currentPosition) && (
            <motion.circle
              cx={getPosition(currentPosition).x * 10 + 5}
              cy={getPosition(currentPosition).y * 10 + 5}
              r={3}
              fill="none"
              stroke="oklch(0.55 0.22 25)"
              strokeWidth={0.5}
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            />
          )}
        </svg>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-muted">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{teamId}</span> is at position{" "}
          <span className="font-semibold text-primary">{currentPosition}</span>
          {SNAKE_TILES.includes(currentPosition) && (
            <span className="ml-2 text-danger font-semibold">⚠ Danger Zone!</span>
          )}
        </p>
      </div>
    </div>
  )
}
