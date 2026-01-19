import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreatePayment, useUpdatePayment } from '../../shared/api/payments'
import { useProcurements } from '../../shared/api/procurements'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Payment } from '../../shared/types/api'

const paymentSchema = z.object({
  expenseId: z.string().uuid('Expense is required'),
  amount: z.union([z.string(), z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val : val
    if (isNaN(num) || num <= 0) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['amount'],
          message: 'Amount must be a positive number',
        },
      ])
    }
    return num
  }),
  paymentCurrencyCode: z.string().length(3, 'Currency code must be 3 characters').optional().nullable(),
  amountLCY: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return null
    const num = typeof val === 'string' ? parseFloat(val) : val
    if (isNaN(num) || num <= 0) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['amountLCY'],
          message: 'LCY amount must be a positive number',
        },
      ])
    }
    return num
  }).optional().nullable(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.enum(['CORPORATE_CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'OTHER']),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface PaymentFormModalProps {
  isOpen: boolean
  onClose: () => void
  payment?: Payment | null
}

export function PaymentFormModal({ isOpen, onClose, payment }: PaymentFormModalProps) {
  const { t } = useTranslation()
  const createMutation = useCreatePayment()
  const updateMutation = useUpdatePayment()
  const { data: expensesData } = useProcurements({ page: 1, pageSize: 100 })

  const expenses = expensesData && 'data' in expensesData ? expensesData.data : []

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      expenseId: '',
      amount: 0,
      paymentCurrencyCode: null,
      amountLCY: null,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CORPORATE_CREDIT_CARD',
      referenceNumber: null,
      notes: null,
    },
  })

  const selectedExpenseId = watch('expenseId')
  const selectedExpense = expenses.find((e) => e.id === selectedExpenseId)

  useEffect(() => {
    if (payment && isOpen) {
      reset({
        expenseId: payment.expenseId,
        amount: parseFloat(payment.amount),
        paymentCurrencyCode: payment.paymentCurrencyCode || null,
        amountLCY: payment.amountLCY ? parseFloat(payment.amountLCY) : null,
        paymentDate: new Date(payment.paymentDate).toISOString().split('T')[0],
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber || null,
        notes: payment.notes || null,
      })
    } else if (!payment && isOpen) {
      reset({
        expenseId: '',
        amount: 0,
        paymentCurrencyCode: null,
        amountLCY: null,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'CORPORATE_CREDIT_CARD',
        referenceNumber: null,
        notes: null,
      })
    }
  }, [payment, isOpen, reset])

  // Auto-populate currency code from expense when expense is selected
  useEffect(() => {
    if (selectedExpense?.invoiceCurrencyCode && !watch('paymentCurrencyCode')) {
      reset({
        ...watch(),
        paymentCurrencyCode: selectedExpense.invoiceCurrencyCode,
      }, { keepValues: true })
    }
  }, [selectedExpense, reset, watch])

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const payload = {
        ...data,
        amount: typeof data.amount === 'number' ? data.amount.toString() : data.amount,
        paymentCurrencyCode: data.paymentCurrencyCode || null,
        amountLCY: data.amountLCY ? (typeof data.amountLCY === 'number' ? data.amountLCY.toString() : data.amountLCY) : null,
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null,
      }

      if (payment) {
        await updateMutation.mutateAsync({ id: payment.id, ...payload } as any)
      } else {
        await createMutation.mutateAsync(payload as any)
      }
      onClose()
      reset()
    } catch (error: any) {
      console.error('Error saving payment:', error)
      throw error
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={payment ? t('payments.editPayment') : t('payments.createPayment')}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('payments.expense')} *
          </label>
          <Select
            {...register('expenseId')}
            error={errors.expenseId?.message}
            options={[
              { value: '', label: t('payments.selectExpense') },
              ...expenses.map((expense) => ({
                value: expense.id,
                label: `${expense.invoiceNumber} - ${expense.company?.name || 'Unknown'} ($${parseFloat(expense.totalAmount).toFixed(2)})`,
              })),
            ]}
          />
        </div>

        {selectedExpense && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('payments.billToCompany')}
            </label>
            <Input
              type="text"
              value={selectedExpense.company?.name || 'Unknown'}
              disabled
              className="bg-gray-700 cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('payments.amount')} *
          </label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            {...register('amount')}
            error={errors.amount?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('payments.paymentCurrencyCode')}
          </label>
          <Input
            type="text"
            maxLength={3}
            placeholder="USD"
            {...register('paymentCurrencyCode')}
            error={errors.paymentCurrencyCode?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('payments.amountLCY')}
          </label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            {...register('amountLCY')}
            error={errors.amountLCY?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('payments.paymentDate')} *
          </label>
          <Input
            type="date"
            {...register('paymentDate')}
            error={errors.paymentDate?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('payments.paymentMethod')} *
          </label>
          <Select
            {...register('paymentMethod')}
            error={errors.paymentMethod?.message}
            options={[
              { value: 'CORPORATE_CREDIT_CARD', label: t('paymentMethod.CORPORATE_CREDIT_CARD') },
              { value: 'BANK_TRANSFER', label: t('paymentMethod.BANK_TRANSFER') },
              { value: 'PAYPAL', label: t('paymentMethod.PAYPAL') },
              { value: 'OTHER', label: t('paymentMethod.OTHER') },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('payments.referenceNumber')}
          </label>
          <Input
            {...register('referenceNumber')}
            error={errors.referenceNumber?.message}
            placeholder={t('payments.referenceNumberPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('payments.notes')}
          </label>
          <Textarea
            {...register('notes')}
            error={errors.notes?.message}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending
              ? t('common.loading')
              : payment
                ? t('common.update')
                : t('common.create')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
