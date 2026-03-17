import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

const queryClient = new QueryClient()

window.addEventListener('error', (event) => {
  if (event.message.includes('Importing a module script failed') || event.message.includes('Loading chunk')) {
    console.warn('Stale assets detected, performing full reload...', event.message)
    window.location.reload()
  }
})

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Importing a module script failed') || event.reason?.message?.includes('Loading chunk')) {
    console.warn('Stale assets detected in promise, performing full reload...', event.reason.message)
    window.location.reload()
  }
})

window.addEventListener('vite:preloadError', () => {
  console.warn('Vite preload error, performing full reload...')
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
