import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  teamId: string
}

export function Header({ teamId }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">S&L</span>
          </div>
          <span className="font-semibold text-lg">Snake & Ladder — Tech Quest</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary">
            <span className="text-sm text-muted-foreground">Team:</span>
            <span className="font-mono font-semibold">{teamId}</span>
          </div>

          <Button variant="ghost" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
