import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTimesheet, useCreateTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from '../shared/api/timesheet'
import { useUsers } from '../shared/api/users'
import { useTasks } from '../shared/api/tasks'
import { useProjects } from '../shared/api/projects'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const timeEntrySchema = z.object({
  taskId: z.string().uuid('Task is required'),
  userId: z.string().uuid('User is required'),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  hours: z.number().positive('Hours must be greater than 0').max(24, 'Hours cannot exceed 24'),
  notes: z.string().optional(),
})

type TimeEntryFormData = z.infer<typeof timeEntrySchema>

function getWeekRange(date: Date = new Date()) {
  const dayOfWeek = date.getDay()
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return {
    from: startOfWeek.toISOString().split('T')[0],
    to: endOfWeek.toISOString().split('T')[0],
  }
}

export function TimesheetPage() {
  const { t } = useTranslation()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [userFilter, setUserFilter] = useState<string>('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [taskFilter, setTaskFilter] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)

  const weekRange = getWeekRange(currentWeek)
  const { data: timesheet, isLoading } = useTimesheet({
    userId: userFilter || undefined,
    from: weekRange.from,
    to: weekRange.to,
  })
  const { data: users } = useUsers()
  const { data: tasks } = useTasks({ projectId: projectFilter || undefined, page: 1, pageSize: 1000 })
  const { data: projects } = useProjects({ page: 1, pageSize: 1000 })

  const createMutation = useCreateTimeEntry()
  const updateMutation = useUpdateTimeEntry()
  const deleteMutation = useDeleteTimeEntry()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      entryDate: new Date().toISOString().split('T')[0],
      hours: 0,
    },
  })

  const selectedProjectId = watch('taskId') ? tasks?.data.find((t) => t.id === watch('taskId'))?.projectId : null

  const openCreateModal = () => {
    setEditingEntry(null)
    reset({
      entryDate: new Date().toISOString().split('T')[0],
      hours: 0,
      userId: userFilter || '',
      taskId: taskFilter || '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (entry: any) => {
    setEditingEntry(entry)
    reset({
      taskId: entry.taskId,
      userId: entry.userId,
      entryDate: entry.entryDate,
      hours: parseFloat(entry.hours),
      notes: entry.notes || '',
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (data: TimeEntryFormData) => {
    try {
      if (editingEntry) {
        await updateMutation.mutateAsync({ id: editingEntry.id, ...data })
      } else {
        await createMutation.mutateAsync(data)
      }
      setIsModalOpen(false)
      reset()
    } catch (error) {
      console.error('Error saving time entry:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('timesheet.deleteConfirm'))) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting time entry:', error)
      }
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek)
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newDate)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekRange.from)
    date.setDate(date.getDate() + i)
    return date
  })

  const dailyTotals = timesheet?.totalsPerDay || {}
  const hasWarning = Object.values(dailyTotals).some((hours) => hours > 12)

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('timesheet.title')}</h1>
        <Button onClick={openCreateModal}>{t('timesheet.addTimeEntry')}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          options={[
            { value: '', label: t('timesheet.allUsers') },
            ...(users?.map((u) => ({ value: u.id, label: u.fullName })) || []),
          ]}
        />
        <Select
          value={projectFilter}
          onChange={(e) => {
            setProjectFilter(e.target.value)
            setTaskFilter('')
          }}
          options={[
            { value: '', label: t('timesheet.allProjects') },
            ...(projects?.data.map((p) => ({ value: p.id, label: p.name })) || []),
          ]}
        />
        <Select
          value={taskFilter}
          onChange={(e) => setTaskFilter(e.target.value)}
          options={[
            { value: '', label: t('timesheet.allTasks') },
            ...(tasks?.data.map((t) => ({ value: t.id, label: t.title })) || []),
          ]}
        />
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <Button variant="secondary" size="sm" onClick={() => navigateWeek('prev')}>
              ← {t('common.previous')}
            </Button>
            <h2 className="text-base sm:text-lg font-semibold text-text-primary text-center sm:text-left">
              {weekDays[0].toLocaleDateString()} - {weekDays[6].toLocaleDateString()}
            </h2>
            <Button variant="secondary" size="sm" onClick={() => navigateWeek('next')}>
              {t('common.next')} →
            </Button>
          </div>
          {hasWarning && (
            <Badge variant="warning" className="self-center sm:self-auto">⚠️ {t('timesheet.warning')}</Badge>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : timesheet ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-secondary font-medium">{t('timesheet.date')}</th>
                    <th className="text-left py-2 text-text-secondary font-medium">{t('timesheet.task')}</th>
                    <th className="text-left py-2 text-text-secondary font-medium">{t('timesheet.user')}</th>
                    <th className="text-right py-2 text-text-secondary font-medium">{t('timesheet.hours')}</th>
                    <th className="text-left py-2 text-text-secondary font-medium">{t('timesheet.notes')}</th>
                    <th className="text-right py-2 text-text-secondary font-medium">{t('timesheet.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheet.entries
                    .filter((entry) => {
                      if (taskFilter && entry.taskId !== taskFilter) return false
                      if (userFilter && entry.userId !== userFilter) return false
                      return true
                    })
                    .map((entry) => {
                      const dayTotal = dailyTotals[entry.entryDate] || 0
                      return (
                        <tr key={entry.id} className="border-b border-border">
                          <td className="py-2 text-text-primary">
                            {new Date(entry.entryDate).toLocaleDateString()}
                            {dayTotal > 12 && (
                              <Badge variant="warning" className="ml-2 text-xs">
                                {dayTotal.toFixed(1)}h
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 text-text-primary">
                            {entry.task?.title || t('timesheet.task')}
                          </td>
                          <td className="py-2 text-text-primary">
                            {entry.user?.fullName || t('timesheet.user')}
                          </td>
                          <td className="py-2 text-right text-text-primary">{entry.hours}</td>
                          <td className="py-2 text-text-secondary text-sm max-w-xs truncate">
                            {entry.notes || '-'}
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openEditModal(entry)}
                              >
                                {t('common.edit')}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                              >
                                {t('common.delete')}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
              {timesheet.entries.length === 0 && (
                <p className="text-text-secondary text-center py-8">{t('timesheet.noEntries')}</p>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {timesheet.entries
                .filter((entry) => {
                  if (taskFilter && entry.taskId !== taskFilter) return false
                  if (userFilter && entry.userId !== userFilter) return false
                  return true
                })
                .map((entry) => {
                  const dayTotal = dailyTotals[entry.entryDate] || 0
                  return (
                    <div key={entry.id} className="border border-border rounded-md p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-text-primary font-medium">
                              {new Date(entry.entryDate).toLocaleDateString()}
                            </span>
                            {dayTotal > 12 && (
                              <Badge variant="warning" className="text-xs">
                                {dayTotal.toFixed(1)}h
                              </Badge>
                            )}
                          </div>
                          <p className="text-text-primary font-semibold">
                            {entry.task?.title || t('timesheet.task')}
                          </p>
                          <p className="text-text-secondary text-sm">
                            {entry.user?.fullName || t('timesheet.user')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-text-primary font-semibold">{entry.hours}h</p>
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="text-text-secondary text-sm break-words">{entry.notes}</p>
                      )}
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(entry)}
                          className="flex-1"
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                          className="flex-1"
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              {timesheet.entries.length === 0 && (
                <p className="text-text-secondary text-center py-8">{t('timesheet.noEntries')}</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-text-secondary text-center py-8">{t('common.loading')}</p>
        )}
      </Card>

      {timesheet && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-sm text-text-secondary mb-2">{t('timesheet.totalHours')}</h3>
            <p className="text-2xl font-bold text-text-primary">
              {Object.values(timesheet.totalsPerDay).reduce((sum, hours) => sum + hours, 0).toFixed(1)}
            </p>
          </Card>
          <Card>
            <h3 className="text-sm text-text-secondary mb-2">{t('timesheet.projects')}</h3>
            <div className="space-y-1">
              {Object.entries(timesheet.totalsPerProject).slice(0, 5).map(([projectId, hours]) => {
                const project = projects?.data.find((p) => p.id === projectId)
                return (
                  <div key={projectId} className="flex justify-between text-sm">
                    <span className="text-text-secondary truncate">{project?.name || projectId}</span>
                    <span className="text-text-primary font-medium">{hours.toFixed(1)}h</span>
                  </div>
                )
              })}
            </div>
          </Card>
          <Card>
            <h3 className="text-sm text-text-secondary mb-2">{t('timesheet.tasks')}</h3>
            <div className="space-y-1">
              {Object.entries(timesheet.totalsPerTask).slice(0, 5).map(([taskId, hours]) => {
                const task = tasks?.data.find((t) => t.id === taskId)
                return (
                  <div key={taskId} className="flex justify-between text-sm">
                    <span className="text-text-secondary truncate">{task?.title || taskId}</span>
                    <span className="text-text-primary font-medium">{hours.toFixed(1)}h</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEntry ? t('timesheet.editTimeEntry') : t('timesheet.addTimeEntry')}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label={`${t('timesheet.user')} *`}
            {...register('userId')}
            error={errors.userId?.message}
            options={[
              { value: '', label: t('timesheet.allUsers') },
              ...(users?.map((u) => ({ value: u.id, label: u.fullName })) || []),
            ]}
          />
          <Select
            label={t('timesheet.projects')}
            value={selectedProjectId || ''}
            onChange={(e) => {
              setProjectFilter(e.target.value)
              setTaskFilter('')
            }}
            options={[
              { value: '', label: t('timesheet.allProjects') },
              ...(projects?.data.map((p) => ({ value: p.id, label: p.name })) || []),
            ]}
          />
          <Select
            label={`${t('timesheet.task')} *`}
            {...register('taskId')}
            error={errors.taskId?.message}
            options={[
              { value: '', label: t('timesheet.allTasks') },
              ...(tasks?.data
                .filter((t) => !projectFilter || t.projectId === projectFilter)
                .map((t) => ({ value: t.id, label: t.title })) || []),
            ]}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`${t('timesheet.date')} *`}
              type="date"
              {...register('entryDate')}
              error={errors.entryDate?.message}
            />
            <Input
              label={`${t('timesheet.hours')} *`}
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              {...register('hours', { valueAsNumber: true })}
              error={errors.hours?.message}
            />
          </div>
          <Textarea
            label={t('timesheet.notes')}
            {...register('notes')}
            error={errors.notes?.message}
          />
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingEntry ? t('common.update') : t('common.create')}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
