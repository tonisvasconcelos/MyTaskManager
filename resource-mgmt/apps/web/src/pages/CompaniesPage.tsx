import { useState } from 'react'
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from '../shared/api/companies'
import { useDebounce } from '../shared/hooks/useDebounce'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Company } from '../shared/types/api'

const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

export function CompaniesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)

  const debouncedSearch = useDebounce(search, 500)
  const { data, isLoading } = useCompanies({ search: debouncedSearch, page, pageSize: 20 })
  const createMutation = useCreateCompany()
  const updateMutation = useUpdateCompany()
  const deleteMutation = useDeleteCompany()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  })

  const openCreateModal = () => {
    setEditingCompany(null)
    reset()
    setIsModalOpen(true)
  }

  const openEditModal = (company: Company) => {
    setEditingCompany(company)
    reset({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      website: company.website || '',
      address: company.address || '',
      notes: company.notes || '',
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (data: CompanyFormData) => {
    try {
      if (editingCompany) {
        await updateMutation.mutateAsync({ id: editingCompany.id, ...data })
      } else {
        await createMutation.mutateAsync(data as any)
      }
      setIsModalOpen(false)
      reset()
    } catch (error) {
      console.error('Error saving company:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this company?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting company:', error)
        alert('Cannot delete company with associated projects')
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Companies</h1>
        <Button onClick={openCreateModal}>Create Company</Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
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
            {data.data.map((company) => (
              <Card key={company.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">{company.name}</h3>
                    <div className="text-sm text-text-secondary space-y-1">
                      {company.email && <p>📧 {company.email}</p>}
                      {company.phone && <p>📞 {company.phone}</p>}
                      {company.website && (
                        <p>
                          🌐 <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            {company.website}
                          </a>
                        </p>
                      )}
                      {company.address && <p>📍 {company.address}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(company)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(company.id)}>
                      Delete
                    </Button>
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
          <p className="text-text-secondary text-center py-8">No companies found</p>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCompany ? 'Edit Company' : 'Create Company'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name *"
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Phone"
            {...register('phone')}
            error={errors.phone?.message}
          />
          <Input
            label="Website"
            {...register('website')}
            error={errors.website?.message}
          />
          <Input
            label="Address"
            {...register('address')}
            error={errors.address?.message}
          />
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingCompany ? 'Update' : 'Create'}
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
