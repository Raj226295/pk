import { useEffect, useState } from 'react'
import api from './api.js'

export default function useSiteSettings() {
  const [settings, setSettings] = useState({})
  useEffect(() => { let mounted = true; api.get('/api/public/site').then(({ data }) => { if (mounted) setSettings(data.settings || {}) }).catch(() => {}); return () => { mounted = false } }, [])
  return settings
}
