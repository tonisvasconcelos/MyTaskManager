import type { WorkBlock } from '../../shared/types/api'
import { getProjectColor } from './utils/colors'
import { getDurationMinutes, formatDurationHours } from './utils/duration'
import { PlanningEntryCard } from './PlanningEntryCard'

const PX_PER_HOUR = 28
const MIN_BLOCK_PX = 24

interface DayCellProps {
  dayKey: string
  blocks: WorkBlock[]
  isDraggingBlockId?: string | null
  onBlockClick: (block: WorkBlock) => void
  onBlockPointerDown?: (block: WorkBlock, e: React.PointerEvent) => void
}

export function DayCell({ dayKey: _dayKey, blocks, isDraggingBlockId, onBlockClick, onBlockPointerDown }: DayCellProps) {
  const totalMinutes = blocks.reduce((sum, b) => sum + getDurationMinutes(b.startAt, b.endAt), 0)

  return (
    <div className="h-full flex flex-col px-2 py-2">
      <div className="text-xs font-semibold text-text-primary mb-2">
        {formatDurationHours(totalMinutes)}h
      </div>

      <div className="flex flex-col gap-2 min-h-0">
        {blocks.map((block) => {
          const durationMin = getDurationMinutes(block.startAt, block.endAt)
          const heightPx = Math.max(MIN_BLOCK_PX, (durationMin / 60) * PX_PER_HOUR)
          const color = getProjectColor(block.projectId)
          return (
            <PlanningEntryCard
              key={block.id}
              block={block}
              color={color}
              heightPx={heightPx}
              isDragging={isDraggingBlockId === block.id}
              onClick={() => onBlockClick(block)}
              onPointerDown={onBlockPointerDown ? (e) => onBlockPointerDown(block, e) : undefined}
            />
          )
        })}

        {blocks.length === 0 && <div className="flex-1" />}
      </div>
    </div>
  )
}

