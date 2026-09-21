import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { extractApiError } from '../../lib/api.js'

const RegisterIcon = ({ name }) => {
  const paths = {
    user: <><circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-1.5a7 7 0 0 1 14 0V21"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    phone: <><path d="M7 3h3l1.3 4-2 1.5a15 15 0 0 0 6.2 6.2l1.5-2 4 1.3v3c0 2-1.5 4-4 4C9.3 21 3 14.7 3 7c0-2.5 2-4 4-4Z"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A8.6 8.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.8M6.6 6.6C4 8.3 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3-.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
  }
  return <svg aria-hidden="true" className="register-field-icon" viewBox="0 0 24 24">{paths[name]}</svg>
}

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      setSubmitting(false)
      return
    }

    try {
      const registrationData = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      }
      await register(registrationData)

      // ✅ Correct URL
      fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone }),
      })

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(extractApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="register-page">
      <form className="register-card" onSubmit={handleSubmit}>
        <header><h1>Create Account</h1><p>Join PK Business and get started today</p></header>

        <label className="register-field">
          <span>Full Name</span>
          <span className="register-input-wrap"><RegisterIcon name="user"/><input autoComplete="name" name="name" onChange={handleChange} placeholder="Enter your full name" required type="text" value={form.name}/></span>
        </label>

        <label className="register-field">
          <span>Email Address</span>
          <span className="register-input-wrap"><RegisterIcon name="mail"/><input autoComplete="email" name="email" onChange={handleChange} placeholder="Enter your email" required type="email" value={form.email}/></span>
        </label>

        <label className="register-field">
          <span>Phone Number</span>
          <span className="register-input-wrap"><RegisterIcon name="phone"/><input autoComplete="tel" name="phone" onChange={handleChange} placeholder="Enter your phone number" required type="tel" value={form.phone}/></span>
        </label>

        <label className="register-field">
          <span>Password</span>
          <span className="register-input-wrap"><RegisterIcon name="lock"/><input autoComplete="new-password" minLength="6" name="password" onChange={handleChange} placeholder="Create a password" required type={showPassword ? 'text' : 'password'} value={form.password}/><button aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={()=>setShowPassword((value)=>!value)} type="button"><RegisterIcon name={showPassword ? 'eyeOff' : 'eye'}/></button></span>
        </label>

        <label className="register-field">
          <span>Confirm Password</span>
          <span className="register-input-wrap"><RegisterIcon name="lock"/><input autoComplete="new-password" minLength="6" name="confirmPassword" onChange={handleChange} placeholder="Confirm your password" required type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword}/><button aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={()=>setShowConfirmPassword((value)=>!value)} type="button"><RegisterIcon name={showConfirmPassword ? 'eyeOff' : 'eye'}/></button></span>
        </label>

        {error ? <p className="form-message error">{error}</p> : null}

        <button className="register-submit" disabled={submitting} type="submit">
          {submitting ? 'Creating account...' : 'Sign Up'}
        </button>

        <div className="register-divider"><span>or</span></div>
        <button aria-disabled="true" className="register-google" title="Google signup is not currently available" type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34a853" d="M12 22c2.7 0 4.98-.9 6.64-2.42l-3.24-2.52c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.39 13.89A6.02 6.02 0 0 1 6.08 12c0-.66.11-1.3.31-1.89v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.6Z"/><path fill="#ea4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.88-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.6C7.18 7.74 9.39 5.98 12 5.98Z"/></svg><span>Sign up with Google</span></button>
        <p className="register-login">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </section>
  )
}

export default Register
