import { useTranslation } from 'react-i18next'
import { useOngoingTasks } from '../shared/api/tasks'
import { useProjects } from '../shared/api/projects'
import { useTimesheet } from '../shared/api/timesheet'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { Link } from 'react-router-dom'

function getWeekRange() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return {
    from: startOfWeek.toISOString().split('T')[0],
    to: endOfWeek.toISOString().split('T')[0],
  }
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { data: ongoingTasks, isLoading: tasksLoading } = useOngoingTasks({ page: 1, pageSize: 10 })
  const { data: projects, isLoading: projectsLoading } = useProjects({ status: 'Active', page: 1, pageSize: 1 })
  const weekRange = getWeekRange()
  const { data: timesheet, isLoading: timesheetLoading } = useTimesheet({ from: weekRange.from, to: weekRange.to })

  const activeProjectsCount = projects?.pagination.total || 0
  const ongoingTasksCount = ongoingTasks?.pagination.total || 0
  const hoursThisWeek = timesheet?.totalsPerDay
    ? Object.values(timesheet.totalsPerDay).reduce((sum, hours) => sum + hours, 0)
    : 0

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-6 md:mb-8">{t('dashboard.title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card>
          <h3 className="text-sm text-text-secondary mb-2">{t('dashboard.activeProjects')}</h3>
          {projectsLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold text-text-primary">{activeProjectsCount}</p>
          )}
        </Card>
        <Card>
          <h3 className="text-sm text-text-secondary mb-2">{t('dashboard.ongoingTasks')}</h3>
          {tasksLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold text-text-primary">{ongoingTasksCount}</p>
          )}
        </Card>
        <Card>
          <h3 className="text-sm text-text-secondary mb-2">{t('dashboard.hoursThisWeek')}</h3>
          {timesheetLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold text-text-primary">{hoursThisWeek.toFixed(1)}</p>
          )}
        </Card>
      </div>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-xl font-semibold text-text-primary">{t('dashboard.ongoingTasks')}</h2>
          <Link to="/tasks/ongoing" className="text-accent hover:underline text-sm">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {tasksLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : ongoingTasks && ongoingTasks.data.length > 0 ? (
          <div className="space-y-3">
            {ongoingTasks.data.slice(0, 10).map((task) => (
              <Link
                key={task.id}
                to={`/projects/${task.projectId}`}
                className="block p-4 border border-border rounded-md hover:border-accent/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0 flex-1">
                    <h3 className="font-medium text-text-primary mb-1 break-words">{task.title}</h3>
                    <p className="text-sm text-text-secondary break-words">
                      {task.project?.name} • {task.assignee?.fullName || t('tasks.unassigned')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={task.status === 'Blocked' ? 'danger' : 'info'}>
                      {task.status === 'InProgress' ? t('projectDetail.inProgress') : task.status === 'Blocked' ? t('projectDetail.blocked') : task.status === 'Done' ? t('projectDetail.done') : t('projectDetail.backlog')}
                    </Badge>
                    <Badge variant={task.priority === 'High' ? 'danger' : task.priority === 'Medium' ? 'warning' : 'default'}>
                      {t(`priority.${task.priority}`)}
                    </Badge>
                    <Badge variant={task.billable === 'Billable' ? 'success' : 'default'}>
                      {t(`billable.${task.billable || 'Billable'}`)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary">{t('ongoingTasks.noTasks')}</p>
        )}
      </Card>
    </div>
  )
}
