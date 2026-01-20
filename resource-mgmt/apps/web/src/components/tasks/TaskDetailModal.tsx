import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTask, useUpdateTask, useDeleteTask } from '../../shared/api/tasks'
import { useTaskAttachments, useUploadAttachments, useDeleteAttachment } from '../../shared/api/attachments'
import { useSubTasks, useCreateSubTask, useUpdateSubTask, useDeleteSubTask } from '../../shared/api/subTasks'
import { useUsers } from '../../shared/api/users'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { FileUpload } from '../ui/FileUpload'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Task } from '../../shared/types/api'

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

const priorityColors: Record<string, 'default' | 'warning' | 'danger'> = {
  Low: 'default',
  Medium: 'warning',
  High: 'danger',
}

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onUpdate: (task: Task) => void
}

export function TaskDetailModal({ task: initialTask, onClose, onUpdate }: TaskDetailModalProps) {
  const { t } = useTranslation()
  const { data: task, isLoading } = useTask(initialTask.id)
  const { data: attachments, isLoading: attachmentsLoading } = useTaskAttachments(initialTask.id)
  const { data: subTasks, isLoading: subTasksLoading } = useSubTasks(initialTask.id)
  const { data: users } = useUsers()
  const updateMutation = useUpdateTask()
  const deleteMutation = useDeleteTask()
  const uploadMutation = useUploadAttachments()
  const deleteAttachmentMutation = useDeleteAttachment()
  const createSubTaskMutation = useCreateSubTask()
  const updateSubTaskMutation = useUpdateSubTask()
  const deleteSubTaskMutation = useDeleteSubTask()
  const [isEditing, setIsEditing] = useState(false)
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('')

  const currentTask = task || initialTask

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: currentTask.title,
      description: currentTask.description || '',
      status: currentTask.status,
      priority: currentTask.priority,
      billable: currentTask.billable || 'Billable',
      labels: (currentTask.labels && currentTask.labels.length > 0) ? currentTask.labels.join(', ') : '',
      assigneeId: currentTask.assigneeId || '',
      startDate: currentTask.startDate ? new Date(currentTask.startDate).toISOString().split('T')[0] : '',
      estimatedEndDate: currentTask.estimatedEndDate
        ? new Date(currentTask.estimatedEndDate).toISOString().split('T')[0]
        : '',
      estimatedEffortHours: currentTask.estimatedEffortHours
        ? parseFloat(currentTask.estimatedEffortHours)
        : undefined,
      refTicket: currentTask.refTicket || '',
      refLink: currentTask.refLink || '',
    },
  })

  const onSubmit = async (data: TaskFormData) => {
    try {
      const updated = await updateMutation.mutateAsync({
        id: currentTask.id,
        ...data,
        labels: data.labels ? data.labels.split(',').map(l => l.trim()).filter(l => l) : [],
        assigneeId: data.assigneeId || null,
        startDate: data.startDate || null,
        estimatedEndDate: data.estimatedEndDate || null,
        estimatedEffortHours: data.estimatedEffortHours?.toString() || null,
        refTicket: data.refTicket || null,
        refLink: data.refLink || null,
      } as any)
      onUpdate(updated)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleUpload = async () => {
    if (filesToUpload.length === 0) return
    try {
      await uploadMutation.mutateAsync({
        taskId: currentTask.id,
        files: filesToUpload,
      })
      setFilesToUpload([])
    } catch (error) {
      console.error('Error uploading files:', error)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (confirm(t('tasks.deleteAttachmentConfirm'))) {
      try {
        await deleteAttachmentMutation.mutateAsync({
          attachmentId,
          taskId: currentTask.id,
        })
      } catch (error) {
        console.error('Error deleting attachment:', error)
      }
    }
  }

  const handleDeleteTask = async () => {
    if (confirm(t('tasks.deleteConfirm'))) {
      try {
        await deleteMutation.mutateAsync(currentTask.id)
        onClose()
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    }
  }

  const handleAddSubTask = async () => {
    if (!newSubTaskTitle.trim()) return
    try {
      await createSubTaskMutation.mutateAsync({
        taskId: currentTask.id,
        title: newSubTaskTitle.trim(),
      })
      setNewSubTaskTitle('')
    } catch (error) {
      console.error('Error creating sub-task:', error)
    }
  }

  const handleToggleSubTask = async (subTaskId: string, completed: boolean) => {
    try {
      await updateSubTaskMutation.mutateAsync({
        id: subTaskId,
        completed: !completed,
      })
    } catch (error) {
      console.error('Error updating sub-task:', error)
    }
  }

  const handleDeleteSubTask = async (subTaskId: string) => {
    if (confirm(t('tasks.deleteSubTaskConfirm'))) {
      try {
        await deleteSubTaskMutation.mutateAsync(subTaskId)
      } catch (error) {
        console.error('Error deleting sub-task:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <Modal isOpen={true} onClose={onClose} title={t('tasks.taskDetails')} size="xl">
        <Skeleton className="h-64" />
      </Modal>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={t('tasks.taskDetails')} size="xl">
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label={`${t('tasks.titleLabel')} *`} {...register('title')} error={errors.title?.message} />
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
              options={[
                { value: 'Backlog', label: t('projectDetail.backlog') },
                { value: 'InProgress', label: t('projectDetail.inProgress') },
                { value: 'Blocked', label: t('projectDetail.blocked') },
                { value: 'Done', label: t('projectDetail.done') },
              ]}
            />
            <Select
              label={t('tasks.priority')}
              {...register('priority')}
              error={errors.priority?.message}
              options={[
                { value: 'Low', label: t('priority.Low') },
                { value: 'Medium', label: t('priority.Medium') },
                { value: 'High', label: t('priority.High') },
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
          <Input
            label={t('tasks.labels')}
            placeholder={t('tasks.labelsPlaceholder')}
            {...register('labels')}
            error={errors.labels?.message}
          />
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" disabled={updateMutation.isPending} className="flex-1 sm:flex-initial">
              {t('common.save')}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setIsEditing(false)
                reset()
              }}
              className="flex-1 sm:flex-initial"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-2 break-words">{currentTask.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={priorityColors[currentTask.priority] || 'default'}>
                    {t(`priority.${currentTask.priority}`)}
                  </Badge>
                  <Badge variant={currentTask.status === 'Blocked' ? 'danger' : 'info'}>
                    {currentTask.status === 'InProgress' ? t('projectDetail.inProgress') : currentTask.status === 'Blocked' ? t('projectDetail.blocked') : currentTask.status === 'Done' ? t('projectDetail.done') : t('projectDetail.backlog')}
                  </Badge>
                  <Badge variant={currentTask.billable === 'Billable' ? 'success' : 'default'}>
                    {t(`billable.${currentTask.billable}`)}
                  </Badge>
                  {currentTask.labels && currentTask.labels.length > 0 && currentTask.labels.map((label, idx) => (
                    <Badge key={idx} variant="default">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                  {t('common.edit')}
                </Button>
                <Button variant="danger" size="sm" onClick={handleDeleteTask} className="w-full sm:w-auto">
                  {t('common.delete')}
                </Button>
              </div>
            </div>
            {currentTask.description && (
              <p className="text-text-secondary mb-4">{currentTask.description}</p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-secondary">{t('tasks.billable')}:</span>
                <p className="text-text-primary">{t(`billable.${currentTask.billable || 'Billable'}`)}</p>
              </div>
              {currentTask.assignee && (
                <div>
                  <span className="text-text-secondary">{t('tasks.assignee')}:</span>
                  <p className="text-text-primary">{currentTask.assignee.fullName}</p>
                </div>
              )}
              {currentTask.startDate && (
                <div>
                  <span className="text-text-secondary">{t('tasks.startDate')}:</span>
                  <p className="text-text-primary">{new Date(currentTask.startDate).toLocaleDateString()}</p>
                </div>
              )}
              {currentTask.estimatedEndDate && (
                <div>
                  <span className="text-text-secondary">{t('tasks.estimatedEndDate')}:</span>
                  <p className="text-text-primary">
                    {new Date(currentTask.estimatedEndDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {currentTask.estimatedEffortHours && (
                <div>
                  <span className="text-text-secondary">{t('tasks.estimatedEffort')}:</span>
                  <p className="text-text-primary">{currentTask.estimatedEffortHours} {t('timesheet.hours')}</p>
                </div>
              )}
              {currentTask.refTicket && (
                <div>
                  <span className="text-text-secondary">{t('tasks.refTicket')}:</span>
                  <p className="text-text-primary">{currentTask.refTicket}</p>
                </div>
              )}
              {currentTask.refLink && (
                <div>
                  <span className="text-text-secondary">{t('tasks.refLink')}:</span>
                  <p className="text-text-primary">
                    <a
                      href={currentTask.refLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {currentTask.refLink}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary mb-3">{t('tasks.subTasks')}</h3>
            <div className="mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder={t('tasks.subTaskTitlePlaceholder')}
                  value={newSubTaskTitle}
                  onChange={(e) => setNewSubTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSubTask()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddSubTask}
                  disabled={!newSubTaskTitle.trim() || createSubTaskMutation.isPending}
                >
                  {t('tasks.addSubTask')}
                </Button>
              </div>
            </div>
            {subTasksLoading ? (
              <Skeleton className="h-24" />
            ) : subTasks && subTasks.length > 0 ? (
              <div className="space-y-2">
                {subTasks.map((subTask) => (
                  <div
                    key={subTask.id}
                    className="flex items-center gap-3 p-3 border border-border rounded-md hover:bg-surface/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={subTask.completed}
                      onChange={() => handleToggleSubTask(subTask.id, subTask.completed)}
                      className="w-5 h-5 text-accent border-border rounded focus:ring-accent focus:ring-2 cursor-pointer"
                      aria-label={`${subTask.completed ? t('tasks.completed') : t('tasks.incomplete')}: ${subTask.title}`}
                    />
                    <span
                      className={`flex-1 text-text-primary ${
                        subTask.completed ? 'line-through text-text-secondary' : ''
                      }`}
                    >
                      {subTask.title}
                    </span>
                    <button
                      onClick={() => handleDeleteSubTask(subTask.id)}
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded transition-colors"
                      aria-label={`${t('common.delete')} ${subTask.title}`}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary text-sm">{t('tasks.noSubTasks')}</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-text-primary mb-3">{t('tasks.attachments')}</h3>
            <div className="mb-4">
              <FileUpload
                onFilesSelected={setFilesToUpload}
                accept="image/*"
                multiple={true}
                maxFiles={10}
              />
              {filesToUpload.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="mt-2"
                >
                  {t('tasks.uploadFiles')} ({filesToUpload.length})
                </Button>
              )}
            </div>
            {attachmentsLoading ? (
              <Skeleton className="h-24" />
            ) : attachments && attachments.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="relative">
                    <img
                      src={attachment.url}
                      alt={attachment.originalName}
                      className="w-full h-24 object-cover rounded-md border border-border"
                    />
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                    <p className="text-xs text-text-secondary mt-1 truncate">{attachment.originalName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary text-sm">{t('tasks.noAttachments')}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
