import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectFinancialEntries } from '../shared/api/finance'
import { useProjects } from '../shared/api/projects'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'

const entryTypeColors: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  expense: 'danger',
  payment: 'success',
  sale: 'default',
}

export function ProjectFinancialEntriesPage() {
  const { t } = useTranslation()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const { data: projectsData } = useProjects({ page: 1, pageSize: 100 })
  const { data, isLoading } = useProjectFinancialEntries(selectedProjectId || undefined)

  const projects = projectsData?.data || []
  const entries = data?.entries || []
  const summary = data?.summary || []

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('finance.projectFinancialEntries')}</h1>
      </div>

      <div className="mb-6">
        <Select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">{t('finance.allProjects')}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </div>

      {summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summary.map((item) => (
            <Card key={item.projectId}>
              <h3 className="font-semibold text-text-primary mb-2">{item.projectName}</h3>
              <div className="space-y-1 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t('finance.totalExpenses')}:</span>
                  <span className="text-danger">${item.totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t('finance.totalPayments')}:</span>
                  <span className="text-success">${item.totalPayments.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t('finance.totalSales')}:</span>
                  <span className="text-text-primary">${item.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-medium text-text-primary">{t('finance.netAmount')}:</span>
                  <span className={`font-medium ${item.netAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                    ${item.netAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-4 mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary break-words">
                        {entry.description}
                      </h3>
                      <p className="text-sm text-text-secondary mt-1">
                        {entry.projectName} - {entry.companyName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-4 text-sm text-text-secondary">
                    <span>
                      {t('common.date')}: {new Date(entry.date).toLocaleDateString()}
                    </span>
                    {entry.invoiceNumber && (
                      <span>
                        {t('procurements.invoiceNumber')}: {entry.invoiceNumber}
                      </span>
                    )}
                    {entry.referenceNumber && (
                      <span>
                        {t('payments.referenceNumber')}: {entry.referenceNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant={entryTypeColors[entry.type] || 'default'}>
                      {t(`finance.entryType.${entry.type}`)}
                    </Badge>
                    <span className={`text-sm font-medium ${entry.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                      {entry.amount >= 0 ? '+' : ''}${entry.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-text-secondary text-center py-8">{t('finance.noEntries')}</p>
        </Card>
      )}
    </div>
  )
}
