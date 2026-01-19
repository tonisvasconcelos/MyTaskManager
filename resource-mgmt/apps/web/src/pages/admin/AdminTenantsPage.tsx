import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { apiClient, clearAdminToken, isAdminLoggedIn } from '../../shared/api/client'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { Skeleton } from '../../components/ui/Skeleton'
import { Badge } from '../../components/ui/Badge'
import { Link, Navigate, useNavigate } from 'react-router-dom'

type Tenant = {
  id: string
  slug: string
  name: string | null
  planName: string
  maxUsers: number
  activeUntil: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type Paginated<T> = {
  data: T[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

const tenantSchema = z.object({
  slug: z.string().min(2).max(32),
  name: z.string().optional(),
  planName: z.string().min(1).max(30),
  maxUsers: z.number().int().positive(),
  activeUntil: z.string().optional().or(z.literal('')),
  isActive: z.boolean(),
})

type TenantForm = z.infer<typeof tenantSchema>

export function AdminTenantsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<Tenant> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      slug: '',
      name: '',
      planName: 'Starter',
      maxUsers: 5,
      activeUntil: '',
      isActive: true,
    },
  })

  const canView = isAdminLoggedIn()
  if (!canView) return <Navigate to="/admin/login" replace />

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiClient.get<Paginated<Tenant>>('/admin/tenants', {
        search: search || undefined,
        page,
        pageSize: 20,
      })
      setData(result)
    } catch (e: any) {
      setError(e?.message || 'Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const openCreate = () => {
    setEditing(null)
    reset({
      slug: '',
      name: '',
      planName: 'Starter',
      maxUsers: 5,
      activeUntil: '',
      isActive: true,
    })
    setIsModalOpen(true)
  }

  const openEdit = (t: Tenant) => {
    setEditing(t)
    reset({
      slug: t.slug,
      name: t.name || '',
      planName: t.planName,
      maxUsers: t.maxUsers,
      activeUntil: t.activeUntil ? t.activeUntil.split('T')[0] : '',
      isActive: t.isActive,
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (form: TenantForm) => {
    setError(null)
    try {
      const payload: any = {
        name: form.name || null,
        planName: form.planName,
        maxUsers: form.maxUsers,
        isActive: form.isActive,
        activeUntil: form.activeUntil ? new Date(form.activeUntil).toISOString() : null,
      }

      if (editing) {
        await apiClient.put(`/admin/tenants/${editing.id}`, payload)
      } else {
        await apiClient.post('/admin/tenants', { ...payload, slug: form.slug })
      }

      setIsModalOpen(false)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{t('admin.tenants.title')}</h1>
            <p className="text-text-secondary mt-1">{t('admin.tenants.subtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => navigate('/')}>
              {t('admin.tenants.backToApp')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                clearAdminToken()
                window.location.href = '#/admin/login'
              }}
            >
              {t('admin.tenants.signOut')}
            </Button>
            <Button onClick={openCreate}>{t('admin.tenants.createTenant')}</Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t('admin.tenants.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => {
              setPage(1)
              load()
            }}
          >
            {t('admin.tenants.search')}
          </Button>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="space-y-3">
              {data.data.map((tenant) => (
                <Card key={tenant.id}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <h3 className="text-lg font-semibold text-text-primary break-words">{tenant.slug}</h3>
                        <Badge variant={tenant.isActive ? 'success' : 'danger'}>
                          {tenant.isActive ? t('admin.tenants.active') : 'Inactive'}
                        </Badge>
                        {tenant.activeUntil && (
                          <Badge variant="warning">
                            {t('admin.tenants.activeUntil')} {new Date(tenant.activeUntil).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-1 break-words">
                        {tenant.name || '—'} · {tenant.planName} · {t('admin.tenants.maxUsers')} {tenant.maxUsers}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link to={`/admin/tenants/${tenant.id}`} className="btn-secondary text-center">
                        {t('admin.tenants.manageUsers')}
                      </Link>
                      <Button variant="secondary" size="sm" onClick={() => openEdit(tenant)}>
                        {t('admin.tenants.editLicense')}
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
            <p className="text-text-secondary text-center py-8">{t('admin.tenants.noTenants')}</p>
          </Card>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? t('admin.tenants.editTenantLicense') : t('admin.tenants.createTenant')}
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!editing && (
              <Input label={t('admin.tenants.tenantSlug')} {...register('slug')} error={errors.slug?.message} />
            )}
            <Input label={t('admin.tenants.name')} {...register('name')} error={errors.name?.message} />
            <Input label={t('admin.tenants.plan')} {...register('planName')} error={errors.planName?.message} />
            <Input
              label={t('admin.tenants.maxUsers')}
              type="number"
              {...register('maxUsers', { valueAsNumber: true })}
              error={errors.maxUsers?.message}
            />
            <Input label={t('admin.tenants.activeUntil')} type="date" {...register('activeUntil')} />

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" {...register('isActive')} />
              {t('admin.tenants.active')}
            </label>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {editing ? t('common.save') : t('common.create')}
              </Button>
              <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}

