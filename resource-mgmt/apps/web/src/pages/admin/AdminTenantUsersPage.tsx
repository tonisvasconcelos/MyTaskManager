import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { apiClient, isAdminLoggedIn } from '../../shared/api/client'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'

type User = {
  id: string
  fullName: string
  email: string
  role: 'Admin' | 'Manager' | 'Contributor'
  language?: 'EN' | 'PT_BR' | null
  createdAt: string
  updatedAt: string
}

const createUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['Admin', 'Manager', 'Contributor']).optional(),
  language: z.enum(['EN', 'PT_BR']).optional(),
})

type CreateUserForm = z.infer<typeof createUserSchema>

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['Admin', 'Manager', 'Contributor']).optional(),
  password: z.string().min(8).optional(),
  language: z.enum(['EN', 'PT_BR']).optional(),
})

type UpdateUserForm = z.infer<typeof updateUserSchema>

export function AdminTenantUsersPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const canView = isAdminLoggedIn()
  if (!canView) return <Navigate to="/admin/login" replace />
  if (!id) return <Navigate to="/admin" replace />

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiClient.get<User[]>(`/admin/tenants/${id}/users`)
      setUsers(result)
    } catch (e: any) {
      setError(e?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'Contributor', language: 'EN' },
  })

  const updateForm = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
  })

  const onCreate = async (data: CreateUserForm) => {
    setError(null)
    try {
      await apiClient.post(`/admin/tenants/${id}/users`, { ...data, role: data.role || 'Contributor' })
      setIsCreateOpen(false)
      createForm.reset()
      await load()
    } catch (e: any) {
      setError(e?.message || 'Create failed')
    }
  }

  const openEdit = (u: User) => {
    setEditingUser(u)
    updateForm.reset({ fullName: u.fullName, role: u.role, language: u.language || 'EN' })
  }

  const onUpdate = async (data: UpdateUserForm) => {
    if (!editingUser) return
    setError(null)
    try {
      await apiClient.put(`/admin/users/${editingUser.id}`, data)
      setEditingUser(null)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{t('admin.users.title')}</h1>
            <p className="text-text-secondary mt-1 break-all">Tenant id: {id}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link to="/admin" className="btn-secondary text-center">
              ← {t('admin.tenants.backToApp')}
            </Link>
            <Button onClick={() => setIsCreateOpen(true)}>{t('admin.users.createUser')}</Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : users.length > 0 ? (
          <div className="space-y-3">
            {users.map((u) => (
              <Card key={u.id}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary break-words">{u.fullName}</h3>
                    <p className="text-sm text-text-secondary break-words">{u.email} · {u.role}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(u)} className="self-start sm:self-auto">
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-8">{t('admin.users.noUsers')}</p>
          </Card>
        )}

        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t('admin.users.createUser')} size="lg">
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <Input label={t('admin.users.fullName')} {...createForm.register('fullName')} error={createForm.formState.errors.fullName?.message} />
            <Input label={t('admin.users.email')} type="email" {...createForm.register('email')} error={createForm.formState.errors.email?.message} />
            <Input label={t('admin.users.password')} type="password" {...createForm.register('password')} error={createForm.formState.errors.password?.message} />
            <Select
              label={t('admin.users.role')}
              {...createForm.register('role')}
              options={[
                { value: 'Contributor', label: t('role.contributor') },
                { value: 'Manager', label: t('role.manager') },
                { value: 'Admin', label: t('role.admin') },
              ]}
            />
            <Select
              label={t('admin.users.language')}
              {...createForm.register('language')}
              options={[
                { value: 'EN', label: t('common.english') },
                { value: 'PT_BR', label: t('common.portuguese') },
              ]}
            />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createForm.formState.isSubmitting}>{t('common.create')}</Button>
              <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={t('admin.users.editUser')} size="lg">
          <form onSubmit={updateForm.handleSubmit(onUpdate)} className="space-y-4">
            <Input label={t('admin.users.fullName')} {...updateForm.register('fullName')} error={updateForm.formState.errors.fullName?.message} />
            <Select
              label={t('admin.users.role')}
              {...updateForm.register('role')}
              options={[
                { value: 'Contributor', label: t('role.contributor') },
                { value: 'Manager', label: t('role.manager') },
                { value: 'Admin', label: t('role.admin') },
              ]}
            />
            <Select
              label={t('admin.users.language')}
              {...updateForm.register('language')}
              options={[
                { value: 'EN', label: t('common.english') },
                { value: 'PT_BR', label: t('common.portuguese') },
              ]}
            />
            <Input label={t('admin.users.resetPassword')} type="password" {...updateForm.register('password')} error={updateForm.formState.errors.password?.message} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={updateForm.formState.isSubmitting}>{t('common.save')}</Button>
              <Button variant="secondary" type="button" onClick={() => setEditingUser(null)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}

