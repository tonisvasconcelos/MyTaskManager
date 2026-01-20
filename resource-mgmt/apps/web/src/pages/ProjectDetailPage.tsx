import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../shared/api/tasks'
import { useProject, useProjectUsers, useUpdateProjectUsers } from '../shared/api/projects'
import { useUsers } from '../shared/api/users'
import { useProcurements } from '../shared/api/procurements'
import { useMe } from '../shared/api/auth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { TaskDetailModal } from '../components/tasks/TaskDetailModal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Task } from '../shared/types/api'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['Backlog', 'InProgress', 'Blocked', 'Done']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  billable: z.enum(['Billable', 'NonBillable']).optional(),
  labels: z.string().optional(), // Comma-separated labels (e.g., "#legal, #development")
  assigneeId: z.string().uuid().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  estimatedEndDate: z.string().optional().or(z.literal('')),
  estimatedEffortHours: z.number().nonnegative().optional(),
  refTicket: z.string().optional().or(z.literal('')),
  refLink: z
    .union([
      z.string().url('Invalid URL format'),
      z.literal(''),
    ])
    .optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

const getStatusColumns = (t: any) => [
  { status: 'Backlog', label: t('projectDetail.backlog') },
  { status: 'InProgress', label: t('projectDetail.inProgress') },
  { status: 'Blocked', label: t('projectDetail.blocked') },
  { status: 'Done', label: t('projectDetail.done') },
]

const priorityColors: Record<string, 'default' | 'warning' | 'danger'> = {
  Low: 'default',
  Medium: 'warning',
  High: 'danger',
}

