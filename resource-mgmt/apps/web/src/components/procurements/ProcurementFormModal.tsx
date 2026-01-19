import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateProcurement, useUpdateProcurement } from '../../shared/api/procurements'
import { useCompanies } from '../../shared/api/companies'
import { useProjects } from '../../shared/api/projects'
import { CompanyQuickCreateModal } from './CompanyQuickCreateModal'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Expense } from '../../shared/types/api'

const allocationSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  allocatedAmount: z.union([z.string(), z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    if (isNaN(num) || num <= 0) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['allocatedAmount'],
          message: 'Allocated amount must be a positive number',
        },
      ])
    }
    return num
  }),
})

const procurementSchema = z
  .object({
    companyId: z.string().uuid('Company is required'),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    date: z.string().min(1, 'Date is required'),
    totalAmount: z.union([z.string(), z.number()]).transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val
      if (isNaN(num) || num <= 0) {
        throw new z.ZodError([
          {
            code: 'custom',
            path: ['totalAmount'],
            message: 'Total amount must be a positive number',
          },
        ])
      }
      return num
    }),
    paymentMethod: z.enum(['CORPORATE_CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'OTHER']),
    status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID']),
    notes: z.string().optional(),
    allocations: z.array(allocationSchema).min(1, 'At least one allocation is required'),
  })
  .refine(
    (data) => {
      const total = typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(data.totalAmount)
      const sum = data.allocations.reduce((acc, alloc) => {
        const amount = typeof alloc.allocatedAmount === 'number' ? alloc.allocatedAmount : parseFloat(alloc.allocatedAmount)
        return acc + amount
      }, 0)
      return Math.abs(total - sum) < 0.01
    },
    {
      message: 'Sum of allocations must equal total amount',
      path: ['allocations'],
    }
  )
  .refine(
    (data) => {
      const projectIds = data.allocations.map((a) => a.projectId)
      return new Set(projectIds).size === projectIds.length
    },
    {
      message: 'Duplicate project IDs in allocations',
      path: ['allocations'],
    }
  )

type ProcurementFormData = z.infer<typeof procurementSchema>

interface ProcurementFormModalProps {
  isOpen: boolean
  onClose: () => void
  expense?: Expense | null
}

