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
  const [displayValue, setDisplayValue] = useState(lastValue || 6)

  // Update display value when lastValue changes (from API)
  useEffect(() => {
    if (lastValue) {
      setDisplayValue(lastValue)
    }
  }, [lastValue])

  const handleRoll = () => {
    onRoll()
    // Animate through random numbers while rolling
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1)
    }, 100)

    setTimeout(() => {
      clearInterval(interval)
      // Final value will be set by lastValue prop from API
    }, 1800)
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-card border border-border">
      <motion.div
        animate={isRolling ? { rotateX: 360, rotateY: 360 } : {}}
        transition={{ duration: 2, ease: "linear" }}
        className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent shadow-2xl flex items-center justify-center"
      >
        <span className="text-5xl sm:text-5xl md:text-6xl font-bold text-primary-foreground">{displayValue}</span>
      </motion.div>

      <Button onClick={handleRoll} disabled={!canRoll || isRolling} size="lg" className="w-full max-w-xs text-base sm:text-lg">
        <DiceIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        {isRolling ? "Rolling..." : "Roll Dice"}
      </Button>

      {!canRoll && !isRolling && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center px-2">Complete your current checkpoint to roll again</p>
      )}
    </div>
  )
}
