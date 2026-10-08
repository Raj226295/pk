import axios from 'axios'

// Keep API calls relative in local development so a device on the LAN sends
// them back to the Vite server it opened (rather than to `localhost` on the
// device). Vite proxies /api and /uploads to the PHP server.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  // Use the current origin; Vite proxies local /api requests to PHP and
  // production deployments serve the API from their own origin.
  baseURL: apiBaseUrl,
  // Never leave a form disabled indefinitely when the server is unavailable.
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ca_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export function extractApiError(error) {
  if (error.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.'
  }

  if (!error.response) {
    return 'Server is unavailable. Please start the application server and try again.'
  }

  return error.response.data?.message || 'Something went wrong. Please try again.'
}

export default api
