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
const HEADER_HEIGHT = 60 // px (must match WeekGrid header height)

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
  const [previewOverrides, setPreviewOverrides] = useState<Record<string, { startAt: string; endAt: string }>>({})

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

  const timeZones = [
    { label: 'Local', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { label: 'BR', timeZone: 'America/Sao_Paulo' },
  ]
  const timeGutterWidth = timeZones.length * 50 + 20 // keep in sync with WeekGrid gutter width

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

  const computeDragTarget = useCallback(
    (clientX: number, clientY: number, block: WorkBlock) => {
      const gridElement = document.querySelector('[data-week-grid]') as HTMLElement | null
      if (!gridElement) return null

      const rect = gridElement.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top

      const weekColumnsWidth = rect.width - timeGutterWidth
      const dayWidth = weekColumnsWidth / 7
      const dayIndex = Math.max(0, Math.min(6, Math.floor((x - timeGutterWidth) / dayWidth)))

      const startOfWeek = getWeekRange(currentWeek).start
      const targetDay = new Date(startOfWeek.getTime() + dayIndex * 24 * 60 * 60 * 1000)

      const gridMinutes = (END_HOUR - START_HOUR) * 60
      const clampedY = Math.max(0, Math.min((END_HOUR - START_HOUR) * HOUR_HEIGHT, y - HEADER_HEIGHT))
      const rawMinutesFromStart = (clampedY / HOUR_HEIGHT) * 60
      const snappedMinutesFromStart = Math.round(rawMinutesFromStart / SNAP_INTERVAL) * SNAP_INTERVAL

      const originalStart = new Date(block.startAt)
      const originalEnd = new Date(block.endAt)
      const durationMinutes = Math.max(SNAP_INTERVAL, Math.round((originalEnd.getTime() - originalStart.getTime()) / 60000))

      const maxStartMinutes = Math.max(0, gridMinutes - durationMinutes)
      const boundedStartMinutes = Math.max(0, Math.min(maxStartMinutes, snappedMinutesFromStart))

      const targetHours = Math.floor(boundedStartMinutes / 60)
      const targetMins = boundedStartMinutes % 60

      const newStart = new Date(targetDay)
      newStart.setHours(START_HOUR + targetHours, targetMins, 0, 0)
      const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000)

      return { newStart, newEnd }
    },
    [currentWeek, timeGutterWidth]
  )

  // Resize functionality
  const handleResizeMove = useCallback(
    (e: PointerEvent) => {
      if (!resizingBlock || !dragStartPos.current) return

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

      setPreviewOverrides((prev) => ({
        ...prev,
        [resizingBlock.block.id]: { startAt: newStart.toISOString(), endAt: newEnd.toISOString() },
      }))
    },
    [resizingBlock]
  )

  const handleResizeEnd = useCallback(
    async (_e: PointerEvent) => {
      if (!resizingBlock || !dragStartPos.current) {
        setResizingBlock(null)
        dragStartPos.current = null
        return
      }

      const preview = previewOverrides[resizingBlock.block.id]
      const newStart = preview ? new Date(preview.startAt) : new Date(resizingBlock.block.startAt)
      const newEnd = preview ? new Date(preview.endAt) : new Date(resizingBlock.block.endAt)

      await updateMutation.mutateAsync({
        id: resizingBlock.block.id,
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      })

      setResizingBlock(null)
      dragStartPos.current = null
      setPreviewOverrides((prev) => {
        const next = { ...prev }
        delete next[resizingBlock.block.id]
        return next
      })
    },
    [previewOverrides, resizingBlock, updateMutation]
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
    (e: PointerEvent) => {
      if (!draggingBlock) return
      const target = computeDragTarget(e.clientX, e.clientY, draggingBlock)
      if (!target) return
      setPreviewOverrides((prev) => ({
        ...prev,
        [draggingBlock.id]: { startAt: target.newStart.toISOString(), endAt: target.newEnd.toISOString() },
      }))
    },
    [computeDragTarget, draggingBlock]
  )

  const handlePointerUp = useCallback(
    async (e: PointerEvent) => {
      if (!draggingBlock || !dragStartPos.current) {
        setDraggingBlock(null)
        dragStartPos.current = null
        return
      }

      const preview = previewOverrides[draggingBlock.id]
      const target = preview
        ? { newStart: new Date(preview.startAt), newEnd: new Date(preview.endAt) }
        : computeDragTarget(e.clientX, e.clientY, draggingBlock)

      if (!target) {
        setDraggingBlock(null)
        dragStartPos.current = null
        return
      }

      // Update block
      await updateMutation.mutateAsync({
        id: draggingBlock.id,
        startAt: target.newStart.toISOString(),
        endAt: target.newEnd.toISOString(),
      })

      setDraggingBlock(null)
      dragStartPos.current = null
      setPreviewOverrides((prev) => {
        const next = { ...prev }
        delete next[draggingBlock.id]
        return next
      })
    },
    [computeDragTarget, draggingBlock, previewOverrides, updateMutation]
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

  const displayBlocks = blocks.map((b) => (previewOverrides[b.id] ? { ...b, ...previewOverrides[b.id] } : b))

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
        <div data-week-grid data-header-height={HEADER_HEIGHT} data-gutter-width={timeGutterWidth} className="relative">
          {blocksLoading ? (
            <Skeleton className="h-96" />
          ) : displayBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-text-secondary mb-4">{t('planner.emptyState')}</p>
            </div>
          ) : (
            <WeekGrid
              currentWeek={currentWeek}
              blocks={displayBlocks}
              startHour={START_HOUR}
              endHour={END_HOUR}
              hourHeight={HOUR_HEIGHT}
              timeZones={timeZones}
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
