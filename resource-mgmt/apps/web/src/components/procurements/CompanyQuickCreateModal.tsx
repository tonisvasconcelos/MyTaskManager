import { useTranslation } from 'react-i18next'
import { useCreateCompany, useCompanies } from '../../shared/api/companies'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const companyQuickCreateSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
})

type CompanyQuickCreateForm = z.infer<typeof companyQuickCreateSchema>

interface CompanyQuickCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (companyId: string) => void
}

export function CompanyQuickCreateModal({ isOpen, onClose, onSuccess }: CompanyQuickCreateModalProps) {
  const { t } = useTranslation()
  const createMutation = useCreateCompany()
  const { refetch: refetchCompanies } = useCompanies({ page: 1, pageSize: 100 })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyQuickCreateForm>({
    resolver: zodResolver(companyQuickCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  })

  const onSubmit = async (data: CompanyQuickCreateForm) => {
    try {
      const newCompany = await createMutation.mutateAsync({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
      })
      await refetchCompanies()
      reset()
      onSuccess(newCompany.id)
      onClose()
    } catch (error) {
      console.error('Error creating company:', error)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('procurements.addNewCompany')}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={`${t('companies.name')} *`}
          {...register('name')}
          error={errors.name?.message}
        />
        <Input
          label={t('companies.email')}
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label={t('companies.phone')}
          {...register('phone')}
          error={errors.phone?.message}
        />
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={createMutation.isPending}>
            {t('common.create')}
          </Button>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
