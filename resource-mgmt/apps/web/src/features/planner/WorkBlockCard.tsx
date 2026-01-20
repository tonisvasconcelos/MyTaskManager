import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import type { WorkBlock } from '../../shared/types/api'
import { formatTime } from './utils/date'
import { parseISO } from 'date-fns'

interface WorkBlockCardProps {
  block: WorkBlock
  lane: number
  totalLanes: number
  onClick: () => void
  onDragStart?: (e: React.PointerEvent) => void
  onResizeStart?: (e: React.PointerEvent, side: 'top' | 'bottom') => void
  style?: React.CSSProperties
}

export function WorkBlockCard({
  block,
  lane,
  totalLanes,
  onClick,
  onDragStart,
  onResizeStart,
  style,
}: WorkBlockCardProps) {
  const { t } = useTranslation()

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Meeting':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-300'
      case 'Focus':
        return 'bg-purple-500/20 border-purple-500/50 text-purple-300'
      case 'Admin':
        return 'bg-gray-500/20 border-gray-500/50 text-gray-300'
      case 'Break':
        return 'bg-green-500/20 border-green-500/50 text-green-300'
      default:
        return 'bg-accent/20 border-accent/50 text-accent'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'success'
      case 'Completed':
        return 'success'
      case 'Cancelled':
        return 'danger'
      default:
        return 'default'
    }
  }

  const width = totalLanes > 1 ? `${100 / totalLanes}%` : '100%'
  const left = totalLanes > 1 ? `${(lane / totalLanes) * 100}%` : '0%'

  return (
    <div
      className={`absolute border rounded-md p-2 cursor-move hover:shadow-lg transition-all ${getTypeColor(block.type)}`}
      style={{
        ...style,
        width,
        left,
        zIndex: 10 + lane,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (onDragStart) {
          onDragStart(e)
        }
      }}
    >
      {/* Resize handle - top */}
      {onResizeStart && (
        <div
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 rounded-t-md z-10"
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizeStart(e, 'top')
          }}
        />
      )}

      <div className="flex flex-col gap-1 text-xs">
        <div className="font-semibold truncate">{block.title}</div>
        <div className="text-text-secondary/80">
          {formatTime(block.startAt)} - {formatTime(block.endAt)}
        </div>
        {block.project && (
          <Badge variant="default" className="text-xs py-0 px-1">
            {block.project.name}
          </Badge>
        )}
        {block.task && (
          <Badge variant="info" className="text-xs py-0 px-1">
            {block.task.title}
          </Badge>
        )}
        <Badge variant={getStatusColor(block.status)} className="text-xs py-0 px-1">
          {t(`planner.statuses.${block.status.toLowerCase()}`)}
        </Badge>
      </div>

      {/* Resize handle - bottom */}
      {onResizeStart && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 rounded-b-md z-10"
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizeStart(e, 'bottom')
          }}
        />
      )}
    </div>
  )
}
