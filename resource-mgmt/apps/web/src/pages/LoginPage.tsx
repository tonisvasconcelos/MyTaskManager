import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { apiClient, setUserToken } from '../shared/api/client'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useNavigate } from 'react-router-dom'

// Logo image - using public path that works with GitHub Pages base URL
// BASE_URL already includes trailing slash, so we don't need another one
const logoPath = `${import.meta.env.BASE_URL || '/'}images/LogoMakr_60iQFv.png`

const loginSchema = z.object({
  tenant: z.string().min(2, 'Tenant is required').max(32),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars').max(128),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
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
      const result = await apiClient.post<{ token: string }>('/auth/login', {
        tenant: data.tenant,
        email: data.email,
        password: data.password,
      })
      setUserToken(result.token)
      navigate('/', { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <img 
              src={logoPath}
              alt="IT Project Company Manager System" 
              className="h-24 w-auto max-w-full"
              onError={(e) => {
                // Fallback if image fails to load
                console.error('Failed to load logo:', logoPath);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-base font-normal text-text-primary">IT Project Company Manager System</h1>
          <p className="text-text-secondary mt-2">Sign in to your tenant</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Tenant" {...register('tenant')} error={errors.tenant?.message} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <Input
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

