import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { apiClient, setAdminToken } from '../../shared/api/client'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useNavigate } from 'react-router-dom'

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

type AdminLoginForm = z.infer<typeof adminLoginSchema>

export function AdminLoginPage() {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
  })

  const onSubmit = async (data: AdminLoginForm) => {
    setError(null)
    try {
      const result = await apiClient.post<{ token: string }>('/admin/login', data)
      setAdminToken(result.token)
      navigate('/admin', { replace: true })
    } catch (e: any) {
      setError(e?.message || t('admin.login.error'))
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-text-primary">{t('admin.login.title')}</h1>
          <p className="text-text-secondary mt-2">{t('admin.login.subtitle')}</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label={t('admin.login.email')} type="email" {...register('email')} error={errors.email?.message} />
            <Input
              label={t('admin.login.password')}
              type="password"
              {...register('password')}
              error={errors.password?.message}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {t('admin.login.signIn')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

