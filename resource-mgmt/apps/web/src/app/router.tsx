import { Routes, Route } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { DashboardPage } from '../pages/DashboardPage'
import { CompaniesPage } from '../pages/CompaniesPage'
import { CompanyDetailPage } from '../pages/CompanyDetailPage'
import { ProjectsPage } from '../pages/ProjectsPage'
import { ProjectDetailPage } from '../pages/ProjectDetailPage'
import { OngoingTasksPage } from '../pages/OngoingTasksPage'
import { TimesheetPage } from '../pages/TimesheetPage'
import { LoginPage } from '../pages/LoginPage'
import { isLoggedIn } from '../shared/api/client'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { AdminTenantsPage } from '../pages/admin/AdminTenantsPage'
import { AdminTenantUsersPage } from '../pages/admin/AdminTenantUsersPage'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminTenantsPage />} />
      <Route path="/admin/tenants/:id" element={<AdminTenantUsersPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <CompaniesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies/:id"
        element={
          <ProtectedRoute>
            <CompanyDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/ongoing"
        element={
          <ProtectedRoute>
            <OngoingTasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timesheet"
        element={
          <ProtectedRoute>
            <TimesheetPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
