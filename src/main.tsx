import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { queryClient } from '@/lib/queryClient'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'
import { useUiStore } from '@/stores/uiStore'
import { applyTheme, watchSystemTheme } from '@/lib/theme'

// Apply the persisted mode and keep "system" in sync with the OS.
applyTheme(useUiStore.getState().theme)
watchSystemTheme(() => useUiStore.getState().theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
