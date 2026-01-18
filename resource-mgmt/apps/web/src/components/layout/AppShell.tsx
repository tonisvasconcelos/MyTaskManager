import { ReactNode, useState, useEffect } from 'react'
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Hide sidebar on login pages
  const isLoginPage = location.pathname === '/login' || location.pathname === '/admin/login' || location.pathname === '/admin'

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Mobile overlay - only visible when sidebar is open on mobile */}
      {!isLoginPage && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - hidden on login pages */}
      {!isLoginPage && (
        <aside
          className={`bg-surface border-r border-border transition-all duration-300 ease-in-out fixed md:static inset-y-0 left-0 z-50 ${
            isSidebarOpen
              ? 'w-64 translate-x-0'
              : '-translate-x-full md:translate-x-0 md:w-64'
          }`}
        >
          <div className="p-4 h-full overflow-y-auto">
            {/* Hamburger Menu Button */}
            <button
              onClick={toggleSidebar}
              className="mb-6 p-2 bg-surface/50 border border-border rounded-md text-text-primary hover:bg-surface/80 transition-colors w-full flex items-center justify-center"
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

            {/* Logo */}
            <div className="mb-8 flex items-center justify-center min-h-[80px]">
              <img
                src={`${import.meta.env.BASE_URL || '/'}images/Itaskoralogo.png`}
                alt="iTASKORA"
                className="h-24 w-auto max-w-full object-contain"
                onError={(e) => {
                  console.error('Failed to load logo:', `${import.meta.env.BASE_URL || '/'}images/Itaskoralogo.png`)
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>

            {/* Navigation Items */}
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                const isDisabled = !loggedIn && item.path !== '/login'
                return (
                  <Link
                    key={item.path}
                    to={loggedIn ? item.path : '/login'}
                    className={`flex items-center gap-3 rounded-md transition-colors px-4 py-2 ${
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
                      } else {
                        closeSidebar()
                      }
                    }}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Sign out / Sign in */}
            <div className="mt-8 pt-6 border-t border-border">
              {!loggedIn ? (
                <div className="space-y-2">
                  <Link to="/login" className="btn-primary block text-center" onClick={closeSidebar}>
                    Sign in
                  </Link>
                  <Link to="/admin/login" className="btn-secondary block text-center" onClick={closeSidebar}>
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

      {/* Main content */}
      <main className={`${isLoginPage ? 'w-full' : 'flex-1 md:ml-0'} overflow-auto transition-all duration-300`}>
        {/* Mobile menu button - only visible on mobile when sidebar is closed */}
        {!isLoginPage && (
          <div className="md:hidden p-4 border-b border-border">
            <button
              onClick={toggleSidebar}
              className="p-2 bg-surface border border-border rounded-md text-text-primary hover:bg-surface/80 transition-colors"
              aria-label="Open menu"
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
          </div>
        )}
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
