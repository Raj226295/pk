import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AdminIcon from '../admin/AdminIcon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import api, { extractApiError } from '../../lib/api.js'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  message: '',
}

function GetInTouchModal() {
  const { loading, user, token } = useAuth()
  const location = useLocation()

  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  // ✅ BLOCKED PAGES
  const blockedPages = ['/contact', '/login', '/register']
  const isBlockedPage = blockedPages.includes(location.pathname)

  useEffect(() => {
    // ❌ Do not show modal in these cases
    if (loading || token || user || dismissed || isBlockedPage) {
      setVisible(false)
      return
    }

    // ⏱️ show after 10 seconds
    const timer = window.setTimeout(() => {
      setVisible(true)
    }, 10000)

    return () => window.clearTimeout(timer)
  }, [dismissed, loading, location.pathname, token, user, isBlockedPage])

  useEffect(() => {
    setStatus({ type: '', message: '' })
  }, [location.pathname])

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const closeModal = () => {
    setVisible(false)
    setDismissed(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      await api.post('/api/contact', {
        ...form,
        source: 'popup',
        pageUrl: `${window.location.pathname}${window.location.search}`,
      })

      setForm(initialForm)
      setStatus({ type: 'success', message: 'Thank you. We will contact you soon.' })

      window.setTimeout(closeModal, 1200)
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <div className="get-in-touch-backdrop" role="presentation">
      <section
        aria-labelledby="get-in-touch-title"
        aria-modal="true"
        className="get-in-touch-modal"
        role="dialog"
      >
        <button
          aria-label="Close get in touch form"
          className="modal-icon-button"
          onClick={closeModal}
          type="button"
        >
          <AdminIcon name="close" size={18} />
        </button>

        <div className="get-in-touch-intro">
          <div className="get-in-touch-head">
            <h2 id="get-in-touch-title">Get in Touch</h2>
            <p>Need help with tax, GST, or business paperwork?<br />Fill out the form and we’ll get back to you soon.</p>
          </div>
        </div>

        <form className="get-in-touch-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span className="get-in-touch-label"><AdminIcon name="profile" size={20} /> Name <b>*</b></span>
              <input
                name="name"
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                type="text"
                value={form.name}
              />
            </label>

            <label>
              <span className="get-in-touch-label"><AdminIcon name="phone" size={20} /> Phone <b>*</b></span>
              <input
                name="phone"
                onChange={handleChange}
                placeholder="Enter your phone number"
                required
                type="tel"
                value={form.phone}
              />
            </label>

            <label className="full-width">
              <span className="get-in-touch-label"><AdminIcon name="email" size={20} /> Email <b>*</b></span>
              <input
                name="email"
                onChange={handleChange}
                placeholder="Enter your email address"
                required
                type="email"
                value={form.email}
              />
            </label>

            <label className="full-width get-in-touch-message-field">
              <span className="get-in-touch-label"><AdminIcon name="note" size={20} /> Message <b>*</b></span>
              <textarea
                maxLength="500"
                name="message"
                onChange={handleChange}
                placeholder="Tell us what you need help with (e.g. GST filing, ITR, business registration)"
                required
                rows="4"
                value={form.message}
              />
              <small>{form.message.length}/500</small>
            </label>
          </div>

          {status.message && (
            <p className={`form-message ${status.type}`}>{status.message}</p>
          )}

          <button
            className="button button-primary"
            disabled={submitting}
            type="submit"
          >
            <span>{submitting ? 'Sending...' : 'Submit Request'}</span>
          </button>
          <p className="get-in-touch-privacy">We’ll get back to you as soon as possible.</p>
        </form>
      </section>
    </div>
  )
}

export default GetInTouchModal
