import { createContext, useContext, useMemo, useState } from 'react'

const ServiceRequestContext = createContext(null)

export function ServiceRequestProvider({ children }) {
  const [selectedService, setSelectedService] = useState(null)

  const value = useMemo(() => ({
    selectedService,
    closeServiceRequest: () => setSelectedService(null),
    requestService: (service) => {
      setSelectedService(service)
      return true
    },
  }), [selectedService])

  return <ServiceRequestContext.Provider value={value}>{children}</ServiceRequestContext.Provider>
}

export function useServiceRequest() {
  const context = useContext(ServiceRequestContext)
  if (!context) throw new Error('useServiceRequest must be used inside ServiceRequestProvider')
  return context
}
