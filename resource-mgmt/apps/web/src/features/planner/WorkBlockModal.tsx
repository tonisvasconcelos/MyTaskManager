import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import type { WorkBlock, WorkBlockType, WorkBlockStatus } from '../../shared/types/api'
import { parseISO, format } from 'date-fns'

const workBlockSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startAt: z.string().min(1, 'Start date/time is required'),
  endAt: z.string().min(1, 'End date/time is required'),
  type: z.enum(['Planned', 'Meeting', 'Focus', 'Admin', 'Break']),
  status: z.enum(['Planned', 'Confirmed', 'Completed', 'Cancelled']),
  notes: z.string().optional(),
  location: z.string().optional(),
  projectId: z.string().uuid().optional().or(z.literal('')),
  taskId: z.string().uuid().optional().or(z.literal('')),
}).refine((data) => {
  const start = new Date(data.startAt)
  const end = new Date(data.endAt)
  return end > start
}, {
  message: 'End date must be after start date',
  path: ['endAt'],
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

  // Format datetime-local input value (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, "yyyy-MM-dd'T'HH:mm")
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<WorkBlockFormData>({
    resolver: zodResolver(workBlockSchema),
    defaultValues: block
      ? {
          title: block.title,
          startAt: formatDateTimeLocal(block.startAt),
          endAt: formatDateTimeLocal(block.endAt),
          type: block.type,
          status: block.status,
          notes: block.notes || '',
          location: block.location || '',
          projectId: block.projectId || '',
          taskId: block.taskId || '',
        }
      : defaultStart && defaultEnd
        ? {
            title: '',
            startAt: formatDateTimeLocal(defaultStart),
            endAt: formatDateTimeLocal(defaultEnd),
            type: 'Planned',
            status: 'Planned',
            notes: '',
            location: '',
            projectId: '',
            taskId: '',
          }
        : {
            title: '',
            startAt: '',
            endAt: '',
            type: 'Planned',
            status: 'Planned',
            notes: '',
            location: '',
            projectId: '',
            taskId: '',
          },
  })

  const selectedProjectId = watch('projectId')
  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks

  const onSubmit = async (data: WorkBlockFormData) => {
    try {
      // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO 8601
      const startAtISO = new Date(data.startAt).toISOString()
      const endAtISO = new Date(data.endAt).toISOString()
      
      await onSave({
        ...(block && { id: block.id }),
        ...data,
        startAt: startAtISO,
        endAt: endAtISO,
        projectId: data.projectId || null,
        taskId: data.taskId || null,
        notes: data.notes || null,
        location: data.location || null,
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

  const typeOptions: Array<{ value: WorkBlockType; label: string }> = [
    { value: 'Planned', label: t('planner.types.planned') },
    { value: 'Meeting', label: t('planner.types.meeting') },
    { value: 'Focus', label: t('planner.types.focus') },
    { value: 'Admin', label: t('planner.types.admin') },
    { value: 'Break', label: t('planner.types.break') },
  ]

  const statusOptions: Array<{ value: WorkBlockStatus; label: string }> = [
    { value: 'Planned', label: t('planner.statuses.planned') },
    { value: 'Confirmed', label: t('planner.statuses.confirmed') },
    { value: 'Completed', label: t('planner.statuses.completed') },
    { value: 'Cancelled', label: t('planner.statuses.cancelled') },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('planner.editBlock') : t('planner.newBlock')}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={`${t('planner.blockTitle')} *`}
          {...register('title')}
          error={errors.title?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={`${t('planner.startTime')} *`}
            type="datetime-local"
            {...register('startAt')}
            error={errors.startAt?.message}
          />
          <Input
            label={`${t('planner.endTime')} *`}
            type="datetime-local"
            {...register('endAt')}
            error={errors.endAt?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={`${t('planner.type')} *`}
            {...register('type')}
            error={errors.type?.message}
            options={typeOptions}
          />
          <Select
            label={`${t('planner.status')} *`}
            {...register('status')}
            error={errors.status?.message}
            options={statusOptions}
          />
        </div>

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

        <Input
          label={t('planner.location')}
          {...register('location')}
          error={errors.location?.message}
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
