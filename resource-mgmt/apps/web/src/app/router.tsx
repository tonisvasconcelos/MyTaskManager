import { Routes, Route } from 'react-router-dom'
import { DashboardPage } from '../pages/DashboardPage'
import { CompaniesPage } from '../pages/CompaniesPage'
import { CompanyDetailPage } from '../pages/CompanyDetailPage'
import { ProjectsPage } from '../pages/ProjectsPage'
import { ProjectDetailPage } from '../pages/ProjectDetailPage'
import { OngoingTasksPage } from '../pages/OngoingTasksPage'
import { TimesheetPage } from '../pages/TimesheetPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/companies" element={<CompaniesPage />} />
      <Route path="/companies/:id" element={<CompanyDetailPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
      <Route path="/tasks/ongoing" element={<OngoingTasksPage />} />
      <Route path="/timesheet" element={<TimesheetPage />} />
    </Routes>
  )
}
