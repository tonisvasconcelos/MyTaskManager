import { format } from 'date-fns'
import { DayColumn } from './DayColumn'
import { getWeekDays } from './utils/date'
import type { WorkBlock } from '../../shared/types/api'

interface WeekGridProps {
  currentWeek: Date
  blocks: WorkBlock[]
  startHour: number
  endHour: number
  hourHeight: number
  onBlockClick: (block: WorkBlock) => void
  onBlockDragStart?: (block: WorkBlock, e: React.PointerEvent) => void
  onBlockResizeStart?: (block: WorkBlock, e: React.PointerEvent, side: 'top' | 'bottom') => void
  onEmptyClick?: (date: Date, hour: number, minutes: number) => void
}

export function WeekGrid({
  currentWeek,
  blocks,
  startHour,
  endHour,
  hourHeight,
  onBlockClick,
  onBlockDragStart,
  onBlockResizeStart,
  onEmptyClick,
}: WeekGridProps) {
  const weekDays = getWeekDays(currentWeek)

  // Generate time labels
  const timeLabels = Array.from({ length: endHour - startHour }, (_, i) => {
    const hour = startHour + i
    return `${hour.toString().padStart(2, '0')}:00`
  })

  // Current time indicator
  const now = new Date()
  const isCurrentWeek = weekDays.some(
    (day) =>
      day.getFullYear() === now.getFullYear() &&
      day.getMonth() === now.getMonth() &&
      day.getDate() === now.getDate()
  )
  const currentTimePosition =
    isCurrentWeek && now.getHours() >= startHour && now.getHours() < endHour
      ? ((now.getHours() - startHour) * 60 + now.getMinutes()) * (hourHeight / 60)
      : null

  return (
    <div className="flex border border-border rounded-md overflow-hidden bg-surface relative">
      {/* Time Gutter - Sticky */}
      <div className="sticky left-0 z-30 bg-surface border-r border-border flex-shrink-0">
        <div
          className="sticky top-0 z-20 bg-surface border-b border-border"
          style={{ height: '60px' }}
        />
        <div className="relative" style={{ height: `${(endHour - startHour) * hourHeight}px` }}>
          {timeLabels.map((label, i) => (
            <div
              key={i}
              className="absolute text-xs text-text-secondary pr-2 text-right"
              style={{
                top: `${i * hourHeight - 8}px`,
                right: '4px',
                width: '80px',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Week Columns */}
      <div className="flex flex-1 overflow-x-auto min-w-0">
        {weekDays.map((day) => (
          <DayColumn
            key={day.toISOString()}
            date={day}
            blocks={blocks}
            startHour={startHour}
            endHour={endHour}
            hourHeight={hourHeight}
            onBlockClick={onBlockClick}
            onBlockDragStart={onBlockDragStart}
            onBlockResizeStart={onBlockResizeStart}
            onEmptyClick={onEmptyClick}
          />
        ))}
      </div>

      {/* Current Time Indicator */}
      {currentTimePosition !== null && (
        <div
          className="absolute left-0 right-0 z-40 pointer-events-none"
          style={{
            top: `${currentTimePosition + 60}px`, // 60px for header
            height: '2px',
            backgroundColor: '#ef4444',
            left: '80px',
          }}
        >
          <div
            className="absolute -left-2 -top-1 w-4 h-4 rounded-full bg-red-500 border-2 border-surface"
            style={{ left: '0px' }}
          />
        </div>
      )}
    </div>
  )
}
