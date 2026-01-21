import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import type { WorkBlock, WorkBlockImportance } from '../../shared/types/api'
import { parseISO, format } from 'date-fns'

const workBlockSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:mm format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:mm format'),
  importance: z.enum(['Low', 'Medium', 'High']),
  description: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().min(1, 'Task description is required')),
  notes: z.string().optional().or(z.literal('')),
  projectId: z.string().uuid().optional().or(z.literal('')),
  taskId: z.string().uuid().optional().or(z.literal('')),
}).refine((data) => {
  const start = new Date(`${data.startDate}T${data.startTime}`)
  const end = new Date(`${data.endDate}T${data.endTime}`)
  return end > start
}, { message: 'End date/time must be after start date/time', path: ['endTime'] })
  .refine((data) => data.startDate === data.endDate, {
    message: 'Planning entry must be within a single day',
    path: ['endDate'],
  })

type WorkBlockFormData = z.infer<typeof workBlockSchema>

interface WorkBlockModalProps {
  isOpen: boolean
  onClose: () => void
  block: WorkBlock | null
  onSave: (data: Partial<WorkBlock> & { id?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  projects: Array<{ id: string; name: string }>
  tasks: Array<{ id: string; title: string; projectId: string; status: string }>
  defaultStart?: Date
  defaultEnd?: Date
}

export function WorkBlockModal({
  isOpen,
  onClose,
  block,
  onSave,
  onDelete,
  projects,
  tasks,
  defaultStart,
  defaultEnd,
}: WorkBlockModalProps) {
  const { t } = useTranslation()
  const isEditing = !!block

  const formatDateInput = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'yyyy-MM-dd')
  }
  const formatTimeInput = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'HH:mm')
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<WorkBlockFormData>({
    resolver: zodResolver(workBlockSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: block
      ? {
          startDate: formatDateInput(block.startAt),
          startTime: formatTimeInput(block.startAt),
          endDate: formatDateInput(block.endAt),
          endTime: formatTimeInput(block.endAt),
          importance: block.importance,
          description: block.description || '',
          notes: block.notes || '',
          projectId: block.projectId || '',
          taskId: block.taskId || '',
        }
      : defaultStart && defaultEnd
        ? {
            startDate: formatDateInput(defaultStart),
            startTime: formatTimeInput(defaultStart),
            endDate: formatDateInput(defaultEnd),
            endTime: formatTimeInput(defaultEnd),
            importance: 'Medium',
            description: '',
            notes: '',
            projectId: '',
            taskId: '',
          }
        : {
            startDate: '',
            startTime: '',
            endDate: '',
            endTime: '',
            importance: 'Medium',
            description: '',
            notes: '',
            projectId: '',
            taskId: '',
          },
  })

  const selectedProjectId = watch('projectId')
  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks

  const watchedStartDate = watch('startDate')
  const watchedStartTime = watch('startTime')
  const watchedEndDate = watch('endDate')
  const watchedEndTime = watch('endTime')
  const totalMinutes = computeTotalMinutes(watchedStartDate, watchedStartTime, watchedEndDate, watchedEndTime)

  const onSubmit = async (data: WorkBlockFormData) => {
    try {
      const startAtISO = new Date(`${data.startDate}T${data.startTime}`).toISOString()
      const endAtISO = new Date(`${data.endDate}T${data.endTime}`).toISOString()

      // Description is already trimmed by preprocess, but ensure it's not empty
      const trimmedDescription = (data.description || '').trim()

      const title = deriveTitle({
        description: trimmedDescription,
        projectId: data.projectId || null,
        taskId: data.taskId || null,
        projects,
        tasks,
        existingTitle: block?.title,
      })
      
      await onSave({
        ...(block && { id: block.id }),
        title,
        startAt: startAtISO,
        endAt: endAtISO,
        type: 'Planned',
        status: block?.status || 'Planned',
        importance: data.importance as WorkBlockImportance,
        description: trimmedDescription || null,
        projectId: data.projectId || null,
        taskId: data.taskId || null,
        notes: data.notes?.trim() || null,
      })
      reset()
      onClose()
    } catch (error) {
      console.error('Error saving work block:', error)
    }
  }

  const handleDelete = async () => {
    if (!block || !onDelete) return
    if (confirm(t('planner.deleteConfirm'))) {
      try {
        await onDelete(block.id)
        reset()
        onClose()
      } catch (error) {
        console.error('Error deleting work block:', error)
      }
    }
  }

  const importanceOptions: Array<{ value: WorkBlockImportance; label: string }> = [
    { value: 'Low', label: t('planner.importance.low') },
    { value: 'Medium', label: t('planner.importance.medium') },
    { value: 'High', label: t('planner.importance.high') },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('planner.editBlock') : t('planner.newBlock')}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`${t('planner.startDate')} *`}
              type="date"
              {...register('startDate')}
              error={errors.startDate?.message}
            />
            <Input
              label={`${t('planner.startTime')} *`}
              type="time"
              {...register('startTime')}
              error={errors.startTime?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`${t('planner.endDate')} *`}
              type="date"
              {...register('endDate')}
              error={errors.endDate?.message}
            />
            <Input
              label={`${t('planner.endTime')} *`}
              type="time"
              {...register('endTime')}
              error={errors.endTime?.message}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
          <div className="text-sm text-text-secondary">{t('planner.totalTime')}</div>
          <div className="text-sm font-semibold text-text-primary">{formatTotal(totalMinutes)}</div>
        </div>

        <Select
          label={`${t('planner.importance.label')} *`}
          {...register('importance')}
          error={errors.importance?.message}
          options={importanceOptions}
        />

        <Textarea
          label={`${t('planner.taskDescription')} *`}
          {...register('description')}
          error={errors.description?.message}
          rows={3}
        />

        <Select
          label={t('planner.project')}
          {...register('projectId')}
          error={errors.projectId?.message}
          options={[
            { value: '', label: t('planner.filters.allProjects') },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />

        <Select
          label={t('planner.task')}
          {...register('taskId')}
          error={errors.taskId?.message}
          options={[
            { value: '', label: t('planner.filters.allTasks') },
            ...filteredTasks.map((t) => ({ value: t.id, label: t.title })),
          ]}
        />

        <Textarea
          label={t('planner.notes')}
          {...register('notes')}
          error={errors.notes?.message}
          rows={4}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit">{isEditing ? t('common.update') : t('common.create')}</Button>
          {isEditing && onDelete && (
            <Button variant="danger" type="button" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          )}
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function computeTotalMinutes(startDate: string, startTime: string, endDate: string, endTime: string): number | null {
  if (!startDate || !startTime || !endDate || !endTime) return null
  const start = new Date(`${startDate}T${startTime}`)
  const end = new Date(`${endDate}T${endTime}`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const diff = Math.round((end.getTime() - start.getTime()) / 60000)
  return diff > 0 ? diff : null
}

function formatTotal(totalMinutes: number | null): string {
  if (!totalMinutes) return '—'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function deriveTitle(args: {
  description: string
  projectId: string | null
  taskId: string | null
  projects: Array<{ id: string; name: string }>
  tasks: Array<{ id: string; title: string; projectId: string; status: string }>
  existingTitle?: string
}): string {
  if (args.taskId) {
    const task = args.tasks.find((t) => t.id === args.taskId)
    if (task?.title) return task.title
  }
  if (args.projectId) {
    const project = args.projects.find((p) => p.id === args.projectId)
    if (project?.name) return project.name
  }
  const trimmed = args.description.trim()
  if (trimmed.length > 0) return trimmed.slice(0, 80)
  return args.existingTitle || 'Planning Entry'
}
