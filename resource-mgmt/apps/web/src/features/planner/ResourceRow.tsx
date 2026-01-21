import type { WorkBlock, User } from '../../shared/types/api'
import { DayCell } from './DayCell'
import { getDurationMinutes, formatDurationHours } from './utils/duration'

interface ResourceRowProps {
  user: Pick<User, 'id' | 'fullName' | 'email'>
  weekDayKeys: string[]
  blocksByDay: Record<string, WorkBlock[]>
  isDraggingBlockId?: string | null
  onBlockClick: (block: WorkBlock) => void
  onBlockPointerDown?: (block: WorkBlock, e: React.PointerEvent) => void
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
  return (first + last).toUpperCase() || 'U'
}

export function ResourceRow({
  user,
  weekDayKeys,
  blocksByDay,
  isDraggingBlockId,
  onBlockClick,
  onBlockPointerDown,
}: ResourceRowProps) {
  const weeklyMinutes = weekDayKeys.reduce(
    (sum, dayKey) => sum + (blocksByDay[dayKey] || []).reduce((s, b) => s + getDurationMinutes(b.startAt, b.endAt), 0),
    0
  )

  return (
    <>
      <div className="sticky left-0 z-10 bg-surface border-r border-border p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-semibold text-text-secondary">
          {initials(user.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-text-primary truncate">{user.fullName}</div>
          <div className="text-xs text-text-secondary truncate">{formatDurationHours(weeklyMinutes)}h / week</div>
        </div>
      </div>

      {weekDayKeys.map((dayKey) => (
        <div key={dayKey} className="border-r border-border min-h-[140px]">
          <DayCell
            dayKey={dayKey}
            blocks={blocksByDay[dayKey] || []}
            isDraggingBlockId={isDraggingBlockId}
            onBlockClick={onBlockClick}
            onBlockPointerDown={onBlockPointerDown}
          />
        </div>
      ))}
    </>
  )
}

