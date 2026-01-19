import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePayments, useDeletePayment } from '../shared/api/payments'
import { useDebounce } from '../shared/hooks/useDebounce'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { PaymentFormModal } from '../components/payments/PaymentFormModal'
import type { Payment } from '../shared/types/api'

export function PaymentsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  const debouncedSearch = useDebounce(search, 500)
  const { data, isLoading } = usePayments({
    search: debouncedSearch,
    page,
    pageSize: 20,
  })
  const deleteMutation = useDeletePayment()

  const canMutate = true // TODO: Get from auth context

  const openCreateModal = () => {
    setEditingPayment(null)
    setIsModalOpen(true)
  }

  const openEditModal = (payment: Payment) => {
    setEditingPayment(payment)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('payments.deleteConfirm'))) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting payment:', error)
        alert('Failed to delete payment')
      }
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('finance.payments')}</h1>
        {canMutate && (
          <Button onClick={openCreateModal}>{t('payments.createPayment')}</Button>
        )}
      </div>

      <div className="mb-6">
        <Input
          placeholder={t('payments.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : data && 'data' in data && data.data.length > 0 ? (
        <>
          <div className="space-y-3 mb-6">
            {data.data.map((payment) => (
              <Card key={payment.id}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary break-words">
                          {payment.referenceNumber || payment.expense?.invoiceNumber || 'No Reference'}
                        </h3>
                        <p className="text-sm text-text-secondary mt-1">
                          {payment.expense?.company?.name || 'Unknown Vendor'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-4 text-sm text-text-secondary">
                      <span>
                        {t('payments.expense')}: {payment.expense?.invoiceNumber || 'N/A'}
                      </span>
                      <span>
                        {t('payments.paymentDate')}: {new Date(payment.paymentDate).toLocaleDateString()}
                      </span>
                      <span>
                        {t('payments.amount')}: ${parseFloat(payment.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="default">
                        {t(`paymentMethod.${payment.paymentMethod}`)}
                      </Badge>
                    </div>
                  </div>
                  {canMutate && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(payment)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(payment.id)}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {'pagination' in data && (
            <Pagination
              page={data.pagination.page}
              pageSize={data.pagination.pageSize}
              total={data.pagination.total}
              totalPages={data.pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      ) : (
        <Card>
          <p className="text-text-secondary text-center py-8">{t('payments.noPayments')}</p>
        </Card>
      )}

      <PaymentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingPayment(null)
        }}
        payment={editingPayment}
      />
    </div>
  )
}
