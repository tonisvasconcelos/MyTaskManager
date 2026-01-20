import { useTranslation } from 'react-i18next'
import { AllTasksListView } from '../components/tasks/AllTasksListView'

export function OngoingTasksPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-6 md:mb-8">{t('tasks.title')}</h1>
      <AllTasksListView />
    </div>
  )
}
