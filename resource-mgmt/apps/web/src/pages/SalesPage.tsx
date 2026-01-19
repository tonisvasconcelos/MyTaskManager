import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'

export function SalesPage() {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('finance.sales')}</h1>
      </div>

      <Card>
        <div className="text-center py-12">
          <p className="text-text-secondary text-lg mb-2">{t('sales.comingSoon')}</p>
          <p className="text-text-secondary/70 text-sm">{t('sales.comingSoonDescription')}</p>
        </div>
      </Card>
    </div>
  )
}
