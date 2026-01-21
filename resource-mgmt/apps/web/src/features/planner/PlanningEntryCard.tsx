import type { WorkBlock } from '../../shared/types/api'
import { formatTime } from './utils/date'
import { getDurationMinutes } from './utils/duration'

interface PlanningEntryCardProps {
  block: WorkBlock
  color: string
  heightPx: number
  isDragging?: boolean
  onClick: () => void
  onPointerDown?: (e: React.PointerEvent) => void
}

function importanceLabel(importance: WorkBlock['importance']): string {
  switch (importance) {
    case 'High':
      return 'H'
    case 'Medium':
      return 'M'
    case 'Low':
      return 'L'
    default:
      return ''
  }
}

export function PlanningEntryCard({ block, color, heightPx, isDragging, onClick, onPointerDown }: PlanningEntryCardProps) {
  const durationMin = getDurationMinutes(block.startAt, block.endAt)

  const secondaryBits: string[] = []
  if (block.project?.name) secondaryBits.push(block.project.name)
  if (block.task?.title) secondaryBits.push(block.task.title)
  const secondary = secondaryBits.join(' • ')

  return (
    <div
      className="relative rounded-sm border overflow-hidden cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-shadow"
      style={{
        height: `${heightPx}px`,
        borderColor: `${color}55`,
        backgroundColor: `${color}14`,
        opacity: isDragging ? 0.75 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        onPointerDown?.(e)
      }}
      title={`${formatTime(block.startAt)}–${formatTime(block.endAt)} • ${durationMin}m`}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
      <div className="h-full pl-3 pr-2 py-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-xs text-text-primary truncate leading-tight">
            {block.title}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/40 text-text-secondary bg-surface/50">
              {importanceLabel(block.importance)}
            </span>
            <span className="text-[10px] text-text-secondary">{formatDurationMinutes(durationMin)}</span>
          </div>
        </div>

        {secondary && (
          <div className="text-[10px] text-text-secondary/80 truncate leading-tight mt-0.5">
            {secondary}
          </div>
        )}

        {block.description && (
          <div className="text-[10px] text-text-secondary/70 line-clamp-2 leading-tight mt-0.5">
            {block.description}
          </div>
        )}

        <div className="mt-auto text-[10px] text-text-secondary/60">
          {formatTime(block.startAt)}–{formatTime(block.endAt)}
        </div>
      </div>
    </div>
  )
}

function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return '0m'
  if (minutes % 60 === 0) return `${minutes / 60}h`
  if (minutes > 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m}m`
  }
  return `${minutes}m`
}

