import { ScrollArea } from "@/components/ui/scroll-area"

interface Team {
  id: string
  position: number
}

interface TeamsListProps {
  teams: Team[]
}

export function TeamsList({ teams }: TeamsListProps) {
  return (
    <div className="rounded-xl sm:rounded-2xl bg-card border border-border p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">All Teams (Positions)</h3>

      <ScrollArea className="h-48 sm:h-64">
        <div className="space-y-2">
          {teams.map((team, idx) => (
            <div
              key={team.id}
              className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="text-[10px] sm:text-xs font-mono text-muted-foreground w-6 sm:w-8 flex-shrink-0">#{idx + 1}</span>
                <span className="font-mono text-xs sm:text-sm truncate">{team.id}</span>
              </div>
              <span className="font-semibold text-primary text-xs sm:text-sm whitespace-nowrap">Pos {team.position}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
