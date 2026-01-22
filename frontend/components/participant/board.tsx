"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface BoardProps {
  currentPosition: number
  teamId: string
}

const BOARD_COLS = 15
const BOARD_ROWS = 10

export function Board({ currentPosition, teamId }: BoardProps) {
  // Default snake positions if no map assigned
  const [snakeTiles, setSnakeTiles] = useState<number[]>([98, 95, 93, 87, 64, 62, 54, 17])
  const [loading, setLoading] = useState(true)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  useEffect(() => {
    const fetchBoardState = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`${API_URL}/participant/board`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (res.ok) {
          const data = await res.json()
          console.log("Board data received:", data)
          if (data.data && Array.isArray(data.data.snakes)) {
            console.log("Snake positions:", data.data.snakes)
            setSnakeTiles(data.data.snakes)
          } else {
            console.log("No snake data or wrong format:", data)
          }
        } else {
          // If unauthorized or other error, use default snake positions
          console.log("Using default snake positions (board fetch failed with status:", res.status, ")")
        }
      } catch (error) {
        console.error("Error fetching board state:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchBoardState()
  }, [API_URL])

  const getPosition = (num: number) => {
    const row = Math.floor((num - 1) / BOARD_COLS)
    const col = (num - 1) % BOARD_COLS
    const isEvenRow = row % 2 === 0

    return {
      x: isEvenRow ? col : BOARD_COLS - 1 - col,
      y: BOARD_ROWS - 1 - row,
    }
  }

  const tiles = Array.from({ length: 150 }, (_, i) => i + 1)

  return (
    <div className="rounded-lg bg-white border border-gray-200 p-4 sm:p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Game Board</h3>

      <div className="relative w-full max-w-4xl mx-auto overflow-x-auto">
        <svg viewBox="0 0 150 100" className="w-full h-full min-w-[300px]">
          {/* Grid */}
          {tiles.map((num) => {
            const pos = getPosition(num)
            const isSnakeTile = snakeTiles.includes(num)
            const isCurrentPosition = currentPosition === num

            return (
              <g key={num}>
                <rect
                  x={pos.x * 10}
                  y={pos.y * 10}
                  width={10}
                  height={10}
                  fill={isSnakeTile ? "#fee" : num === 1 ? "#d4f5d4" : num === 150 ? "#90EE90" : "#fff"}
                  stroke="#ccc"
                  strokeWidth={0.2}
                />
                <text
                  x={pos.x * 10 + 5}
                  y={pos.y * 10 + 6}
                  fontSize={2.5}
                  fill="#000"
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  fontWeight="bold"
                >
                  {num}
                </text>
                {isSnakeTile && (
                  <text
                    x={pos.x * 10 + 5}
                    y={pos.y * 10 + 3}
                    fontSize={4.5}
                    fill="#dc2626"
                    textAnchor="middle"
                  >
                    🐍
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

          {snakeTiles.includes(currentPosition) && (
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

      <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-sm text-gray-700">
          <span className="font-bold text-gray-900">{teamId}</span> is at position{" "}
          <span className="font-bold text-blue-600">{currentPosition}</span>
          {snakeTiles.includes(currentPosition) && (
            <span className="ml-2 text-red-600 font-bold">⚠ Danger Zone!</span>
          )}
        </p>
      </div>
    </div>
  )
}
