import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from '@/App'
import { AuthProvider } from '@/auth/AuthContext'
import { EmergencyProvider } from '@/emergency/EmergencyContext'
import { ThemeProvider } from '@/theme/ThemeContext'
import '@/index.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element #root not found')
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <EmergencyProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </EmergencyProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
