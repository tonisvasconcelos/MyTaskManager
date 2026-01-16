import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../shared/api/tasks'
import { useProject } from '../shared/api/projects'
import { useUsers } from '../shared/api/users'
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
  assigneeId: z.string().uuid().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  estimatedEndDate: z.string().optional().or(z.literal('')),
  estimatedEffortHours: z.number().nonnegative().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

const statusColumns = [
  { status: 'Backlog', label: 'Backlog' },
  { status: 'InProgress', label: 'In Progress' },
  { status: 'Blocked', label: 'Blocked' },
  { status: 'Done', label: 'Done' },
]

const priorityColors: Record<string, 'default' | 'warning' | 'danger'> = {
  Low: 'default',
  Medium: 'warning',
  High: 'danger',
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: project, isLoading: projectLoading } = useProject(id || '')
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ projectId: id, page: 1, pageSize: 1000 })
  const { data: users } = useUsers()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'timesheet'>('tasks')

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
        assigneeId: data.assigneeId || null,
        startDate: data.startDate || null,
        estimatedEndDate: data.estimatedEndDate || null,
        estimatedEffortHours: data.estimatedEffortHours?.toString() || null,
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
      <div className="mb-8">
        <Link to="/projects" className="text-accent hover:underline text-sm mb-4 inline-block">
          ← Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">{project.name}</h1>
        <p className="text-text-secondary mt-2">{project.description || 'No description'}</p>
        <div className="flex gap-4 mt-4">
          <Badge variant={project.status === 'Active' ? 'success' : 'default'}>
            {project.status}
          </Badge>
          {project.startDate && (
            <span className="text-sm text-text-secondary">
              Start: {new Date(project.startDate).toLocaleDateString()}
            </span>
          )}
          {project.targetEndDate && (
            <span className="text-sm text-text-secondary">
              Target: {new Date(project.targetEndDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('timesheet')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'timesheet'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Timesheet Summary
          </button>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <>
          <div className="mb-4">
            <Button onClick={openCreateModal}>Create Task</Button>
          </div>

          <div className="grid grid-cols-4 gap-4">
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
                              {task.priority}
                            </Badge>
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
                      No tasks
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
          <p className="text-text-secondary">Timesheet summary coming soon...</p>
        </Card>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Task"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title *"
            {...register('title')}
            error={errors.title?.message}
          />
          <Textarea
            label="Description"
            {...register('description')}
            error={errors.description?.message}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              {...register('status')}
              error={errors.status?.message}
              options={statusColumns.map((col) => ({ value: col.status, label: col.label }))}
            />
            <Select
              label="Priority"
              {...register('priority')}
              error={errors.priority?.message}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
              ]}
            />
          </div>
          <Select
            label="Assignee"
            {...register('assigneeId')}
            error={errors.assigneeId?.message}
            options={[
              { value: '', label: 'Unassigned' },
              ...(users?.map((u) => ({ value: u.id, label: u.fullName })) || []),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              {...register('startDate')}
              error={errors.startDate?.message}
            />
            <Input
              label="Estimated End Date"
              type="date"
              {...register('estimatedEndDate')}
              error={errors.estimatedEndDate?.message}
            />
          </div>
          <Input
            label="Estimated Effort (hours)"
            type="number"
            step="0.5"
            min="0"
            {...register('estimatedEffortHours', { valueAsNumber: true })}
            error={errors.estimatedEffortHours?.message}
          />
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              Create
            </Button>
            <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
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
