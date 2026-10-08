import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api.js'
import { getGoogleIdToken, signOutFromFirebase } from '../lib/firebase.js'

const AuthContext = createContext(null)

function readStoredUser() {
  const rawUser = localStorage.getItem('ca_user')

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const storedToken = localStorage.getItem('ca_token') || ''
  const [token, setToken] = useState(storedToken)
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(Boolean(storedToken && !storedToken.startsWith('local-service-')))

  // Keep localStorage and in-memory auth state in sync for protected routes.
  const persistSession = (nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem('ca_token', nextToken)
    localStorage.setItem('ca_user', JSON.stringify(nextUser))
  }

  const clearSession = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem('ca_token')
    localStorage.removeItem('ca_user')
  }

  const createLocalServiceSession = ({ name, phone }) => {
    const localUser = {
      _id: `local-${Date.now()}`,
      name,
      phone,
      email: '',
      role: 'user',
    }
    persistSession(`local-service-${Date.now()}`, localUser)
    setLoading(false)
    return localUser
  }

  const refreshProfile = async () => {
    const { data } = await api.get('/api/user/profile')
    setUser(data.user)
    localStorage.setItem('ca_user', JSON.stringify(data.user))
    return data.user
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    if (token.startsWith('local-service-')) {
      setLoading(false)
      return
    }

    refreshProfile()
      .catch(() => {
        // A browser refresh must not force the user away from the page they
        // were using. Keep the persisted session in place; manual logout is
        // the only action that clears this local dashboard session.
        setUser(readStoredUser())
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  const register = async (payload) => {
    const { data } = await api.post('/api/auth/register', payload)
    persistSession(data.token, data.user)
    return data.user
  }

  const login = async (payload) => {
    const { data } = await api.post('/api/auth/login', payload)
    persistSession(data.token, data.user)
    return data.user
  }

  const googleLogin = async () => {
    const idToken = await getGoogleIdToken()

    try {
      const { data } = await api.post('/api/auth/google', { idToken })
      persistSession(data.token, data.user)
      return data.user
    } catch (error) {
      await signOutFromFirebase().catch(() => {})
      throw error
    }
  }

  const logout = () => {
    clearSession()
    signOutFromFirebase().catch(() => {})
  }

  const updateUser = (nextUser) => {
    setUser(nextUser)
    localStorage.setItem('ca_user', JSON.stringify(nextUser))
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        token,
        user,
        createLocalServiceSession,
        googleLogin,
        login,
        logout,
        refreshProfile,
        register,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