export function ProjectDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: project, isLoading: projectLoading } = useProject(id || '')
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ projectId: id, page: 1, pageSize: 1000 })
  const { data: users } = useUsers()
  const expensesQuery = useProcurements({ projectId: id || '' })
  const expensesData = expensesQuery.data
  const expensesLoading = expensesQuery.isLoading
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'timesheet' | 'expenses' | 'users'>('tasks')
  const { data: meData } = useMe()
  const currentUserRole = meData?.user?.role
  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'Manager'
  
  // Project users permissions
  const { data: projectUsers, isLoading: projectUsersLoading } = useProjectUsers(id || '')
  const updateProjectUsersMutation = useUpdateProjectUsers()
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Initialize selectedUserIds when projectUsers loads
  useMemo(() => {
    if (projectUsers) {
      setSelectedUserIds(new Set(projectUsers.map((u) => u.id)))
      setHasUnsavedChanges(false)
    }
  }, [projectUsers])
  
  // Get Contributor users only
  const contributorUsers = useMemo(() => {
    return users?.filter((u) => u.role === 'Contributor') || []
  }, [users])
  
  const statusColumns = getStatusColumns(t)

  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()
  // Delete is handled from TaskDetailModal for MVP.
  useDeleteTask()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      status: 'Backlog',
      priority: 'Medium',
      billable: 'Billable',
    },
  })

  const tasks = tasksData?.data || []
  const tasksByStatus = statusColumns.reduce((acc, col) => {
    acc[col.status] = tasks.filter((t) => t.status === col.status)
    return acc
  }, {} as Record<string, Task[]>)

  const openCreateModal = () => {
    reset()
    setIsCreateModalOpen(true)
  }

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task)
  }

  const onSubmit = async (data: TaskFormData) => {
    if (!id) return
    try {
      await createMutation.mutateAsync({
        projectId: id,
        ...data,
        labels: data.labels ? data.labels.split(',').map(l => l.trim()).filter(l => l) : [],
        assigneeId: data.assigneeId || null,
        startDate: data.startDate || null,
        estimatedEndDate: data.estimatedEndDate || null,
        estimatedEffortHours: data.estimatedEffortHours !== undefined && data.estimatedEffortHours !== null
          ? (typeof data.estimatedEffortHours === 'number' ? data.estimatedEffortHours : parseFloat(String(data.estimatedEffortHours)))
          : null,
        refTicket: data.refTicket || null,
        refLink: data.refLink || null,
      } as any)
      setIsCreateModalOpen(false)
      reset()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateMutation.mutateAsync({ id: taskId, status: newStatus })
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  if (projectLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!project) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-8">Project not found</h1>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <Link to="/projects" className="text-accent hover:underline text-sm mb-4 inline-block">
          ← {t('projectDetail.backToProjects')}
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary break-words">{project.name}</h1>
        <p className="text-text-secondary mt-2 break-words">{project.description || t('common.noData')}</p>
        <div className="flex flex-wrap gap-2 md:gap-4 mt-4">
          <Badge variant={project.status === 'Active' ? 'success' : 'default'}>
            {t(`status.${project.status}`)}
          </Badge>
          {project.startDate && (
            <span className="text-sm text-text-secondary">
              {t('projects.startDate')}: {new Date(project.startDate).toLocaleDateString()}
            </span>
          )}
          {project.targetEndDate && (
            <span className="text-sm text-text-secondary">
              {t('projects.targetEndDate')}: {new Date(project.targetEndDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 border-b border-border">
        <div className="flex gap-2 md:gap-4">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base flex-1 md:flex-initial ${
              activeTab === 'tasks'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('projectDetail.tasks')}
          </button>
          <button
            onClick={() => setActiveTab('timesheet')}
            className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base flex-1 md:flex-initial ${
              activeTab === 'timesheet'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('projectDetail.timesheetSummary')}
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base flex-1 md:flex-initial ${
              activeTab === 'expenses'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('projectDetail.expenses')}
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base flex-1 md:flex-initial ${
                activeTab === 'users'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('projectDetail.usersPermissions')}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'tasks' && (
        <>
          <div className="mb-4">
            <Button onClick={openCreateModal}>{t('projectDetail.createTask')}</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusColumns.map((column) => (
              <div key={column.status} className="flex flex-col">
                <div className="mb-3">
                  <h3 className="font-semibold text-text-primary">{column.label}</h3>
                  <span className="text-sm text-text-secondary">
                    {tasksByStatus[column.status]?.length || 0}
                  </span>
                </div>
                <div className="space-y-3 flex-1">
                  {tasksLoading ? (
                    <Skeleton className="h-32" />
                  ) : tasksByStatus[column.status]?.length > 0 ? (
                    tasksByStatus[column.status].map((task) => (
                      <Card
                        key={task.id}
                        className="cursor-pointer hover:border-accent/50 transition-colors"
                        onClick={() => openTaskDetail(task)}
                      >
                        <div className="space-y-2">
                          <h4 className="font-medium text-text-primary">{task.title}</h4>
                          {task.assignee && (
                            <p className="text-xs text-text-secondary">
                              👤 {task.assignee.fullName}
                            </p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant={priorityColors[task.priority] || 'default'} className="text-xs">
                              {t(`priority.${task.priority}`)}
                            </Badge>
                            <Badge variant={task.billable === 'Billable' ? 'success' : 'default'} className="text-xs">
                              {t(`billable.${task.billable || 'Billable'}`)}
                            </Badge>
                            {task.labels && task.labels.length > 0 && task.labels.map((label, idx) => (
                              <Badge key={idx} variant="default" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                            {task.estimatedEndDate && (
                              <span className="text-xs text-text-secondary">
                                📅 {new Date(task.estimatedEndDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 pt-2">
                            {statusColumns
                              .filter((col) => col.status !== task.status)
                              .map((col) => (
                                <button
                                  key={col.status}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStatusChange(task.id, col.status as Task['status'])
                                  }}
                                  className="text-xs px-2 py-1 bg-surface border border-border rounded hover:bg-surface/80 transition-colors"
                                >
                                  {col.label}
                                </button>
                              ))}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center text-text-secondary text-sm py-8 border border-dashed border-border rounded-md">
                      {t('projectDetail.noTasks')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'timesheet' && (
        <Card>
          <p className="text-text-secondary">{t('projectDetail.comingSoon')}</p>
        </Card>
      )}

      {activeTab === 'expenses' && (
        <div>
          {expensesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : expensesData && Array.isArray(expensesData) && expensesData.length > 0 ? (
            <>
              <div className="mb-4 p-4 bg-surface border border-border rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">{t('projectDetail.totalAllocated')}:</span>
                  <span className="text-text-primary font-semibold text-lg">
                    $
                    {expensesData
                      .reduce((sum, expense) => {
                        const allocation = expense.allocations?.find((a) => a.projectId === id)
                        if (!allocation) return sum
                        if (allocation.allocatedAmount) {
                          return sum + parseFloat(allocation.allocatedAmount)
                        } else if (allocation.allocatedPercentage) {
                          return sum + (parseFloat(expense.totalAmount) * parseFloat(allocation.allocatedPercentage) / 100)
                        }
                        return sum
                      }, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {expensesData.map((expense) => {
                  const allocation = expense.allocations?.find((a) => a.projectId === id)
                  if (!allocation) return null
                  return (
                    <Card key={expense.id}>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-text-primary mb-2 break-words">
                            {expense.invoiceNumber}
                          </h3>
                          <p className="text-sm text-text-secondary mb-2">
                            {expense.company?.name || 'Unknown Vendor'}
                          </p>
                          <div className="flex flex-wrap gap-2 md:gap-4 text-sm text-text-secondary">
                            <span>
                              {t('procurements.date')}: {new Date(expense.date).toLocaleDateString()}
                            </span>
                            <span>
                              {t('procurements.allocatedAmount')}: $
                              {allocation.allocatedAmount
                                ? parseFloat(allocation.allocatedAmount).toFixed(2)
                                : allocation.allocatedPercentage
                                  ? (parseFloat(expense.totalAmount) * parseFloat(allocation.allocatedPercentage) / 100).toFixed(2)
                                  : '0.00'}
                              {allocation.allocatedPercentage && ` (${parseFloat(allocation.allocatedPercentage).toFixed(2)}%)`}
                            </span>
                            <span>
                              {t('procurements.totalAmount')}: ${parseFloat(expense.totalAmount).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge
                              variant={
                                expense.status === 'PAID'
                                  ? 'success'
                                  : expense.status === 'PENDING'
                                    ? 'warning'
                                    : 'default'
                              }
                            >
                              {t(`paymentStatus.${expense.status}`)}
                            </Badge>
                            <Badge variant="default">
                              {t(`paymentMethod.${expense.paymentMethod}`)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          ) : (
            <Card>
              <p className="text-text-secondary text-center py-8">{t('projectDetail.noExpenses')}</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'users' && isAdmin && (
        <div>
          <Card>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {t('projectDetail.selectContributors')}
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  {t('projectDetail.selectContributorsDescription')}
                </p>
              </div>

              {projectUsersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : contributorUsers.length === 0 ? (
                <p className="text-text-secondary text-center py-8">{t('projectDetail.noContributors')}</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {contributorUsers.map((user) => {
                      const isSelected = selectedUserIds.has(user.id)
                      return (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-3 border border-border rounded-md hover:bg-surface cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedUserIds)
                              if (e.target.checked) {
                                newSelected.add(user.id)
                              } else {
                                newSelected.delete(user.id)
                              }
                              setSelectedUserIds(newSelected)
                              setHasUnsavedChanges(true)
                            }}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent focus:ring-2"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-text-primary">{user.fullName}</p>
                            {user.email && (
                              <p className="text-sm text-text-secondary">{user.email}</p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                      onClick={async () => {
                        if (!id) return
                        try {
                          await updateProjectUsersMutation.mutateAsync({
                            projectId: id,
                            userIds: Array.from(selectedUserIds),
                          })
                          setHasUnsavedChanges(false)
                        } catch (error) {
                          console.error('Error saving permissions:', error)
                        }
                      }}
                      disabled={updateProjectUsersMutation.isPending || !hasUnsavedChanges}
                    >
                      {updateProjectUsersMutation.isPending
                        ? t('common.saving')
                        : t('projectDetail.savePermissions')}
                    </Button>
                    {hasUnsavedChanges && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (projectUsers) {
                            setSelectedUserIds(new Set(projectUsers.map((u) => u.id)))
                            setHasUnsavedChanges(false)
                          }
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('projectDetail.createTask')}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={`${t('tasks.title')} *`}
            {...register('title')}
            error={errors.title?.message}
          />
          <Textarea
            label={t('tasks.description')}
            {...register('description')}
            error={errors.description?.message}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t('tasks.status')}
              {...register('status')}
              error={errors.status?.message}
              options={statusColumns.map((col) => ({ value: col.status, label: col.label }))}
            />
            <Select
              label={t('tasks.priority')}
              {...register('priority')}
              error={errors.priority?.message}
              options={[
                { value: 'Low', label: t('priority.low') },
                { value: 'Medium', label: t('priority.medium') },
                { value: 'High', label: t('priority.high') },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t('tasks.billable')}
              {...register('billable')}
              error={errors.billable?.message}
              options={[
                { value: 'Billable', label: t('billable.Billable') },
                { value: 'NonBillable', label: t('billable.NonBillable') },
              ]}
            />
            <Select
              label={t('tasks.assignee')}
              {...register('assigneeId')}
              error={errors.assigneeId?.message}
              options={[
                { value: '', label: t('tasks.unassigned') },
                ...(users?.map((u) => ({ value: u.id, label: u.fullName })) || []),
              ]}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('tasks.startDate')}
              type="date"
              {...register('startDate')}
              error={errors.startDate?.message}
            />
            <Input
              label={t('tasks.estimatedEndDate')}
              type="date"
              {...register('estimatedEndDate')}
              error={errors.estimatedEndDate?.message}
            />
          </div>
          <Input
            label={t('tasks.estimatedEffort')}
            type="number"
            step="0.5"
            min="0"
            {...register('estimatedEffortHours', { valueAsNumber: true })}
            error={errors.estimatedEffortHours?.message}
          />
          <Input
            label={t('tasks.labels')}
            placeholder={t('tasks.labelsPlaceholder')}
            {...register('labels')}
            error={errors.labels?.message}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('tasks.refTicket')}
              placeholder="e.g., JIRA-123, DEVOPS-456"
              {...register('refTicket')}
              error={errors.refTicket?.message}
            />
            <Input
              label={t('tasks.refLink')}
              type="url"
              placeholder="https://..."
              {...register('refLink')}
              error={errors.refLink?.message}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {t('common.create')}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask) => {
            setSelectedTask(updatedTask as Task)
          }}
        />
      )}
    </div>
  )
}
