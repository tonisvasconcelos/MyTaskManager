import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { AppRoutes } from './app/router'
import { AppShell } from './components/layout/AppShell'
import { useLocation } from 'react-router-dom'
import { isLoggedIn } from './shared/api/client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* HashRouter ensures routing works on GitHub Pages (no server-side rewrites). */}
      <HashRouter>
        <AppShellOrNoShell>
          <AppRoutes />
        </AppShellOrNoShell>
      </HashRouter>
    </QueryClientProvider>
  )
}

function AppShellOrNoShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const onLogin = location.pathname === '/login' || location.pathname.startsWith('/admin')

  if (onLogin || !isLoggedIn()) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}

export default App
