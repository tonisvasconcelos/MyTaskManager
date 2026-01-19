import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProcurements, useDeleteProcurement } from '../shared/api/procurements'
import { useDebounce } from '../shared/hooks/useDebounce'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { ProcurementFormModal } from '../components/procurements/ProcurementFormModal'
import type { Expense } from '../shared/types/api'

const paymentStatusColors: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  PARTIALLY_PAID: 'default',
  PAID: 'success',
}

const paymentMethodLabels: Record<string, string> = {
  CORPORATE_CREDIT_CARD: 'Credit Card',
  BANK_TRANSFER: 'Bank Transfer',
  PAYPAL: 'PayPal',
  OTHER: 'Other',
}

export function ProcurementsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const debouncedSearch = useDebounce(search, 500)
  const { data, isLoading } = useProcurements({
    search: debouncedSearch,
    page,
    pageSize: 20,
  })
  const deleteMutation = useDeleteProcurement()

  // For now, we'll show create/edit/delete buttons to all authenticated users
  // In a real app, you'd check the user's role from auth context
  // For MVP, we rely on backend role enforcement
  const canMutate = true // TODO: Get from auth context

  const openCreateModal = () => {
    setEditingExpense(null)
    setIsModalOpen(true)
  }

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('procurements.deleteConfirm'))) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting expense:', error)
        alert('Failed to delete expense')
      }
    }
  }

  const getTotalAllocated = (expense: Expense) => {
    if (!expense.allocations || expense.allocations.length === 0) return '0.00'
    return expense.allocations
      .reduce((sum, alloc) => sum + parseFloat(alloc.allocatedAmount), 0)
      .toFixed(2)
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('procurements.title')}</h1>
        {canMutate && (
          <Button onClick={openCreateModal}>{t('procurements.createExpense')}</Button>
        )}
      </div>

      <div className="mb-6">
        <Input
          placeholder={t('procurements.searchPlaceholder')}
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
            {data.data.map((expense) => (
              <Card key={expense.id}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary break-words">
                          {expense.invoiceNumber}
                        </h3>
                        <p className="text-sm text-text-secondary mt-1">
                          {expense.company?.name || 'Unknown Vendor'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-4 text-sm text-text-secondary">
                      <span>
                        {t('procurements.date')}: {new Date(expense.date).toLocaleDateString()}
                      </span>
                      <span>
                        {t('procurements.totalAmount')}: ${parseFloat(expense.totalAmount).toFixed(2)}
                      </span>
                      <span>
                        {t('procurements.allocatedToProjects')}: ${getTotalAllocated(expense)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant={paymentStatusColors[expense.status] || 'default'}>
                        {t(`paymentStatus.${expense.status}`)}
                      </Badge>
                      <Badge variant="default">
                        {t(`paymentMethod.${expense.paymentMethod}`)}
                      </Badge>
                    </div>
                  </div>
                  {canMutate && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(expense)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(expense.id)}>
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
          <p className="text-text-secondary text-center py-8">{t('procurements.noExpenses')}</p>
        </Card>
      )}

      <ProcurementFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingExpense(null)
        }}
        expense={editingExpense}
      />
    </div>
  )
}
