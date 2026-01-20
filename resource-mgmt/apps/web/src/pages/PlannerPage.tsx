import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlannerBlocks, useCreatePlannerBlock, useUpdatePlannerBlock, useDeletePlannerBlock, usePlannerLookups } from '../shared/api/planner'
import { useUsers } from '../shared/api/users'
import { PlannerToolbar } from '../features/planner/PlannerToolbar'
import { WeekGrid } from '../features/planner/WeekGrid'
import { WorkBlockModal } from '../features/planner/WorkBlockModal'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { getWeekRange, roundToInterval, addMinutes, createDateTime } from '../features/planner/utils/date'
import type { WorkBlock } from '../shared/types/api'
import { getUserToken } from '../shared/api/client'


const START_HOUR = 6
const END_HOUR = 22
const HOUR_HEIGHT = 60 // pixels per hour
const SNAP_INTERVAL = 15 // minutes

export function PlannerPage() {
  const { t } = useTranslation()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [projectFilter, setProjectFilter] = useState('')
  const [taskFilter, setTaskFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [selectedBlock, setSelectedBlock] = useState<WorkBlock | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalDefaultStart, setModalDefaultStart] = useState<Date | undefined>()
  const [modalDefaultEnd, setModalDefaultEnd] = useState<Date | undefined>()

  // Drag and resize state
  const [draggingBlock, setDraggingBlock] = useState<WorkBlock | null>(null)
  const [resizingBlock, setResizingBlock] = useState<{ block: WorkBlock; side: 'top' | 'bottom' } | null>(null)
  const dragStartPos = useRef<{ x: number; y: number; startTime: Date } | null>(null)

  // Get user role from token (simple decode without library)
  const token = getUserToken()
  let userRole: 'Admin' | 'Manager' | 'Contributor' | 'SuperAdmin' = 'Contributor'
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userRole = payload.role || 'Contributor'
    } catch {
      // Fallback to Contributor
    }
  }
  const showUserFilter = userRole === 'Admin' || userRole === 'Manager'

  const weekRange = getWeekRange(currentWeek)
  const { data: blocks = [], isLoading: blocksLoading } = usePlannerBlocks({
    start: weekRange.start.toISOString(),
    end: weekRange.end.toISOString(),
    userId: userFilter || undefined,
    projectId: projectFilter || undefined,
    taskId: taskFilter || undefined,
    status: statusFilter || undefined,
  })

  const { data: lookups } = usePlannerLookups(projectFilter || undefined)
  const { data: users } = useUsers()

  const createMutation = useCreatePlannerBlock()
  const updateMutation = useUpdatePlannerBlock()
  const deleteMutation = useDeletePlannerBlock()

  const handleNewBlock = () => {
    setSelectedBlock(null)
    // Default to next half hour
    const now = new Date()
    const nextHalfHour = roundToInterval(addMinutes(now, 30), 30)
    setModalDefaultStart(nextHalfHour)
    setModalDefaultEnd(addMinutes(nextHalfHour, 60))
    setIsModalOpen(true)
  }

  const handleBlockClick = (block: WorkBlock) => {
    setSelectedBlock(block)
    setIsModalOpen(true)
  }

  const handleEmptyClick = (date: Date, hour: number, minutes: number) => {
    setSelectedBlock(null)
    const start = createDateTime(date, hour, minutes)
    const end = addMinutes(start, 60)
    setModalDefaultStart(start)
    setModalDefaultEnd(end)
    setIsModalOpen(true)
  }

  const handleSave = async (data: Partial<WorkBlock> & { id?: string }) => {
    if (data.id) {
      await updateMutation.mutateAsync({ id: data.id, ...data })
    } else {
      await createMutation.mutateAsync(data as any)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id)
  }

  // Resize functionality
  const handleResizeMove = useCallback(
    (_e: PointerEvent) => {
      // Track resize movement (will apply on end)
    },
    []
  )

  const handleResizeEnd = useCallback(
    async (e: PointerEvent) => {
      if (!resizingBlock || !dragStartPos.current) {
        setResizingBlock(null)
        dragStartPos.current = null
        return
      }

      const deltaY = e.clientY - dragStartPos.current.y
      const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60)
      const snappedMinutes = Math.round(deltaMinutes / SNAP_INTERVAL) * SNAP_INTERVAL

      const originalStart = new Date(resizingBlock.block.startAt)
      const originalEnd = new Date(resizingBlock.block.endAt)

      let newStart = originalStart
      let newEnd = originalEnd

      if (resizingBlock.side === 'top') {
        newStart = roundToInterval(addMinutes(originalStart, snappedMinutes), SNAP_INTERVAL)
        if (newStart >= originalEnd) {
          newStart = addMinutes(originalEnd, -SNAP_INTERVAL)
        }
      } else {
        newEnd = roundToInterval(addMinutes(originalEnd, snappedMinutes), SNAP_INTERVAL)
        if (newEnd <= originalStart) {
          newEnd = addMinutes(originalStart, SNAP_INTERVAL)
        }
      }

      await updateMutation.mutateAsync({
        id: resizingBlock.block.id,
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      })

      setResizingBlock(null)
      dragStartPos.current = null
    },
    [resizingBlock, updateMutation]
  )

  // Drag functionality
  const handleDragStart = useCallback((block: WorkBlock, e: React.PointerEvent) => {
    e.stopPropagation()
    setDraggingBlock(block)
    const startDate = new Date(block.startAt)
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      startTime: startDate,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (_e: PointerEvent) => {
      // Track drag movement (will apply on end)
    },
    []
  )

  const handlePointerUp = useCallback(
    async (e: PointerEvent) => {
      if (!draggingBlock || !dragStartPos.current) {
        setDraggingBlock(null)
        dragStartPos.current = null
        return
      }

      // Calculate new position
      const gridElement = document.querySelector('[data-week-grid]')
      if (!gridElement) {
        setDraggingBlock(null)
        dragStartPos.current = null
        return
      }

      const rect = gridElement.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Account for time gutter width (dynamic based on timezones: 2 timezones * 50px + 20px padding)
      const timeGutterWidth = 120
      const weekColumnsWidth = rect.width - timeGutterWidth
      const dayWidth = weekColumnsWidth / 7
      const dayIndex = Math.max(0, Math.min(6, Math.floor((x - timeGutterWidth) / dayWidth)))
      
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const start = getWeekRange(currentWeek).start
        return new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
      })
      const targetDay = weekDays[dayIndex]

      // Calculate time offset (account for header height ~60px)
      const headerHeight = 60
      const relativeY = y - headerHeight
      const hoursFromStart = relativeY / HOUR_HEIGHT
      const totalMinutes = hoursFromStart * 60
      const snappedTotalMinutes = Math.round(totalMinutes / SNAP_INTERVAL) * SNAP_INTERVAL
      const targetHours = Math.floor(snappedTotalMinutes / 60)
      const targetMins = snappedTotalMinutes % 60

      const originalStart = new Date(draggingBlock.startAt)
      const originalEnd = new Date(draggingBlock.endAt)
      const duration = originalEnd.getTime() - originalStart.getTime()

      // Calculate new start time on target day
      const targetDate = new Date(targetDay)
      targetDate.setHours(START_HOUR + targetHours, targetMins, 0, 0)
      const newStart = roundToInterval(targetDate, SNAP_INTERVAL)
      const newEnd = new Date(newStart.getTime() + duration)

      // Update block
      await updateMutation.mutateAsync({
        id: draggingBlock.id,
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      })

      setDraggingBlock(null)
      dragStartPos.current = null
    },
    [draggingBlock, currentWeek, updateMutation]
  )

  // Resize functionality
  const handleResizeStart = useCallback((block: WorkBlock, e: React.PointerEvent, side: 'top' | 'bottom') => {
    e.stopPropagation()
    setResizingBlock({ block, side })
    const startDate = side === 'top' ? new Date(block.startAt) : new Date(block.endAt)
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      startTime: startDate,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  // Attach global pointer event listeners
  useEffect(() => {
    if (!draggingBlock && !resizingBlock) return

    const handleMove = (e: PointerEvent) => {
      if (draggingBlock) {
        handlePointerMove(e)
      } else if (resizingBlock) {
        handleResizeMove(e)
      }
    }
    const handleUp = (e: PointerEvent) => {
      if (draggingBlock) {
        handlePointerUp(e).catch(console.error)
      } else if (resizingBlock) {
        handleResizeEnd(e).catch(console.error)
      }
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }
  }, [draggingBlock, resizingBlock, handlePointerMove, handlePointerUp, handleResizeMove, handleResizeEnd])

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-6 md:mb-8">{t('planner.title')}</h1>

      <PlannerToolbar
        currentWeek={currentWeek}
        onWeekChange={setCurrentWeek}
        onToday={() => setCurrentWeek(new Date())}
        projectFilter={projectFilter}
        taskFilter={taskFilter}
        statusFilter={statusFilter}
        userFilter={userFilter}
        onProjectFilterChange={setProjectFilter}
        onTaskFilterChange={setTaskFilter}
        onStatusFilterChange={setStatusFilter}
        onUserFilterChange={setUserFilter}
        onNewBlock={handleNewBlock}
        projects={lookups?.projects || []}
        tasks={lookups?.tasks || []}
        users={users || []}
        showUserFilter={showUserFilter}
      />

      <Card>
        <div data-week-grid className="relative">
          {blocksLoading ? (
            <Skeleton className="h-96" />
          ) : blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-text-secondary mb-4">{t('planner.emptyState')}</p>
            </div>
          ) : (
            <WeekGrid
              currentWeek={currentWeek}
              blocks={blocks}
              startHour={START_HOUR}
              endHour={END_HOUR}
              hourHeight={HOUR_HEIGHT}
              onBlockClick={handleBlockClick}
              onBlockDragStart={handleDragStart}
              onBlockResizeStart={handleResizeStart}
              onEmptyClick={handleEmptyClick}
            />
          )}
        </div>
      </Card>

      <WorkBlockModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedBlock(null)
        }}
        block={selectedBlock}
        onSave={handleSave}
        onDelete={selectedBlock ? handleDelete : undefined}
        projects={lookups?.projects || []}
        tasks={lookups?.tasks || []}
        defaultStart={modalDefaultStart}
        defaultEnd={modalDefaultEnd}
      />
    </div>
  )
}
