import { useState } from 'react'
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
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting project:', error)
        alert('Cannot delete project with associated tasks')
      }
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Projects</h1>
        <Button onClick={openCreateModal}>Create Project</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder="Search projects..."
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
            { value: '', label: 'All Companies' },
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
            { value: '', label: 'All Statuses' },
            { value: 'Planned', label: 'Planned' },
            { value: 'Active', label: 'Active' },
            { value: 'OnHold', label: 'On Hold' },
            { value: 'Completed', label: 'Completed' },
            { value: 'Cancelled', label: 'Cancelled' },
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
                      {project.status}
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(project)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(project.id)}>
                        Delete
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
          <p className="text-text-secondary text-center py-8">No projects found</p>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? 'Edit Project' : 'Create Project'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Company *"
            {...register('companyId')}
            error={errors.companyId?.message}
            options={[
              { value: '', label: 'Select a company' },
              ...(companies?.data.map((c) => ({ value: c.id, label: c.name })) || []),
            ]}
          />
          <Input
            label="Name *"
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Description"
            {...register('description')}
            error={errors.description?.message}
          />
          <Select
            label="Status"
            {...register('status')}
            error={errors.status?.message}
            options={[
              { value: 'Planned', label: 'Planned' },
              { value: 'Active', label: 'Active' },
              { value: 'OnHold', label: 'On Hold' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              {...register('startDate')}
              error={errors.startDate?.message}
            />
            <Input
              label="Target End Date"
              type="date"
              {...register('targetEndDate')}
              error={errors.targetEndDate?.message}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingProject ? 'Update' : 'Create'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
