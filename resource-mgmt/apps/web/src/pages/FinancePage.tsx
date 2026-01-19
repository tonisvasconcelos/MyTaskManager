import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { PaymentsPage } from './PaymentsPage'
import { ProcurementsPage } from './ProcurementsPage'
import { SalesPage } from './SalesPage'
import { ProjectFinancialEntriesPage } from './ProjectFinancialEntriesPage'

export function FinancePage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as 'payments' | 'expenses' | 'sales' | 'project-entries' | null
  const [activeTab, setActiveTab] = useState<'payments' | 'expenses' | 'sales' | 'project-entries'>(
    tabParam || 'expenses'
  )

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (tab: 'payments' | 'expenses' | 'sales' | 'project-entries') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  return (
    <div>
      <div className="mb-6 border-b border-border">
        <div className="flex gap-2 md:gap-4">
          <button
            onClick={() => handleTabChange('payments')}
            className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base flex-1 md:flex-initial ${
              activeTab === 'payments'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('finance.payments')}
          </button>
          <button
            onClick={() => handleTabChange('expenses')}
            className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base flex-1 md:flex-initial ${
              activeTab === 'expenses'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('finance.expenses')}
          </button>
          <button
            onClick={() => handleTabChange('sales')}
            className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base flex-1 md:flex-initial ${
              activeTab === 'sales'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('finance.sales')}
          </button>
          <button
            onClick={() => handleTabChange('project-entries')}
            className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base flex-1 md:flex-initial ${
              activeTab === 'project-entries'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('finance.projectFinancialEntries')}
          </button>
        </div>
      </div>

      {activeTab === 'payments' && <PaymentsPage />}
      {activeTab === 'expenses' && <ProcurementsPage />}
      {activeTab === 'sales' && <SalesPage />}
      {activeTab === 'project-entries' && <ProjectFinancialEntriesPage />}
    </div>
  )
}
