export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface Company {
  id: string
  name: string
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  notes: string | null
  countryCode?: string | null
  invoicingCurrencyCode?: string | null
  taxRegistrationNo?: string | null
  billingUnit?: 'HR' | 'PROJECT' | null
  unitPrice?: string | null
  generalNotes?: string | null
  logoUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  companyId: string
  name: string
  description: string | null
  status: 'Planned' | 'Active' | 'OnHold' | 'Completed' | 'Cancelled'
  startDate: string | null
  targetEndDate: string | null
  createdAt: string
  updatedAt: string
  company?: {
    id: string
    name: string
  }
}

export interface User {
  id: string
  fullName: string
  email: string | null
  role: 'Admin' | 'Manager' | 'Contributor' | null
  language?: 'EN' | 'PT_BR' | null
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  startDate: string | null
  estimatedEndDate: string | null
  estimatedEffortHours: string | null
  status: 'Backlog' | 'InProgress' | 'Blocked' | 'Done'
  priority: 'Low' | 'Medium' | 'High'
  billable: 'Billable' | 'NonBillable'
  labels: string[]
  assigneeId: string | null
  refTicket: string | null
  refLink: string | null
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    name: string
    company?: {
      id: string
      name: string
    }
  }
  assignee?: {
    id: string
    fullName: string
    email: string | null
  }
}

export interface TaskAttachment {
  id: string
  taskId: string
  fileName: string
  originalName: string
  mimeType: string
  size: number
  url: string
  createdAt: string
}

export interface TimeEntry {
  id: string
  taskId: string
  userId: string
  entryDate: string
  hours: string
  notes: string | null
  createdAt: string
  updatedAt: string
  task?: {
    id: string
    title: string
    project?: {
      id: string
      name: string
      company?: {
        id: string
        name: string
      }
    }
  }
  user?: {
    id: string
    fullName: string
    email: string | null
  }
}

export interface TimesheetSummary {
  entries: TimeEntry[]
  totalsPerDay: Record<string, number>
  totalsPerProject: Record<string, number>
  totalsPerTask: Record<string, number>
}
