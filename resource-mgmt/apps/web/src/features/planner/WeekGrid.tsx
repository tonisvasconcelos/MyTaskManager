import { DayColumn } from './DayColumn'
import { getWeekDays } from './utils/date'
import type { WorkBlock } from '../../shared/types/api'

interface TimeZoneConfig {
  label: string
  timeZone: string
}

interface WeekGridProps {
  currentWeek: Date
  blocks: WorkBlock[]
  startHour: number
  endHour: number
  hourHeight: number
  timeZones?: TimeZoneConfig[]
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
  timeZones = [
    { label: 'Local', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { label: 'BR', timeZone: 'America/Sao_Paulo' },
  ],
  onBlockClick,
  onBlockDragStart,
  onBlockResizeStart,
  onEmptyClick,
}: WeekGridProps) {
  const weekDays = getWeekDays(currentWeek)

  // Generate time labels for each timezone
  const timeFormatter = (timeZone: string) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
      timeZone,
    })
  }

  const timeLabels = Array.from({ length: endHour - startHour }, (_, i) => {
    const hour = startHour + i
    const date = new Date()
    date.setHours(hour, 0, 0, 0)
    return timeZones.map((tz) => ({
      label: timeFormatter(tz.timeZone).format(date).replace(':00', ''),
      timeZone: tz.label,
    }))
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

  const gutterWidth = timeZones.length * 50 + 20 // 50px per timezone column + padding

  return (
    <div className="flex border border-border rounded-md overflow-hidden bg-surface relative">
      {/* Time Gutter - Sticky */}
      <div className="sticky left-0 z-30 bg-surface border-r border-border flex-shrink-0" style={{ width: `${gutterWidth}px` }}>
        {/* Timezone header */}
        <div
          className="sticky top-0 z-20 bg-surface border-b border-border flex"
          style={{ height: '60px' }}
        >
          {timeZones.map((tz) => (
            <div
              key={tz.timeZone}
              className="flex-1 text-xs text-text-secondary text-center border-r border-border last:border-r-0 flex items-center justify-center"
            >
              {tz.label}
            </div>
          ))}
        </div>
        <div className="relative" style={{ height: `${(endHour - startHour) * hourHeight}px` }}>
          {timeLabels.map((labels, i) => (
            <div
              key={i}
              className="absolute flex"
              style={{
                top: `${i * hourHeight - 8}px`,
                left: '4px',
                right: '4px',
              }}
            >
              {labels.map((label) => (
                <div
                  key={label.timeZone}
                  className="flex-1 text-xs text-text-secondary text-center border-r border-border/30 last:border-r-0"
                >
                  {label.label}
                </div>
              ))}
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
            left: `${gutterWidth}px`,
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
