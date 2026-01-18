import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clearAdminToken, clearUserToken, isAdminLoggedIn, isLoggedIn } from '../../shared/api/client'

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
  const loggedIn = isLoggedIn()
  const adminLoggedIn = isAdminLoggedIn()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  
  // Hide sidebar on login pages
  const isLoginPage = location.pathname === '/login' || location.pathname === '/admin/login' || location.pathname === '/admin'

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - hidden on login pages */}
      {!isLoginPage && (
      <aside className={`bg-surface border-r border-border transition-all duration-300 ease-in-out ${
        isSidebarOpen 
          ? 'w-64' 
          : 'w-0 overflow-hidden'
      }`}>
        <div className={`p-6 ${!isSidebarOpen ? 'hidden' : ''}`}>
          {/* Hamburger Menu Button */}
          <button
            onClick={toggleSidebar}
            className="mb-6 p-2 bg-surface/50 border border-border rounded-md text-text-primary hover:bg-surface/80 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="mb-8 flex items-center justify-center min-h-[80px]">
        <div className="mb-8 flex items-center justify-center min-h-[80px]">
          <img 
            src={`${import.meta.env.BASE_URL || '/'}images/Itaskoralogo.png`}
            alt="iTASKORA" 
            className="h-24 w-auto max-w-full object-contain"
            onError={(e) => {
              console.error('Failed to load logo:', `${import.meta.env.BASE_URL || '/'}images/Itaskoralogo.png`);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const isDisabled = !loggedIn && item.path !== '/login'
            return (
              <Link
                key={item.path}
                to={loggedIn ? item.path : '/login'}
                className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-accent/20 text-accent border-l-2 border-accent'
                    : isDisabled
                      ? 'text-text-secondary/50 cursor-not-allowed'
                      : 'text-text-secondary hover:bg-surface/80 hover:text-text-primary'
                }`}
                onClick={(e) => {
                  if (!loggedIn) {
                    e.preventDefault()
                    window.location.href = '#/login'
                  }
                }}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-border">
          {!loggedIn ? (
            <div className="space-y-2">
              <Link to="/login" className="btn-primary block text-center">
                Sign in
              </Link>
              <Link to="/admin/login" className="btn-secondary block text-center">
                Admin portal
              </Link>
            </div>
          ) : (
            <button
              className="btn-secondary w-full"
              onClick={() => {
                clearUserToken()
                if (adminLoggedIn) clearAdminToken()
                window.location.href = '#/login'
              }}
            >
              Sign out
            </button>
          )}
        </div>
        </div>
      </aside>
      )}

      {/* Hamburger Menu Button when sidebar is closed - hidden on login pages */}
      {!isLoginPage && !isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-surface border border-border rounded-md text-text-primary hover:bg-surface/80 transition-colors shadow-lg"
          aria-label="Toggle sidebar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Main content */}
      <main className={`${isLoginPage ? 'w-full' : 'flex-1'} overflow-auto transition-all duration-300`}>
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
