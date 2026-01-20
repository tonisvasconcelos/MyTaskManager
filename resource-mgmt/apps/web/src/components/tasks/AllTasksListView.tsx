import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useTasks, useUpdateTask } from '../../shared/api/tasks'
import { useDebounce } from '../../shared/hooks/useDebounce'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { Pagination } from '../ui/Pagination'
import { Skeleton } from '../ui/Skeleton'
import type { Task } from '../../shared/types/api'

const priorityColors: Record<string, 'default' | 'warning' | 'danger'> = {
  Low: 'default',
  Medium: 'warning',
  High: 'danger',
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  Backlog: 'default',
  InProgress: 'info',
  Blocked: 'danger',
  Done: 'success',
}

export function AllTasksListView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt' | 'title'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const debouncedSearch = useDebounce(search, 500)
  const updateMutation = useUpdateTask()

  const { data, isLoading } = useTasks({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    sortBy,
    sortOrder,
    page,
    pageSize,
  })

  const tasks = data?.data || []
  const pagination = data?.pagination

  const statusOptions = useMemo(
    () => [
      { value: '', label: t('common.all') },
      { value: 'Backlog', label: t('projectDetail.backlog') },
      { value: 'InProgress', label: t('projectDetail.inProgress') },
      { value: 'Blocked', label: t('projectDetail.blocked') },
      { value: 'Done', label: t('projectDetail.done') },
    ],
    [t]
  )

  const priorityOptions = useMemo(
    () => [
      { value: '', label: t('common.all') },
      { value: 'High', label: t('priority.High') },
      { value: 'Medium', label: t('priority.Medium') },
      { value: 'Low', label: t('priority.Low') },
    ],
    [t]
  )

  const sortByOptions = useMemo(
    () => [
      { value: 'dueDate', label: t('projectDetail.dueDate') },
      { value: 'priority', label: t('tasks.priority') },
      { value: 'createdAt', label: t('projectDetail.createdDate') },
      { value: 'title', label: t('tasks.titleLabel') },
    ],
    [t]
  )

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateMutation.mutateAsync({ id: taskId, status: newStatus })
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const handleTaskClick = (task: Task) => {
    navigate(`/projects/${task.projectId}`, { state: { taskId: task.id } })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder={t('projectDetail.searchTasks')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            aria-label={t('projectDetail.searchTasks')}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            options={statusOptions}
            aria-label={t('projectDetail.filterByStatus')}
            className="min-w-[150px]"
          />
          <Select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setPage(1)
            }}
            options={priorityOptions}
            aria-label={t('projectDetail.filterByPriority')}
            className="min-w-[150px]"
          />
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <label className="text-sm font-medium text-text-secondary whitespace-nowrap">
          {t('projectDetail.sortBy')}:
        </label>
        <Select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as typeof sortBy)
            setPage(1)
          }}
          options={sortByOptions}
          aria-label={t('projectDetail.sortBy')}
          className="min-w-[150px]"
        />
        <Select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value as typeof sortOrder)
            setPage(1)
          }}
          options={[
            { value: 'asc', label: t('projectDetail.sortAscending') },
            { value: 'desc', label: t('projectDetail.sortDescending') },
          ]}
          aria-label={t('projectDetail.sortOrder')}
          className="min-w-[120px]"
        />
      </div>

      {/* Table - Desktop View */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-md">
          <p className="text-text-secondary">{t('projectDetail.noTasksFound')}</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse" role="table" aria-label={t('common.tasks')}>
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-text-secondary" scope="col">
                    {t('projectDetail.task')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-text-secondary" scope="col">
                    {t('common.projects')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-text-secondary" scope="col">
                    {t('tasks.priority')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-text-secondary" scope="col">
                    {t('tasks.billable')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-text-secondary" scope="col">
                    {t('tasks.labels')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-text-secondary" scope="col">
                    {t('projectDetail.dueDate')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-text-secondary" scope="col">
                    {t('tasks.status')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-text-secondary" scope="col">
                    {t('tasks.assignee')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-text-secondary" scope="col">
                    {t('tasks.refLink')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-border hover:bg-surface/50 transition-colors cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleTaskClick(task)
                      }
                    }}
                    tabIndex={0}
                    role="row"
                    aria-label={`${task.title}, ${t(`priority.${task.priority}`)}, ${
                      task.status === 'InProgress'
                        ? t('projectDetail.inProgress')
                        : task.status === 'Blocked'
                          ? t('projectDetail.blocked')
                          : task.status === 'Done'
                            ? t('projectDetail.done')
                            : t('projectDetail.backlog')
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary">{task.title}</span>
                        {task.description && (
                          <span className="text-sm text-text-secondary mt-1">
                            {truncateText(task.description, 80)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-text-primary">{task.project?.name || '—'}</span>
                        {task.project?.company && (
                          <span className="text-xs text-text-secondary">{task.project.company.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant={priorityColors[task.priority] || 'default'} className="text-xs">
                        {t(`priority.${task.priority}`)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={task.billable === 'Billable' ? 'success' : 'default'}
                        className="text-xs"
                      >
                        {t(`billable.${task.billable || 'Billable'}`)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {task.labels && task.labels.length > 0 ? (
                          task.labels.slice(0, 3).map((label, idx) => (
                            <Badge key={idx} variant="default" className="text-xs">
                              {label}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-text-secondary text-sm">—</span>
                        )}
                        {task.labels && task.labels.length > 3 && (
                          <Badge variant="default" className="text-xs">
                            +{task.labels.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-text-secondary">{formatDate(task.estimatedEndDate)}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={task.status}
                        onChange={(e) => {
                          handleStatusChange(task.id, e.target.value as Task['status'])
                        }}
                        options={statusOptions.filter((opt) => opt.value !== '')}
                        aria-label={`${t('projectDetail.changeStatus')} for ${task.title}`}
                        className="min-w-[120px] text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-3 text-sm text-text-secondary">
                      {task.assignee ? task.assignee.fullName : t('tasks.unassigned')}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      {task.refLink ? (
                        <a
                          href={task.refLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline text-sm break-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.refLink.length > 40 ? `${task.refLink.substring(0, 40)}...` : task.refLink}
                        </a>
                      ) : (
                        <span className="text-text-secondary text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border border-border rounded-md p-4 bg-surface hover:border-accent/50 transition-colors cursor-pointer"
                onClick={() => handleTaskClick(task)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleTaskClick(task)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${task.title}, ${t(`priority.${task.priority}`)}, ${
                  task.status === 'InProgress'
                    ? t('projectDetail.inProgress')
                    : task.status === 'Blocked'
                      ? t('projectDetail.blocked')
                      : task.status === 'Done'
                        ? t('projectDetail.done')
                        : t('projectDetail.backlog')
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-text-primary">{task.title}</h3>
                      <p className="text-sm text-text-secondary mt-1">
                        {task.project?.name}
                        {task.project?.company && ` • ${task.project.company.name}`}
                      </p>
                    </div>
                    <Badge variant={priorityColors[task.priority] || 'default'} className="text-xs">
                      {t(`priority.${task.priority}`)}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-text-secondary">{truncateText(task.description, 150)}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={task.billable === 'Billable' ? 'success' : 'default'}
                      className="text-xs"
                    >
                      {t(`billable.${task.billable || 'Billable'}`)}
                    </Badge>
                    <Badge variant={statusColors[task.status] || 'default'} className="text-xs">
                      {task.status === 'InProgress'
                        ? t('projectDetail.inProgress')
                        : task.status === 'Blocked'
                          ? t('projectDetail.blocked')
                          : task.status === 'Done'
                            ? t('projectDetail.done')
                            : t('projectDetail.backlog')}
                    </Badge>
                    {task.labels &&
                      task.labels.length > 0 &&
                      task.labels.slice(0, 3).map((label, idx) => (
                        <Badge key={idx} variant="default" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border">
                    <div className="flex flex-col sm:flex-row gap-2 text-sm text-text-secondary">
                      <span>
                        {t('tasks.assignee')}: {task.assignee ? task.assignee.fullName : t('tasks.unassigned')}
                      </span>
                      {task.estimatedEndDate && (
                        <span>
                          {t('projectDetail.dueDate')}: {formatDate(task.estimatedEndDate)}
                        </span>
                      )}
                      {task.refLink && (
                        <span onClick={(e) => e.stopPropagation()}>
                          {t('tasks.refLink')}:{' '}
                          <a
                            href={task.refLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline break-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.refLink.length > 30 ? `${task.refLink.substring(0, 30)}...` : task.refLink}
                          </a>
                        </span>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={task.status}
                        onChange={(e) => {
                          handleStatusChange(task.id, e.target.value as Task['status'])
                        }}
                        options={statusOptions.filter((opt) => opt.value !== '')}
                        aria-label={`${t('projectDetail.changeStatus')} for ${task.title}`}
                        className="flex-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
