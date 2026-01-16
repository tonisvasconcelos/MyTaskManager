import { useState } from 'react'
import { useOngoingTasks } from '../shared/api/tasks'
import { useUsers } from '../shared/api/users'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { Link } from 'react-router-dom'

const priorityColors: Record<string, 'default' | 'warning' | 'danger'> = {
  Low: 'default',
  Medium: 'warning',
  High: 'danger',
}

export function OngoingTasksPage() {
  const [assigneeFilter, setAssigneeFilter] = useState<string>('')
  const [includeBlocked, setIncludeBlocked] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useOngoingTasks({
    assigneeId: assigneeFilter || undefined,
    includeBlocked,
    page,
    pageSize: 20,
  })
  const { data: users } = useUsers()

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-8">Ongoing Tasks</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Select
          value={assigneeFilter}
          onChange={(e) => {
            setAssigneeFilter(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'All Assignees' },
            ...(users?.map((u) => ({ value: u.id, label: u.fullName })) || []),
          ]}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeBlocked"
            checked={includeBlocked}
            onChange={(e) => {
              setIncludeBlocked(e.target.checked)
              setPage(1)
            }}
            className="w-4 h-4"
          />
          <label htmlFor="includeBlocked" className="text-sm text-text-secondary">
            Include Blocked
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className="space-y-3 mb-6">
            {data.data.map((task) => (
              <Card key={task.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link to={`/projects/${task.projectId}`}>
                      <h3 className="text-lg font-semibold text-text-primary mb-2 hover:text-accent transition-colors">
                        {task.title}
                      </h3>
                    </Link>
                    {task.description && (
                      <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm text-text-secondary">
                      <span>{task.project?.name}</span>
                      {task.project?.company && <span>• {task.project.company.name}</span>}
                      {task.assignee && <span>• 👤 {task.assignee.fullName}</span>}
                      {task.estimatedEndDate && (
                        <span>• 📅 {new Date(task.estimatedEndDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={priorityColors[task.priority] || 'default'}>
                      {task.priority}
                    </Badge>
                    <Badge variant={task.status === 'Blocked' ? 'danger' : 'info'}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={data.pagination.page}
            pageSize={data.pagination.pageSize}
            total={data.pagination.total}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <Card>
          <p className="text-text-secondary text-center py-8">No ongoing tasks found</p>
        </Card>
      )}
    </div>
  )
}
