import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clearUserToken } from '../../shared/api/client'

interface AppShellProps {
  children: ReactNode
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/companies', label: 'Companies', icon: '🏢' },
  { path: '/projects', label: 'Projects', icon: '📁' },
  { path: '/tasks/ongoing', label: 'Ongoing Tasks', icon: '⚡' },
  { path: '/timesheet', label: 'Timesheet', icon: '⏱️' },
]

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Resource Mgmt</h1>
          <p className="text-sm text-text-secondary mt-1">Task Management</p>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-accent/20 text-accent border-l-2 border-accent'
                    : 'text-text-secondary hover:bg-surface/80 hover:text-text-primary'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-border">
          <button
            className="btn-secondary w-full"
            onClick={() => {
              clearUserToken()
              window.location.href = '#/login'
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
