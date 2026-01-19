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
  allocatedAmount: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined
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
  allocatedPercentage: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = typeof val === 'string' ? parseFloat(val) : val
    if (isNaN(num) || num < 0 || num > 100) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['allocatedPercentage'],
          message: 'Allocated percentage must be between 0 and 100',
        },
      ])
    }
    return num
  }),
}).refine(
  (data) => {
    // Either allocatedAmount or allocatedPercentage must be provided, but not both
    const hasAmount = data.allocatedAmount !== undefined && data.allocatedAmount !== null
    const hasPercentage = data.allocatedPercentage !== undefined && data.allocatedPercentage !== null
    return hasAmount !== hasPercentage // XOR: exactly one must be provided
  },
  {
    message: 'Either allocated amount or allocated percentage must be provided, but not both',
    path: ['allocatedAmount'],
  }
)

const procurementSchema = z
  .object({
    companyId: z.string().uuid('Company is required'),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    date: z.string().min(1, 'Date is required'),
    dueDate: z.string().optional().nullable(),
    refStartDate: z.string().optional().nullable(),
    refEndDate: z.string().optional().nullable(),
    invoiceCurrencyCode: z.string().max(3, 'Currency code must be 3 characters').optional().nullable(),
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
        if (alloc.allocatedAmount !== undefined && alloc.allocatedAmount !== null) {
          const amount = typeof alloc.allocatedAmount === 'number' ? alloc.allocatedAmount : parseFloat(alloc.allocatedAmount)
          return acc + amount
        } else if (alloc.allocatedPercentage !== undefined && alloc.allocatedPercentage !== null) {
          const percentage = typeof alloc.allocatedPercentage === 'number' ? alloc.allocatedPercentage : parseFloat(alloc.allocatedPercentage)
          return acc + (total * percentage / 100)
        }
        return acc
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
      dueDate: null,
      refStartDate: null,
      refEndDate: null,
      invoiceCurrencyCode: null,
      totalAmount: 0,
      paymentMethod: 'CORPORATE_CREDIT_CARD',
      status: 'PENDING',
      notes: '',
      allocations: [{ projectId: '', allocatedAmount: undefined, allocatedPercentage: undefined }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'allocations',
  })

  const totalAmount = watch('totalAmount')
  const allocations = watch('allocations')

  // Calculate sum of allocations (from amounts or percentages)
  const allocatedSum = allocations.reduce((sum, alloc) => {
    const total = typeof totalAmount === 'number' ? totalAmount : parseFloat(totalAmount || '0')
    
    if (alloc.allocatedAmount !== undefined && alloc.allocatedAmount !== null) {
      const amount = typeof alloc.allocatedAmount === 'number' ? alloc.allocatedAmount : parseFloat(alloc.allocatedAmount || '0')
      return sum + (isNaN(amount) ? 0 : amount)
    } else if (alloc.allocatedPercentage !== undefined && alloc.allocatedPercentage !== null) {
      const percentage = typeof alloc.allocatedPercentage === 'number' ? alloc.allocatedPercentage : parseFloat(alloc.allocatedPercentage || '0')
      return sum + (total * percentage / 100)
    }
    return sum
  }, 0)

  const remaining = (typeof totalAmount === 'number' ? totalAmount : parseFloat(totalAmount || '0')) - allocatedSum

  useEffect(() => {
    if (expense && isOpen) {
      reset({
        companyId: expense.companyId,
        invoiceNumber: expense.invoiceNumber,
        date: new Date(expense.date).toISOString().split('T')[0],
        dueDate: expense.dueDate ? new Date(expense.dueDate).toISOString().split('T')[0] : null,
        refStartDate: expense.refStartDate ? new Date(expense.refStartDate).toISOString().split('T')[0] : null,
        refEndDate: expense.refEndDate ? new Date(expense.refEndDate).toISOString().split('T')[0] : null,
        invoiceCurrencyCode: expense.invoiceCurrencyCode || null,
        totalAmount: parseFloat(expense.totalAmount),
        paymentMethod: expense.paymentMethod,
        status: expense.status,
        notes: expense.notes || '',
        allocations:
          expense.allocations && expense.allocations.length > 0
            ? expense.allocations.map((alloc) => ({
                projectId: alloc.projectId,
                allocatedAmount: alloc.allocatedAmount ? parseFloat(alloc.allocatedAmount) : undefined,
                allocatedPercentage: alloc.allocatedPercentage ? parseFloat(alloc.allocatedPercentage) : undefined,
              }))
            : [{ projectId: '', allocatedAmount: undefined, allocatedPercentage: undefined }],
      })
    } else if (!expense && isOpen) {
      reset({
        companyId: '',
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: null,
        refStartDate: null,
        refEndDate: null,
        invoiceCurrencyCode: null,
        totalAmount: 0,
        paymentMethod: 'CORPORATE_CREDIT_CARD',
        status: 'PENDING',
        notes: '',
        allocations: [{ projectId: '', allocatedAmount: undefined, allocatedPercentage: undefined }],
      })
    }
  }, [expense, isOpen, reset])

  const onSubmit = async (data: ProcurementFormData) => {
    try {
      const payload = {
        ...data,
        totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount.toString() : data.totalAmount,
        dueDate: data.dueDate || null,
        refStartDate: data.refStartDate || null,
        refEndDate: data.refEndDate || null,
        invoiceCurrencyCode: data.invoiceCurrencyCode || null,
        allocations: data.allocations.map((alloc) => {
          // Check if values exist and are not empty strings
          const amountValue = alloc.allocatedAmount
          const percentageValue = alloc.allocatedPercentage
          const hasAmount = amountValue !== undefined && amountValue !== null && amountValue !== ''
          const hasPercentage = percentageValue !== undefined && percentageValue !== null && percentageValue !== ''
          
          // Only include the field that has a value, omit the other one completely
          const allocationData: any = {
            projectId: alloc.projectId,
          }
          
          if (hasAmount) {
            const amount = typeof amountValue === 'number' 
              ? amountValue 
              : parseFloat(String(amountValue).replace(',', '.'))
            if (!isNaN(amount) && amount > 0) {
              allocationData.allocatedAmount = amount
            }
          } else if (hasPercentage) {
            const percentage = typeof percentageValue === 'number'
              ? percentageValue
              : parseFloat(String(percentageValue).replace(',', '.'))
            if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
              allocationData.allocatedPercentage = percentage
            }
          }
          
          return allocationData
        }),
      }

      if (expense) {
        await updateMutation.mutateAsync({ id: expense.id, ...payload } as any)
      } else {
        await createMutation.mutateAsync(payload as any)
      }
      onClose()
      reset()
    } catch (error: any) {
      console.error('Error saving expense:', error)
      // Log validation details if available
      if (error?.details) {
        console.error('Validation errors:', error.details)
      }
      // Re-throw to let React Query handle it (will show error state)
      throw error
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`${t('procurements.date')} *`}
              type="date"
              {...register('date')}
              error={errors.date?.message}
            />
            <Input
              label={t('procurements.dueDate')}
              type="date"
              {...register('dueDate')}
              error={errors.dueDate?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('procurements.refStartDate')}
              type="date"
              {...register('refStartDate')}
              error={errors.refStartDate?.message}
            />
            <Input
              label={t('procurements.refEndDate')}
              type="date"
              {...register('refEndDate')}
              error={errors.refEndDate?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`${t('procurements.totalAmount')} *`}
              type="number"
              step="0.01"
              min="0"
              {...register('totalAmount', { valueAsNumber: true })}
              error={errors.totalAmount?.message}
            />
            <Input
              label={t('procurements.invoiceCurrencyCode')}
              type="text"
              maxLength={3}
              placeholder="USD"
              {...register('invoiceCurrencyCode')}
              error={errors.invoiceCurrencyCode?.message}
            />
          </div>

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
                onClick={() => append({ projectId: '', allocatedAmount: undefined, allocatedPercentage: undefined })}
              >
                {t('procurements.addAllocation')}
              </Button>
            </div>

            {fields.map((field, index) => {
              const allocation = allocations[index]
              const total = typeof totalAmount === 'number' ? totalAmount : parseFloat(totalAmount || '0')
              
              // Determine which field is being used
              const hasPercentage = allocation?.allocatedPercentage !== undefined && allocation?.allocatedPercentage !== null
              const hasAmount = allocation?.allocatedAmount !== undefined && allocation?.allocatedAmount !== null
              
              // Calculate display values
              const displayAmount = hasAmount
                ? (typeof allocation.allocatedAmount === 'number' ? allocation.allocatedAmount : parseFloat(allocation.allocatedAmount || '0'))
                : (hasPercentage && total > 0
                  ? (total * (typeof allocation.allocatedPercentage === 'number' ? allocation.allocatedPercentage : parseFloat(allocation.allocatedPercentage || '0')) / 100)
                  : 0)
              
              const displayPercentage = hasPercentage
                ? (typeof allocation.allocatedPercentage === 'number' ? allocation.allocatedPercentage : parseFloat(allocation.allocatedPercentage || '0'))
                : (hasAmount && total > 0
                  ? ((displayAmount / total) * 100)
                  : 0)

              return (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                    value={hasPercentage ? displayAmount.toFixed(2) : (hasAmount ? displayAmount : '')}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '') {
                        setValue(`allocations.${index}.allocatedAmount`, undefined, { shouldValidate: true })
                        setValue(`allocations.${index}.allocatedPercentage`, undefined, { shouldValidate: true })
                      } else {
                        const amount = parseFloat(value)
                        setValue(`allocations.${index}.allocatedAmount`, amount, { shouldValidate: true })
                        setValue(`allocations.${index}.allocatedPercentage`, undefined, { shouldValidate: true })
                      }
                    }}
                    error={errors.allocations?.[index]?.allocatedAmount?.message}
                    disabled={hasPercentage}
                  />
                  <Input
                    label={`${t('procurements.allocatedPercentage')} (%)`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={hasAmount ? displayPercentage.toFixed(2) : (hasPercentage ? displayPercentage : '')}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '') {
                        setValue(`allocations.${index}.allocatedAmount`, undefined, { shouldValidate: true })
                        setValue(`allocations.${index}.allocatedPercentage`, undefined, { shouldValidate: true })
                      } else {
                        const percentage = parseFloat(value)
                        setValue(`allocations.${index}.allocatedPercentage`, percentage, { shouldValidate: true })
                        setValue(`allocations.${index}.allocatedAmount`, undefined, { shouldValidate: true })
                      }
                    }}
                    error={errors.allocations?.[index]?.allocatedPercentage?.message}
                    disabled={hasAmount}
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
              )
            })}

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
