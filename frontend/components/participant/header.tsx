"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface HeaderProps {
  teamId: string
}

export function Header({ teamId }: HeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userId")
    localStorage.removeItem("username")
    localStorage.removeItem("teamId")
    localStorage.removeItem("teamCode")
    localStorage.removeItem("teamName")
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Image
            src={HeaderLogo}
            alt={"Venom by IEEE CS"}
            width={200}
            height={100}
            className={"h-12"}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gray-100">
            <span className="text-xs sm:text-sm text-gray-600">Team:</span>
            <span className="font-mono font-semibold text-sm text-gray-900">{teamId}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2 sm:px-3 hover:bg-gray-100">
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
