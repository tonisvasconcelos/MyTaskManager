import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { apiClient, setUserToken } from '../shared/api/client'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useNavigate } from 'react-router-dom'

// Logo image - using public path that works with GitHub Pages base URL
// BASE_URL already includes trailing slash, so we don't need another one
const logoPath = `${import.meta.env.BASE_URL || '/'}images/Itaskoralogo.png`

const loginSchema = z.object({
  tenant: z.string().min(2, 'Tenant is required').max(32),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars').max(128),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenant: '',
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    try {
      const result = await apiClient.post<{ token: string; user?: any }>('/auth/login', {
        tenant: data.tenant,
        email: data.email,
        password: data.password,
      })
      
      if (result.token) {
        setUserToken(result.token)
        navigate('/', { replace: true })
      } else {
        setError(t('login.error'))
      }
    } catch (e: any) {
      console.error('Login error:', e)
      // Provide more specific error messages
      if (e instanceof Error) {
        if (e.message.includes('connect') || e.message.includes('network') || e.message.includes('fetch')) {
          setError('Unable to connect to the server. Please check your network connection and ensure the API service is running.')
        } else if (e.message.includes('500') || e.message.includes('Server error')) {
          setError('Server error occurred. Please contact support or try again later.')
        } else {
          setError(e.message || t('login.error'))
        }
      } else {
        setError(e?.message || t('login.error'))
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center min-h-[160px] items-center">
            <img 
              src={logoPath}
              alt="IT Project Company Manager System" 
              className="h-32 md:h-40 w-auto max-w-full object-contain"
              onError={(e) => {
                // Fallback if image fails to load
                console.error('Failed to load logo:', logoPath);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-base font-normal text-text-primary">{t('login.title')}</h1>
          <p className="text-text-secondary mt-2">{t('login.subtitle')}</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label={t('login.tenant')} {...register('tenant')} error={errors.tenant?.message} />
            <Input label={t('login.email')} type="email" {...register('email')} error={errors.email?.message} />
            <Input
              label={t('login.password')}
              type="password"
              {...register('password')}
              error={errors.password?.message}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {t('login.signIn')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

