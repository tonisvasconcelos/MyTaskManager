import { format } from 'date-fns'
import { WorkBlockCard } from './WorkBlockCard'
import { computeLanes } from './utils/layout'
import { getTimePosition, getBlockHeight, createDateTime } from './utils/date'
import type { WorkBlock } from '../../shared/types/api'

interface DayColumnProps {
  date: Date
  blocks: WorkBlock[]
  startHour: number
  endHour: number
  hourHeight: number
  onBlockClick: (block: WorkBlock) => void
  onBlockDragStart?: (block: WorkBlock, e: React.PointerEvent) => void
  onBlockResizeStart?: (block: WorkBlock, e: React.PointerEvent, side: 'top' | 'bottom') => void
  onEmptyClick?: (date: Date, hour: number, minutes: number) => void
}

export function DayColumn({
  date,
  blocks,
  startHour,
  endHour,
  hourHeight,
  onBlockClick,
  onBlockDragStart,
  onBlockResizeStart,
  onEmptyClick,
}: DayColumnProps) {
  const dayBlocks = blocks.filter((block) => {
    const blockDate = new Date(block.startAt)
    return (
      blockDate.getFullYear() === date.getFullYear() &&
      blockDate.getMonth() === date.getMonth() &&
      blockDate.getDate() === date.getDate()
    )
  })

  const lanes = computeLanes(dayBlocks)

  const handleEmptyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onEmptyClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const totalMinutes = (y / hourHeight) * 60
    const hours = Math.floor(totalMinutes / 60) + startHour
    const minutes = Math.floor(totalMinutes % 60)
    const roundedMinutes = Math.round(minutes / 15) * 15
    const clickDate = createDateTime(date, hours, roundedMinutes)
    onEmptyClick(clickDate, hours, roundedMinutes)
  }

  return (
    <div className="flex flex-col border-r-2 border-border flex-1 min-w-0">
      {/* Day Header - Sticky - Outlook style */}
      <div className="sticky top-0 z-20 bg-surface border-b-2 border-border p-2 text-center">
        <div className="text-2xl font-semibold text-text-primary leading-none">{format(date, 'd')}</div>
        <div className="text-xs text-text-secondary mt-1 uppercase">{format(date, 'EEE')}</div>
      </div>

      {/* Day Content - Scrollable */}
      <div
        className="relative flex-1 min-h-0 cursor-pointer"
        style={{ height: `${(endHour - startHour) * hourHeight}px` }}
        onClick={handleEmptyClick}
      >
        {/* Time slots background - Hour lines (solid) and half-hour lines (dashed) */}
        {Array.from({ length: endHour - startHour }, (_, i) => {
          const hourTop = i * hourHeight
          return (
            <div key={i}>
              {/* Hour line - solid */}
              <div
                className="absolute border-b border-border/40"
                style={{
                  top: `${hourTop}px`,
                  left: 0,
                  right: 0,
                  height: '1px',
                }}
              />
              {/* Half-hour line - dashed */}
              <div
                className="absolute border-b border-border/20 border-dashed"
                style={{
                  top: `${hourTop + hourHeight / 2}px`,
                  left: 0,
                  right: 0,
                  height: '1px',
                }}
              />
            </div>
          )
        })}

        {/* Blocks */}
        {lanes.map(({ block, lane, totalLanes }) => {
          const startDate = new Date(block.startAt)
          const endDate = new Date(block.endAt)
          const top = getTimePosition(startDate, startHour, endHour, hourHeight)
          const height = getBlockHeight(startDate, endDate, hourHeight)

          return (
            <WorkBlockCard
              key={block.id}
              block={block}
              lane={lane}
              totalLanes={totalLanes}
              onClick={() => onBlockClick(block)}
              onDragStart={onBlockDragStart ? (e) => onBlockDragStart(block, e) : undefined}
              onResizeStart={onBlockResizeStart ? (e, side) => onBlockResizeStart(block, e, side) : undefined}
              style={{
                top: `${top}px`,
                height: `${Math.max(height, 40)}px`, // Minimum height
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
