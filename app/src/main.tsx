import '@fontsource/archivo/400.css'
import '@fontsource/archivo/500.css'
import '@fontsource/archivo/600.css'
import '@fontsource/archivo/700.css'
import '@fontsource/archivo/800.css'
import '@fontsource/public-sans/400.css'
import '@fontsource/public-sans/500.css'
import '@fontsource/public-sans/600.css'
import '@fontsource/public-sans/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './styles/index.css'
import './styles/components.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components'
import { Root } from './routes/root'
import { DirectoryScreen } from './routes/directory'
import { TalentNewScreen } from './routes/talent-new'
import { TalentProfileScreen } from './routes/talent-profile'
import { TopicsScreen } from './routes/topics'
import { TeamScreen } from './routes/team'
import { ImportScreen } from './routes/import'
import { OperatorProvider } from './lib/operator'
import { DashboardScreen } from './routes/dashboard'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
})

const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: DashboardScreen },
      { path: 'speakers', Component: DirectoryScreen },
      { path: 'talent/new', Component: TalentNewScreen },
      { path: 'talent/:reference', Component: TalentProfileScreen },
      { path: 'topics', Component: TopicsScreen },
      { path: 'team', Component: TeamScreen },
      { path: 'import', Component: ImportScreen },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <OperatorProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </OperatorProvider>
    </QueryClientProvider>
  </StrictMode>,
)
