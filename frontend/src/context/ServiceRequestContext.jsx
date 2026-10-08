import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/api.js'

const ServiceRequestContext = createContext(null)

export function ServiceRequestProvider({ children }) {
  const [selectedService, setSelectedService] = useState(null)
  const [availability, setAvailability] = useState(null)

  useEffect(() => {
    let current = true
    api.get('/api/public/service-availability').then(({ data }) => { if (current) setAvailability(data.services || {}) }).catch(() => {})
    return () => { current = false }
  }, [])

  const value = useMemo(() => {
    const ensureServiceAvailable = async (mainService = 'tax-service', { redirectToComingSoon = true } = {}) => {
      let statuses = availability
      try {
        // Always refresh before opening a service. This makes an admin's
        // availability change effective for users who already have the panel open.
        const { data } = await api.get('/api/public/service-availability')
        statuses = data.services || {}
        setAvailability(statuses)
      } catch { /* Do not block an enquiry during a temporary API outage. */ }
      if (statuses?.[mainService]?.is_active === false) {
        if (redirectToComingSoon) window.location.assign(`/coming-soon/${encodeURIComponent(mainService)}`)
        return false
      }
      return true
    }

    return {
      selectedService,
      closeServiceRequest: () => setSelectedService(null),
      ensureServiceAvailable,
      requestService: async (service, mainService = 'tax-service') => {
        const isAvailable = await ensureServiceAvailable(mainService)
        if (!isAvailable) return false
        setSelectedService(service)
        return true
      },
    }
  }, [availability, selectedService])

  return <ServiceRequestContext.Provider value={value}>{children}</ServiceRequestContext.Provider>
}

export function useServiceRequest() {
  const context = useContext(ServiceRequestContext)
  if (!context) throw new Error('useServiceRequest must be used inside ServiceRequestProvider')
  return context
}
