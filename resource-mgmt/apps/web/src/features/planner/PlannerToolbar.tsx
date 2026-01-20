import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { formatDateRange, getWeekRange } from './utils/date'
import type { WorkBlockStatus, WorkBlockType } from '../../shared/types/api'

interface PlannerToolbarProps {
  currentWeek: Date
  onWeekChange: (date: Date) => void
  onToday: () => void
  projectFilter: string
  taskFilter: string
  statusFilter: string
  userFilter: string
  onProjectFilterChange: (value: string) => void
  onTaskFilterChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onUserFilterChange: (value: string) => void
  onNewBlock: () => void
  projects: Array<{ id: string; name: string }>
  tasks: Array<{ id: string; title: string; projectId: string; status: string }>
  users: Array<{ id: string; fullName: string }>
  showUserFilter?: boolean
}

export function PlannerToolbar({
  currentWeek,
  onWeekChange,
  onToday,
  projectFilter,
  taskFilter,
  statusFilter,
  userFilter,
  onProjectFilterChange,
  onTaskFilterChange,
  onStatusFilterChange,
  onUserFilterChange,
  onNewBlock,
  projects,
  tasks,
  users,
  showUserFilter = false,
}: PlannerToolbarProps) {
  const { t } = useTranslation()
  const weekRange = getWeekRange(currentWeek)

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek)
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7))
    onWeekChange(newDate)
  }

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: '', label: t('planner.filters.allStatuses') },
    { value: 'Planned', label: t('planner.statuses.planned') },
    { value: 'Confirmed', label: t('planner.statuses.confirmed') },
    { value: 'Completed', label: t('planner.statuses.completed') },
    { value: 'Cancelled', label: t('planner.statuses.cancelled') },
  ]

  const filteredTasks = projectFilter
    ? tasks.filter((t) => t.projectId === projectFilter)
    : tasks

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Week Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onToday}>
            {t('planner.weekNavigation.today')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigateWeek('prev')}>
            ← {t('common.previous')}
          </Button>
          <h2 className="text-lg font-semibold text-text-primary min-w-[200px] text-center">
            {formatDateRange(weekRange.start, weekRange.end)}
          </h2>
          <Button variant="secondary" size="sm" onClick={() => navigateWeek('next')}>
            {t('common.next')} →
          </Button>
        </div>
        <Button onClick={onNewBlock}>{t('planner.newBlock')}</Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          value={projectFilter}
          onChange={(e) => {
            onProjectFilterChange(e.target.value)
            onTaskFilterChange('') // Reset task filter when project changes
          }}
          options={[
            { value: '', label: t('planner.filters.allProjects') },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <Select
          value={taskFilter}
          onChange={(e) => onTaskFilterChange(e.target.value)}
          options={[
            { value: '', label: t('planner.filters.allTasks') },
            ...filteredTasks.map((t) => ({ value: t.id, label: t.title })),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          options={statusOptions}
        />
        {showUserFilter && (
          <Select
            value={userFilter}
            onChange={(e) => onUserFilterChange(e.target.value)}
            options={[
              { value: '', label: t('planner.filters.allUsers') },
              ...users.map((u) => ({ value: u.id, label: u.fullName })),
            ]}
          />
        )}
      </div>
    </div>
  )
}
