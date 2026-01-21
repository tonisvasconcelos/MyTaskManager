import { format } from 'date-fns'
import type { User, WorkBlock } from '../../shared/types/api'
import { getWeekDays } from './utils/date'
import { getDurationMinutes, formatDurationHours } from './utils/duration'
import { ResourceRow } from './ResourceRow'

interface CapacityWeekGridProps {
  currentWeek: Date
  users: Array<Pick<User, 'id' | 'fullName' | 'email'>>
  blocks: WorkBlock[]
  isDraggingBlockId?: string | null
  onBlockClick: (block: WorkBlock) => void
  onBlockPointerDown?: (block: WorkBlock, e: React.PointerEvent) => void
}

function toDayKey(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function CapacityWeekGrid({
  currentWeek,
  users,
  blocks,
  isDraggingBlockId,
  onBlockClick,
  onBlockPointerDown,
}: CapacityWeekGridProps) {
  const weekDays = getWeekDays(currentWeek)
  const weekDayKeys = weekDays.map(toDayKey)

  const blocksByUserId: Record<string, WorkBlock[]> = {}
  for (const b of blocks) {
    if (!blocksByUserId[b.userId]) blocksByUserId[b.userId] = []
    blocksByUserId[b.userId].push(b)
  }

  const totalsPerDay: Record<string, number> = {}
  for (const dayKey of weekDayKeys) totalsPerDay[dayKey] = 0
  for (const b of blocks) {
    const day = toDayKey(new Date(b.startAt))
    if (totalsPerDay[day] !== undefined) {
      totalsPerDay[day] += getDurationMinutes(b.startAt, b.endAt)
    }
  }

  return (
    <div className="relative overflow-x-auto border border-border rounded-md bg-surface" data-capacity-week-grid>
      <div
        className="grid min-w-[1040px]"
        data-capacity-grid-inner
        style={{
          gridTemplateColumns: '260px repeat(7, minmax(160px, 1fr))',
        }}
      >
        {/* Header row */}
        <div className="sticky top-0 left-0 z-30 bg-surface border-b border-r border-border p-3">
          <div className="text-xs text-text-secondary">Resource</div>
        </div>
        {weekDays.map((day) => {
          const dayKey = toDayKey(day)
          return (
            <div key={dayKey} className="sticky top-0 z-20 bg-surface border-b border-r border-border p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary leading-none">
                    {format(day, 'd')}
                  </div>
                  <div className="text-[10px] text-text-secondary uppercase mt-0.5">
                    {format(day, 'EEE')}
                  </div>
                </div>
                <div className="text-xs font-semibold text-text-primary">
                  {formatDurationHours(totalsPerDay[dayKey] || 0)}h
                </div>
              </div>
            </div>
          )
        })}

        {/* Rows */}
        {users.map((u) => {
          const userBlocks = blocksByUserId[u.id] || []
          const blocksByDay: Record<string, WorkBlock[]> = {}
          for (const dayKey of weekDayKeys) blocksByDay[dayKey] = []
          for (const b of userBlocks) {
            const dayKey = toDayKey(new Date(b.startAt))
            if (blocksByDay[dayKey]) blocksByDay[dayKey].push(b)
          }
          // Keep stable ordering within each day (by start time)
          for (const dayKey of weekDayKeys) {
            blocksByDay[dayKey].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
          }

          return (
            <ResourceRow
              key={u.id}
              user={u}
              weekDayKeys={weekDayKeys}
              blocksByDay={blocksByDay}
              isDraggingBlockId={isDraggingBlockId}
              onBlockClick={onBlockClick}
              onBlockPointerDown={onBlockPointerDown}
            />
          )
        })}
      </div>
    </div>
  )
}

