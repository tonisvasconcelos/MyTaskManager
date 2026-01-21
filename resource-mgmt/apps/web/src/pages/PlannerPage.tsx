import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlannerBlocks, useCreatePlannerBlock, useUpdatePlannerBlock, useDeletePlannerBlock, usePlannerLookups } from '../shared/api/planner'
import { useUsers } from '../shared/api/users'
import { PlannerToolbar } from '../features/planner/PlannerToolbar'
import { CapacityWeekGrid } from '../features/planner/CapacityWeekGrid'
import { WorkBlockModal } from '../features/planner/WorkBlockModal'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { getWeekRange, roundToInterval, addMinutes } from '../features/planner/utils/date'
import type { WorkBlock } from '../shared/types/api'
import { getUserToken } from '../shared/api/client'
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'

const RESOURCE_COL_WIDTH = 260 // keep in sync with CapacityWeekGrid

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
  const dragStartPos = useRef<{ x: number; y: number; startDay: Date } | null>(null)
  const dragDidMove = useRef(false)
  const [previewOverrides, setPreviewOverrides] = useState<Record<string, { startAt: string; endAt: string }>>({})

  // Get user role from token (simple decode without library)
  const token = getUserToken()
  let userRole: 'Admin' | 'Manager' | 'Contributor' | 'SuperAdmin' = 'Contributor'
  let currentUserId: string | undefined
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userRole = payload.role || 'Contributor'
      currentUserId = payload.userId
    } catch {
      // Fallback to Contributor
    }
  }
  const showUserFilter = userRole === 'Admin' || userRole === 'Manager'

  const weekRange = getWeekRange(currentWeek)
  const { data: blocks = [], isLoading: blocksLoading } = usePlannerBlocks({
    start: weekRange.start.toISOString(),
    end: weekRange.end.toISOString(),
    userId: showUserFilter ? (userFilter || undefined) : undefined,
    projectId: projectFilter || undefined,
    taskId: taskFilter || undefined,
    status: statusFilter || undefined,
  })

  const { data: lookups } = usePlannerLookups(projectFilter || undefined)
  const { data: users } = useUsers()

  const createMutation = useCreatePlannerBlock()
  const updateMutation = useUpdatePlannerBlock()
  const deleteMutation = useDeletePlannerBlock()

  const displayedUsers = useMemo(() => {
    if (!users) return []
    if (userRole === 'Contributor' && currentUserId) {
      return users.filter((u) => u.id === currentUserId)
    }
    if (showUserFilter && userFilter) {
      return users.filter((u) => u.id === userFilter)
    }
    return users
  }, [users, userRole, currentUserId, showUserFilter, userFilter])

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
    if (dragDidMove.current) {
      dragDidMove.current = false
      return
    }
    setSelectedBlock(block)
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
    (clientX: number, block: WorkBlock) => {
      const gridElement = document.querySelector('[data-capacity-week-grid]') as HTMLElement | null
      const inner = document.querySelector('[data-capacity-grid-inner]') as HTMLElement | null
      if (!gridElement || !inner) return null

      const rect = gridElement.getBoundingClientRect()
      const x = clientX - rect.left
      const contentX = x + gridElement.scrollLeft

      const totalWidth = inner.scrollWidth
      const dayWidth = (totalWidth - RESOURCE_COL_WIDTH) / 7
      const dayIndex = Math.max(0, Math.min(6, Math.floor((contentX - RESOURCE_COL_WIDTH) / dayWidth)))

      const targetDay = addDays(getWeekRange(currentWeek).start, dayIndex)

      const originalStart = new Date(block.startAt)
      const originalEnd = new Date(block.endAt)
      const deltaDays = differenceInCalendarDays(startOfDay(targetDay), startOfDay(originalStart))

      const newStart = addDays(originalStart, deltaDays)
      const newEnd = addDays(originalEnd, deltaDays)
      return { newStart, newEnd }
    },
    [currentWeek]
  )

  // Drag functionality
  const handleDragStart = useCallback((block: WorkBlock, e: React.PointerEvent) => {
    e.stopPropagation()
    dragDidMove.current = false
    setDraggingBlock(block)
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      startDay: startOfDay(new Date(block.startAt)),
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingBlock) return
      const moved = dragStartPos.current
        ? Math.abs(e.clientX - dragStartPos.current.x) + Math.abs(e.clientY - dragStartPos.current.y)
        : 0
      if (moved > 4) dragDidMove.current = true

      const target = computeDragTarget(e.clientX, draggingBlock)
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
        : computeDragTarget(e.clientX, draggingBlock)

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

  // Attach global pointer event listeners
  useEffect(() => {
    if (!draggingBlock) return

    const handleMove = (e: PointerEvent) => {
      handlePointerMove(e)
    }
    const handleUp = (e: PointerEvent) => {
      handlePointerUp(e).catch(console.error)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }
  }, [draggingBlock, handlePointerMove, handlePointerUp])

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
        {blocksLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="relative">
            <CapacityWeekGrid
              currentWeek={currentWeek}
              users={displayedUsers}
              blocks={displayBlocks}
              isDraggingBlockId={draggingBlock?.id || null}
              onBlockClick={handleBlockClick}
              onBlockPointerDown={(block, e) => handleDragStart(block, e)}
            />
            {displayedUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-text-secondary mb-4">{t('common.noData')}</p>
              </div>
            )}
          </div>
        )}
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
