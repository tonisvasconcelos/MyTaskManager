import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
  createdAt: string
  updatedAt: string
}

const createUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['Admin', 'Manager', 'Contributor']).optional(),
})

type CreateUserForm = z.infer<typeof createUserSchema>

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['Admin', 'Manager', 'Contributor']).optional(),
  password: z.string().min(8).optional(),
})

type UpdateUserForm = z.infer<typeof updateUserSchema>

export function AdminTenantUsersPage() {
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
    defaultValues: { role: 'Contributor' },
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
    updateForm.reset({ fullName: u.fullName, role: u.role })
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
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Admin · Tenant Users</h1>
            <p className="text-text-secondary mt-1">Tenant id: {id}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin" className="btn-secondary">
              ← Back to tenants
            </Link>
            <Button onClick={() => setIsCreateOpen(true)}>Create user</Button>
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary">{u.fullName}</h3>
                    <p className="text-sm text-text-secondary">{u.email} · {u.role}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(u)}>
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-8">No users yet</p>
          </Card>
        )}

        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create user" size="lg">
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <Input label="Full name" {...createForm.register('fullName')} error={createForm.formState.errors.fullName?.message} />
            <Input label="Email" type="email" {...createForm.register('email')} error={createForm.formState.errors.email?.message} />
            <Input label="Password" type="password" {...createForm.register('password')} error={createForm.formState.errors.password?.message} />
            <Select
              label="Role"
              {...createForm.register('role')}
              options={[
                { value: 'Contributor', label: 'Contributor' },
                { value: 'Manager', label: 'Manager' },
                { value: 'Admin', label: 'Admin' },
              ]}
            />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createForm.formState.isSubmitting}>Create</Button>
              <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit user" size="lg">
          <form onSubmit={updateForm.handleSubmit(onUpdate)} className="space-y-4">
            <Input label="Full name" {...updateForm.register('fullName')} error={updateForm.formState.errors.fullName?.message} />
            <Select
              label="Role"
              {...updateForm.register('role')}
              options={[
                { value: 'Contributor', label: 'Contributor' },
                { value: 'Manager', label: 'Manager' },
                { value: 'Admin', label: 'Admin' },
              ]}
            />
            <Input label="Reset password (optional)" type="password" {...updateForm.register('password')} error={updateForm.formState.errors.password?.message} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={updateForm.formState.isSubmitting}>Save</Button>
              <Button variant="secondary" type="button" onClick={() => setEditingUser(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}