export function ProcurementFormModal({ isOpen, onClose, expense }: ProcurementFormModalProps) {
  const { t } = useTranslation()
  const createMutation = useCreateProcurement()
  const updateMutation = useUpdateProcurement()
  const { data: companiesData } = useCompanies({ page: 1, pageSize: 100 })
  const { data: projectsData } = useProjects({ page: 1, pageSize: 100 })
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)

  const companies = companiesData?.data || []
  const projects = projectsData?.data || []

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    reset,
    setValue,
  } = useForm<ProcurementFormData>({
    resolver: zodResolver(procurementSchema),
    defaultValues: {
      companyId: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      paymentMethod: 'CORPORATE_CREDIT_CARD',
      status: 'PENDING',
      notes: '',
      allocations: [{ projectId: '', allocatedAmount: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'allocations',
  })

  const totalAmount = watch('totalAmount')
  const allocations = watch('allocations')

  // Calculate sum of allocations
  const allocatedSum = allocations.reduce((sum, alloc) => {
    const amount = typeof alloc.allocatedAmount === 'number' ? alloc.allocatedAmount : parseFloat(alloc.allocatedAmount || '0')
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  const remaining = (typeof totalAmount === 'number' ? totalAmount : parseFloat(totalAmount || '0')) - allocatedSum

  useEffect(() => {
    if (expense && isOpen) {
      reset({
        companyId: expense.companyId,
        invoiceNumber: expense.invoiceNumber,
        date: new Date(expense.date).toISOString().split('T')[0],
        totalAmount: parseFloat(expense.totalAmount),
        paymentMethod: expense.paymentMethod,
        status: expense.status,
        notes: expense.notes || '',
        allocations:
          expense.allocations && expense.allocations.length > 0
            ? expense.allocations.map((alloc) => ({
                projectId: alloc.projectId,
                allocatedAmount: parseFloat(alloc.allocatedAmount),
              }))
            : [{ projectId: '', allocatedAmount: 0 }],
      })
    } else if (!expense && isOpen) {
      reset({
        companyId: '',
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        paymentMethod: 'CORPORATE_CREDIT_CARD',
        status: 'PENDING',
        notes: '',
        allocations: [{ projectId: '', allocatedAmount: 0 }],
      })
    }
  }, [expense, isOpen, reset])

  const onSubmit = async (data: ProcurementFormData) => {
    try {
      const payload = {
        ...data,
        totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount.toString() : data.totalAmount,
        allocations: data.allocations.map((alloc) => ({
          projectId: alloc.projectId,
          allocatedAmount: typeof alloc.allocatedAmount === 'number' ? alloc.allocatedAmount : parseFloat(alloc.allocatedAmount),
        })),
      }

      if (expense) {
        await updateMutation.mutateAsync({ id: expense.id, ...payload } as any)
      } else {
        await createMutation.mutateAsync(payload as any)
      }
      onClose()
      reset()
    } catch (error) {
      console.error('Error saving expense:', error)
    }
  }

  const handleCompanyCreated = (companyId: string) => {
    setValue('companyId', companyId)
  setIsCompanyModalOpen(false)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={expense ? t('procurements.editExpense') : t('procurements.createExpense')}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label={`${t('procurements.vendor')} *`}
                {...register('companyId')}
                error={errors.companyId?.message}
                options={[
                  { value: '', label: t('common.all') },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCompanyModalOpen(true)}
            >
              {t('procurements.addNewCompany')}
            </Button>
          </div>

          <Input
            label={`${t('procurements.invoiceNumber')} *`}
            {...register('invoiceNumber')}
            error={errors.invoiceNumber?.message}
          />

          <Input
            label={`${t('procurements.date')} *`}
            type="date"
            {...register('date')}
            error={errors.date?.message}
          />

          <Input
            label={`${t('procurements.totalAmount')} *`}
            type="number"
            step="0.01"
            min="0"
            {...register('totalAmount', { valueAsNumber: true })}
            error={errors.totalAmount?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t('procurements.paymentMethod')}
              {...register('paymentMethod')}
              error={errors.paymentMethod?.message}
              options={[
                { value: 'CORPORATE_CREDIT_CARD', label: t('paymentMethod.CORPORATE_CREDIT_CARD') },
                { value: 'BANK_TRANSFER', label: t('paymentMethod.BANK_TRANSFER') },
                { value: 'PAYPAL', label: t('paymentMethod.PAYPAL') },
                { value: 'OTHER', label: t('paymentMethod.OTHER') },
              ]}
            />
            <Select
              label={t('procurements.paymentStatus')}
              {...register('status')}
              error={errors.status?.message}
              options={[
                { value: 'PENDING', label: t('paymentStatus.PENDING') },
                { value: 'PARTIALLY_PAID', label: t('paymentStatus.PARTIALLY_PAID') },
                { value: 'PAID', label: t('paymentStatus.PAID') },
              ]}
            />
          </div>

          <Textarea
            label={t('procurements.notes')}
            {...register('notes')}
            error={errors.notes?.message}
          />

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-text-primary">
                {t('procurements.allocateToProjects')} *
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ projectId: '', allocatedAmount: 0 })}
              >
                {t('procurements.addAllocation')}
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Select
                  label={t('procurements.project')}
                  {...register(`allocations.${index}.projectId`)}
                  error={errors.allocations?.[index]?.projectId?.message}
                  options={[
                    { value: '', label: t('common.all') },
                    ...projects.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
                <Input
                  label={t('procurements.allocatedAmount')}
                  type="number"
                  step="0.01"
                  min="0"
                  {...register(`allocations.${index}.allocatedAmount`, { valueAsNumber: true })}
                  error={errors.allocations?.[index]?.allocatedAmount?.message}
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    {t('procurements.removeAllocation')}
                  </Button>
                </div>
              </div>
            ))}

            {errors.allocations && typeof errors.allocations.message === 'string' && (
              <p className="text-sm text-red-400 mb-2">{errors.allocations.message}</p>
            )}

            <div className="mt-4 p-3 bg-surface border border-border rounded-md">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t('procurements.totalAllocated')}:</span>
                <span className="text-text-primary font-medium">{allocatedSum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-text-secondary">{t('procurements.remaining')}:</span>
                <span className={`font-medium ${Math.abs(remaining) < 0.01 ? 'text-green-400' : 'text-red-400'}`}>
                  {remaining.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {expense ? t('common.update') : t('common.create')}
            </Button>
            <Button variant="secondary" type="button" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      <CompanyQuickCreateModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSuccess={handleCompanyCreated}
      />
    </>
  )
}
