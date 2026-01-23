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
    <div className="rounded-lg bg-white border border-gray-200 p-4 sm:p-6 shadow-sm">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">All Teams (Positions)</h3>

      <ScrollArea className="h-48 sm:h-64">
        <div className="space-y-2">
          {teams.map((team, idx) => (
            <div
              key={team.id}
              className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="text-[10px] sm:text-xs font-mono text-gray-600 w-6 sm:w-8 flex-shrink-0">#{idx + 1}</span>
                <span className="font-mono text-xs sm:text-sm truncate text-gray-900">{team.id}</span>
              </div>
              <span className="font-semibold text-blue-600 text-xs sm:text-sm whitespace-nowrap">Pos {team.position}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
