import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { extractApiError } from '../../lib/api.js'

const LoginIcon = ({ name }) => {
  const paths = {
    user: <><circle cx="12" cy="7.5" r="3.5" /><path d="M5 21v-1.5a7 7 0 0 1 14 0V21" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2" /></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.8" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A8.6 8.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.8M6.6 6.6C4 8.3 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  }
  return <svg aria-hidden="true" className="login-field-icon" viewBox="0 0 24 24">{paths[name]}</svg>
}

function getDefaultPathForRole(role) {
  return role === 'admin' ? '/admin' : '/dashboard'
}

function getSafeRedirectPath(role, redirectTo = '') {
  if (!redirectTo) {
    return getDefaultPathForRole(role)
  }

  if (role === 'admin') {
    return redirectTo.startsWith('/admin') ? redirectTo : '/admin'
  }

  return redirectTo.startsWith('/dashboard') ? redirectTo : '/dashboard'
}

function Login() {
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const user = await login(form)
      navigate(getSafeRedirectPath(user.role, redirectTo), { replace: true })
    } catch (err) {
      setError(extractApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true)
    setError('')

    try {
      const user = await googleLogin()
      const destination = user.needsProfileCompletion ? '/dashboard/profile?complete=phone' : getSafeRedirectPath(user.role, redirectTo)
      navigate(destination, { replace: true })
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.')
      } else if (String(err?.code || '').startsWith('auth/')) {
        setError('Unable to sign in with Google. Please try again.')
      } else {
        setError(extractApiError(err))
      }
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
          <h1>Login</h1>

          <label className="login-field">
            <span>Email or Phone Number</span>
            <span className="login-input-wrap">
              <LoginIcon name="user" />
              <input
                autoComplete="username"
                name="identifier"
                onChange={handleChange}
                placeholder="Enter email or phone number"
                required
                type="text"
                value={form.identifier}
              />
            </span>
          </label>

          <label className="login-field">
            <span>Password</span>
            <span className="login-input-wrap">
              <LoginIcon name="lock" />
              <input
                autoComplete="current-password"
                name="password"
                onChange={handleChange}
                placeholder="Enter your password"
                required
                type={showPassword ? 'text' : 'password'}
                value={form.password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="login-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                <LoginIcon name={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            </span>
          </label>

          <Link className="login-forgot" to="/contact">Forgot Password?</Link>

          {error ? <p className="form-message error">{error}</p> : null}

          <button className="login-submit" disabled={submitting} type="submit">
            {submitting ? 'Signing in...' : 'Login'}
          </button>

          <div className="login-divider"><span>or</span></div>

          <button className="login-google" disabled={googleSubmitting || submitting} onClick={handleGoogleSignIn} type="button">
            <svg aria-hidden="true" className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
              <path fill="#34a853" d="M12 22c2.7 0 4.98-.9 6.64-2.42l-3.24-2.52c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z" />
              <path fill="#fbbc05" d="M6.39 13.89A6.02 6.02 0 0 1 6.08 12c0-.66.11-1.3.31-1.89v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.6Z" />
              <path fill="#ea4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.88-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.6C7.18 7.74 9.39 5.98 12 5.98Z" />
            </svg>
            <span>{googleSubmitting ? 'Connecting to Google...' : 'Login with Google'}</span>
          </button>

          <p className="login-signup">
            Need an account? <Link to="/register">Sign Up</Link>
          </p>
      </form>
    </section>
  )
}

export default Login
