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
    <div className="rounded-2xl bg-card border border-border p-6">
      <h3 className="text-lg font-semibold mb-4">All Teams (Positions)</h3>

      <ScrollArea className="h-64">
        <div className="space-y-2">
          {teams.map((team, idx) => (
            <div
              key={team.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-8">#{idx + 1}</span>
                <span className="font-mono text-sm">{team.id}</span>
              </div>
              <span className="font-semibold text-primary">Pos {team.position}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
