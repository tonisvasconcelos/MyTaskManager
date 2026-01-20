import { useTranslation } from 'react-i18next'
import type { WorkBlock } from '../../shared/types/api'
import { formatTime } from './utils/date'

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

  const getTypeColor = (type: string, customColor?: string | null) => {
    if (customColor) {
      return customColor
    }
    switch (type) {
      case 'Meeting':
        return '#3b82f6' // blue-500
      case 'Focus':
        return '#a855f7' // purple-500
      case 'Admin':
        return '#6b7280' // gray-500
      case 'Break':
        return '#10b981' // green-500
      default:
        return '#f59e0b' // amber-500 (accent)
    }
  }

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return '✓'
      case 'Completed':
        return '✓'
      case 'Cancelled':
        return '✕'
      default:
        return null
    }
  }

  const stripeColor = getTypeColor(block.type, block.color)
  const statusIcon = getStatusIndicator(block.status)

  const width = totalLanes > 1 ? `${100 / totalLanes}%` : '100%'
  const left = totalLanes > 1 ? `${(lane / totalLanes) * 100}%` : '0%'

  // Build secondary info line (project/task/user)
  const secondaryInfo = []
  if (block.project) {
    secondaryInfo.push(block.project.name)
  }
  if (block.task) {
    secondaryInfo.push(block.task.title)
  }
  if (block.user) {
    secondaryInfo.push(block.user.fullName)
  }
  const secondaryText = secondaryInfo.join(' • ')

  return (
    <div
      className="absolute rounded-sm cursor-move hover:shadow-md transition-all overflow-hidden"
      style={{
        ...style,
        width,
        left,
        zIndex: 10 + lane,
        backgroundColor: `${stripeColor}20`, // 20% opacity
        borderLeft: `3px solid ${stripeColor}`,
        borderRight: `1px solid ${stripeColor}40`,
        borderTop: `1px solid ${stripeColor}40`,
        borderBottom: `1px solid ${stripeColor}40`,
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
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 z-10"
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizeStart(e, 'top')
          }}
        />
      )}

      <div className="flex flex-col px-2 py-1 text-xs h-full">
        {/* Title - prominent */}
        <div className="font-semibold text-text-primary truncate leading-tight mb-0.5">
          {block.title}
        </div>
        
        {/* Secondary info - compact single line */}
        {secondaryText && (
          <div className="text-text-secondary/70 text-[10px] truncate leading-tight mb-0.5">
            {secondaryText}
          </div>
        )}

        {/* Time and status indicator */}
        <div className="flex items-center justify-between mt-auto">
          <div className="text-text-secondary/60 text-[10px]">
            {formatTime(block.startAt)} - {formatTime(block.endAt)}
          </div>
          {statusIcon && (
            <div
              className="text-[10px] leading-none"
              style={{ color: stripeColor }}
              title={t(`planner.statuses.${block.status.toLowerCase()}`)}
            >
              {statusIcon}
            </div>
          )}
        </div>
      </div>

      {/* Resize handle - bottom */}
      {onResizeStart && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 z-10"
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizeStart(e, 'bottom')
          }}
        />
      )}
    </div>
  )
}
