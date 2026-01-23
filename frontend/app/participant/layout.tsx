import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Participant Portal | Snakes & Ladders Tech Quest",
  description: "Interactive participant dashboard for the Snakes & Ladders Tech Quest game",
}

export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="participant min-h-screen bg-white text-gray-900">
      {children}
    </div>
  )
}
