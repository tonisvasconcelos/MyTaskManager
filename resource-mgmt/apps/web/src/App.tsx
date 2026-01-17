import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { AppRoutes } from './app/router'
import { AppShell } from './components/layout/AppShell'

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
        <AppShell>
          <AppRoutes />
        </AppShell>
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App
