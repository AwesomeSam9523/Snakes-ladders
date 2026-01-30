"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Dice1Icon as DiceIcon } from "lucide-react"

interface DiceProps {
  onRoll: () => void
  canRoll: boolean
  isRolling: boolean
  lastValue?: number
}

export function Dice({ onRoll, canRoll, isRolling, lastValue }: DiceProps) {
  const [displayValue, setDisplayValue] = useState(lastValue || 6);
  const [intervalVar, setIntervalVar] = useState<NodeJS.Timeout | null>(null);

  // Update display value when lastValue changes (from API)
  useEffect(() => {
    if (lastValue) {
      if (intervalVar) clearInterval(intervalVar)
      setDisplayValue(lastValue)
    }
  }, [lastValue])

  const handleRoll = () => {
    onRoll()
    // Animate through random numbers while rolling
    const int = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1)
    }, 100)
    setIntervalVar(int);
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 p-4 sm:p-6 md:p-8 rounded-lg bg-white border border-gray-200 shadow-sm">
      <motion.div
        animate={isRolling ? { rotateX: 360, rotateY: 360 } : {}}
        transition={{ duration: 2, ease: "linear", repeat: Infinity }}
        className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl bg-linear-to-br from-gray-800 to-gray-900 shadow-2xl flex items-center justify-center"
      >
        <span className="text-5xl sm:text-5xl md:text-6xl font-bold text-white">{displayValue}</span>
      </motion.div>

      <Button onClick={handleRoll} disabled={!canRoll || isRolling} size="lg" className="w-full max-w-xs text-base sm:text-lg bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500">
        <DiceIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        {isRolling ? "Rolling..." : "Roll Dice"}
      </Button>

      {!canRoll && !isRolling && (
        <p className="text-xs sm:text-sm text-gray-600 text-center px-2">Complete your current checkpoint to roll again</p>
      )}
    </div>
  )
}
