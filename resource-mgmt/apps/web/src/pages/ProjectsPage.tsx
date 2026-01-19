import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../shared/api/projects'
import { useCompanies } from '../shared/api/companies'
import { useDebounce } from '../shared/hooks/useDebounce'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Project } from '../shared/types/api'

const projectSchema = z.object({
  companyId: z.string().min(1, 'Company is required').uuid('Company is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.enum(['Planned', 'Active', 'OnHold', 'Completed', 'Cancelled']).optional(),
  startDate: z.string().optional().or(z.literal('')),
  targetEndDate: z.string().optional().or(z.literal('')),
})

type ProjectFormData = z.infer<typeof projectSchema>

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  Planned: 'info',
  Active: 'success',
  OnHold: 'warning',
  Completed: 'default',
  Cancelled: 'danger',
}

export function ProjectsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const debouncedSearch = useDebounce(search, 500)
  const { data, isLoading } = useProjects({
    search: debouncedSearch,
    companyId: companyFilter || undefined,
    status: statusFilter || undefined,
    page,
    pageSize: 20,
  })
  const { data: companies } = useCompanies({ page: 1, pageSize: 100 })
  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()
  const deleteMutation = useDeleteProject()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  })

  const openCreateModal = () => {
    setEditingProject(null)
    reset()
    setIsModalOpen(true)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    reset({
      companyId: project.companyId,
      name: project.name,
      description: project.description || '',
      status: project.status,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      targetEndDate: project.targetEndDate ? new Date(project.targetEndDate).toISOString().split('T')[0] : '',
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const payload: any = {
        ...data,
        startDate: data.startDate || null,
        targetEndDate: data.targetEndDate || null,
      }
      if (editingProject) {
        await updateMutation.mutateAsync({ id: editingProject.id, ...payload })
      } else {
        await createMutation.mutateAsync(payload as any)
      }
      setIsModalOpen(false)
      reset()
    } catch (error) {
      console.error('Error saving project:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('projects.deleteConfirm'))) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting project:', error)
        alert(t('projects.deleteError'))
      }
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('projects.title')}</h1>
        <Button onClick={openCreateModal}>{t('projects.createProject')}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder={t('projects.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <Select
          value={companyFilter}
          onChange={(e) => {
            setCompanyFilter(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: t('projects.allCompanies') },
            ...(companies?.data.map((c) => ({ value: c.id, label: c.name })) || []),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: t('projects.allStatuses') },
            { value: 'Planned', label: t('status.Planned') },
            { value: 'Active', label: t('status.Active') },
            { value: 'OnHold', label: t('status.OnHold') },
            { value: 'Completed', label: t('status.Completed') },
            { value: 'Cancelled', label: t('status.Cancelled') },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className="space-y-3 mb-6">
            {data.data.map((project) => (
              <Card key={project.id}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link to={`/projects/${project.id}`}>
                      <h3 className="text-lg font-semibold text-text-primary mb-2 hover:text-accent transition-colors break-words">
                        {project.name}
                      </h3>
                    </Link>
                    {project.description && (
                      <p className="text-sm text-text-secondary mb-2 break-words">{project.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 md:gap-4 text-sm text-text-secondary">
                      <span>{project.company?.name}</span>
                      {project.startDate && (
                        <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                      )}
                      {project.targetEndDate && (
                        <span>Target: {new Date(project.targetEndDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <Badge variant={statusColors[project.status] || 'default'} className="self-start">
                      {t(`status.${project.status}`)}
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(project)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(project.id)}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={data.pagination.page}
            pageSize={data.pagination.pageSize}
            total={data.pagination.total}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <Card>
          <p className="text-text-secondary text-center py-8">{t('common.noData')}</p>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? t('projects.editProject') : t('projects.createProject')}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label={`${t('projects.company')} *`}
            {...register('companyId')}
            error={errors.companyId?.message}
            options={[
              { value: '', label: t('projects.allCompanies') },
              ...(companies?.data.map((c) => ({ value: c.id, label: c.name })) || []),
            ]}
          />
          <Input
            label={`${t('projects.name')} *`}
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label={t('projects.description')}
            {...register('description')}
            error={errors.description?.message}
          />
          <Select
            label={t('projects.status')}
            {...register('status')}
            error={errors.status?.message}
            options={[
              { value: 'Planned', label: t('status.Planned') },
              { value: 'Active', label: t('status.Active') },
              { value: 'OnHold', label: t('status.OnHold') },
              { value: 'Completed', label: t('status.Completed') },
              { value: 'Cancelled', label: t('status.Cancelled') },
            ]}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('projects.startDate')}
              type="date"
              {...register('startDate')}
              error={errors.startDate?.message}
            />
            <Input
              label={t('projects.targetEndDate')}
              type="date"
              {...register('targetEndDate')}
              error={errors.targetEndDate?.message}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingProject ? t('common.update') : t('common.create')}
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
