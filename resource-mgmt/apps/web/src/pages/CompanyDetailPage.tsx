import { useParams, Link } from 'react-router-dom'
import { useCompany } from '../shared/api/companies'
import { useProjects } from '../shared/api/projects'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  Planned: 'info',
  Active: 'success',
  OnHold: 'warning',
  Completed: 'default',
  Cancelled: 'danger',
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: company, isLoading: companyLoading } = useCompany(id || '')
  const { data: projects, isLoading: projectsLoading } = useProjects({ companyId: id, page: 1, pageSize: 100 })

  if (companyLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-48 mb-8" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!company) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-8">Company not found</h1>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link to="/companies" className="text-accent hover:underline text-sm mb-4 inline-block">
          ← Back to Companies
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">{company.name}</h1>
      </div>

      <Card className="mb-8">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Company Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {company.logoUrl && (
            <div className="md:col-span-2">
              <span className="text-text-secondary">Logo:</span>
              <div className="mt-2 w-24 h-24 rounded-md overflow-hidden border border-border bg-surface">
                <img src={company.logoUrl} alt={`${company.name} logo`} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          {company.email && (
            <div>
              <span className="text-text-secondary">Email:</span>
              <p className="text-text-primary">{company.email}</p>
            </div>
          )}
          {company.phone && (
            <div>
              <span className="text-text-secondary">Phone:</span>
              <p className="text-text-primary">{company.phone}</p>
            </div>
          )}
          {company.website && (
            <div>
              <span className="text-text-secondary">Website:</span>
              <p className="text-text-primary">
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  {company.website}
                </a>
              </p>
            </div>
          )}
          {company.address && (
            <div>
              <span className="text-text-secondary">Address:</span>
              <p className="text-text-primary">{company.address}</p>
            </div>
          )}
          {(company.countryCode || company.invoicingCurrencyCode) && (
            <div>
              <span className="text-text-secondary">Country / Currency:</span>
              <p className="text-text-primary">
                {company.countryCode || '—'} / {company.invoicingCurrencyCode || '—'}
              </p>
            </div>
          )}
          {company.taxRegistrationNo && (
            <div>
              <span className="text-text-secondary">Tax Registration:</span>
              <p className="text-text-primary">{company.taxRegistrationNo}</p>
            </div>
          )}
          {(company.billingUnit || company.unitPrice) && (
            <div>
              <span className="text-text-secondary">Billing:</span>
              <p className="text-text-primary">
                {company.billingUnit || '—'}
                {company.unitPrice ? ` · ${company.unitPrice}${company.invoicingCurrencyCode ? ` ${company.invoicingCurrencyCode}` : ''}` : ''}
              </p>
            </div>
          )}
          {company.notes && (
            <div className="md:col-span-2">
              <span className="text-text-secondary">Notes:</span>
              <p className="text-text-primary mt-1">{company.notes}</p>
            </div>
          )}
          {company.generalNotes && (
            <div className="md:col-span-2">
              <span className="text-text-secondary">General Notes:</span>
              <p className="text-text-primary mt-1 whitespace-pre-wrap">{company.generalNotes}</p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Projects</h2>
        {projectsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : projects && projects.data.length > 0 ? (
          <div className="space-y-3">
            {projects.data.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block p-4 border border-border rounded-md hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-text-primary mb-1">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-text-secondary mb-2">{project.description}</p>
                    )}
                    <div className="flex gap-2 text-xs text-text-secondary">
                      {project.startDate && (
                        <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                      )}
                      {project.targetEndDate && (
                        <span>Target: {new Date(project.targetEndDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={statusColors[project.status] || 'default'}>
                    {project.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary">No projects found</p>
        )}
      </Card>
    </div>
  )
}
