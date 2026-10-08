import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './admin-portal.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConfirmProvider } from './context/ConfirmContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { ServiceRequestProvider } from './context/ServiceRequestContext.jsx'
import ServiceRequestModal from './components/common/ServiceRequestModal.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ServiceRequestProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
            <ServiceRequestModal />
          </ConfirmProvider>
        </ToastProvider>
      </ServiceRequestProvider>
    </AuthProvider>
  </StrictMode>,
)

