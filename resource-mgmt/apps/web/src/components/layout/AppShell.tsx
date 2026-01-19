import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clearAdminToken, clearUserToken, isAdminLoggedIn, isLoggedIn } from '../../shared/api/client'
import { useLanguage } from '../../shared/hooks/useLanguage'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const { t } = useTranslation()
  const { currentLanguage, changeLanguage } = useLanguage()
  const loggedIn = isLoggedIn()
  const adminLoggedIn = isAdminLoggedIn()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true) // Desktop: expanded/collapsed (starts expanded)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // Mobile: menu visibility (starts closed)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  
  // Hide sidebar on login pages
  const isLoginPage = location.pathname === '/login' || location.pathname === '/admin/login' || location.pathname === '/admin'

  const navItems = [
    { path: '/', label: t('common.dashboard'), icon: '📊' },
    { path: '/companies', label: t('common.companies'), icon: '🏢' },
    { path: '/projects', label: t('common.projects'), icon: '📁' },
    { path: '/tasks/ongoing', label: t('common.ongoingTasks'), icon: '⚡' },
    { path: '/timesheet', label: t('common.timesheet'), icon: '⏱️' },
  ]

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showLanguageMenu && !target.closest('.language-menu-container')) {
        setShowLanguageMenu(false)
      }
    }
    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLanguageMenu])

  // Sync language with user preference on mount
  useEffect(() => {
    // This would ideally fetch user data and set language, but for now we rely on localStorage
    // The language toggle will persist to localStorage and can be synced with user profile later
  }, [])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeSidebar = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Mobile overlay - only visible when mobile menu is open */}
      {!isLoginPage && isMobileMenuOpen && (
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
            isMobileMenuOpen
              ? 'w-64 translate-x-0'
              : '-translate-x-full md:translate-x-0'
          } ${isSidebarOpen ? 'md:w-64' : 'md:w-16'}`}
        >
          <div className="p-4 h-full overflow-y-auto relative">
            {/* Hamburger Menu Button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleSidebar()
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className="mb-6 p-2 bg-surface/50 border border-border rounded-md text-text-primary hover:bg-surface/80 active:bg-surface transition-colors w-full flex items-center justify-center cursor-pointer relative z-50 pointer-events-auto"
              aria-label="Toggle sidebar"
              type="button"
              style={{ touchAction: 'manipulation' }}
            >
              <svg
                className="w-5 h-5 pointer-events-none"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isSidebarOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Logo - shows vertically rotated when collapsed on desktop */}
            <div className={`mb-8 flex items-center justify-center min-h-[80px] ${!isSidebarOpen ? 'md:rotate-[-90deg] md:origin-center' : ''}`}>
              <img
                src={`${import.meta.env.BASE_URL || '/'}images/Itaskoralogo.png`}
                alt="iTASKORA"
                className={`max-w-full object-contain transition-all duration-300 ${
                  isSidebarOpen ? 'h-24 w-auto' : 'md:h-auto md:w-24 md:max-h-[200px] h-24 w-auto'
                }`}
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
                    className={`flex items-center rounded-md transition-colors ${
                      isSidebarOpen ? 'gap-3 px-4 py-2' : 'md:justify-center md:px-2 md:py-2 px-4 py-2 gap-3'
                    } ${
                      isActive
                        ? 'bg-accent/20 text-accent border-l-2 border-accent'
                        : isDisabled
                          ? 'text-text-secondary/50 cursor-not-allowed'
                          : 'text-text-secondary hover:bg-surface/80 hover:text-text-primary'
                    }`}
                    title={!isSidebarOpen ? item.label : undefined}
                    onClick={(e) => {
                      if (!loggedIn) {
                        e.preventDefault()
                        window.location.href = '#/login'
                      } else {
                        closeSidebar()
                      }
                    }}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                  </Link>
                )
              })}
            </nav>

            {/* Language Toggle */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="relative language-menu-container">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-4 py-2' : 'justify-center px-2 py-2'} rounded-md text-text-secondary hover:bg-surface/80 hover:text-text-primary transition-colors`}
                  title={!isSidebarOpen ? t('common.language') : undefined}
                >
                  <span className="text-xl">🌐</span>
                  {isSidebarOpen && (
                    <>
                      <span className="font-medium text-sm">{currentLanguage === 'PT_BR' ? 'PT-BR' : 'EN'}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
                {showLanguageMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-md shadow-lg z-10">
                    <button
                      onClick={() => {
                        changeLanguage('EN')
                        setShowLanguageMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface/80 transition-colors ${
                        currentLanguage === 'EN' ? 'text-accent bg-accent/10' : 'text-text-secondary'
                      }`}
                    >
                      {t('common.english')}
                    </button>
                    <button
                      onClick={() => {
                        changeLanguage('PT_BR')
                        setShowLanguageMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface/80 transition-colors ${
                        currentLanguage === 'PT_BR' ? 'text-accent bg-accent/10' : 'text-text-secondary'
                      }`}
                    >
                      {t('common.portuguese')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sign out / Sign in - only show when expanded */}
            {isSidebarOpen && (
              <div className="mt-4 pt-6 border-t border-border">
                {!loggedIn ? (
                  <div className="space-y-2">
                    <Link to="/login" className="btn-primary block text-center" onClick={closeSidebar}>
                      {t('common.signIn')}
                    </Link>
                    <Link to="/admin/login" className="btn-secondary block text-center" onClick={closeSidebar}>
                      {t('common.adminPortal')}
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
                    {t('common.signOut')}
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className={`${isLoginPage ? 'w-full' : 'flex-1 md:ml-0'} overflow-auto transition-all duration-300`}>
        {/* Mobile menu button - only visible on mobile when sidebar is closed */}
        {!isLoginPage && (
          <div className="md:hidden p-4 border-b border-border">
            <button
              onClick={toggleMobileMenu}
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
