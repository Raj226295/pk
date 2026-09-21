import { useState } from 'react'
import { siteContact } from '../../data/siteData.js'
import api, { extractApiError } from '../../lib/api.js'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  service: '',
  message: '',
}

const ContactIcon = ({ name }) => {
  const paths = {
    phone: <path d="M7 3.5 9.6 8l-2.2 2a15 15 0 0 0 6.6 6.6l2-2.2 4.5 2.6-.8 3a1.5 1.5 0 0 1-1.7 1C10.5 20 4 13.5 3 6a1.5 1.5 0 0 1 1-1.7Z" />,
    whatsapp: <><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.6A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8.2 7.8c.5 3.7 2.3 5.5 6 6.2l1-1.7-2.2-1-1 1c-1.1-.5-1.9-1.3-2.4-2.4l1-1-1-2.1Z"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    send: <><path d="m3 11 18-8-8 18-2-8Z"/><path d="m11 13 5-5"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6Z"/><path d="m9 12 2 2 4-5"/></>,
    headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h4v6H6a2 2 0 0 1-2-2zM20 14h-4v6h2a2 2 0 0 0 2-2z"/></>,
  }
  return <svg aria-hidden="true" className="contact-icon" viewBox="0 0 24 24">{paths[name]}</svg>
}

function Contact() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: '', message: '' })
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
    setStatus({ type: '', message: '' })

    try {
      const { service, ...contactPayload } = form
      await api.post('/api/contact', {
        ...contactPayload,
        message: service ? `Service needed: ${service}\n${form.message}` : form.message,
      })
      setForm(initialForm)
      setStatus({ type: 'success', message: 'Your message has been sent. We will contact you soon.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="contact-page-new">
      <section className="contact-hero-new">
        <div><span>Contact Us</span><h1>Talk to an <em>expert</em> today — free</h1><p>Get your questions answered by our advisors and specialists.<br/>We&apos;re here to help your business grow with the right solutions.</p></div>
        <div className="contact-hero-art" aria-hidden="true"><i><ContactIcon name="headset" /></i><b>•••</b></div>
      </section>

      <section className="contact-main-new">
        <div className="contact-options-new">
          <a href="tel:+916299484291"><i><ContactIcon name="phone"/></i><span><strong>Call Us</strong><small>+91 62994 84291</small></span><b>Call Now&nbsp; →</b></a>
          <a href="https://wa.me/917280873845" rel="noreferrer" target="_blank"><i><ContactIcon name="whatsapp"/></i><span><strong>WhatsApp</strong><small>+91 72808 73845</small></span><b>Chat Now&nbsp; →</b></a>
          <a href={`mailto:${siteContact.email}`}><i><ContactIcon name="mail"/></i><span><strong>Email</strong><small>{siteContact.email}</small></span><b>Write to Us&nbsp; →</b></a>
          <article className="contact-office-new">
            <div><i><ContactIcon name="clock"/></i><span><strong>Working Hours</strong><small>{siteContact.officeHours}</small></span></div>
            <div><i><ContactIcon name="pin"/></i><span><strong>Our Office</strong><small>{siteContact.address}</small></span></div>
          </article>
        </div>

        <form className="contact-form-new" onSubmit={handleSubmit}>
          <h2>Book your free consultation</h2><p>Fill in the form below and our team will get in touch with you at the earliest.</p>
          <div className="contact-form-grid-new">
            <input name="name" onChange={handleChange} placeholder="Full Name *" required type="text" value={form.name}/>
            <input name="phone" onChange={handleChange} placeholder="Phone Number *" required type="tel" value={form.phone}/>
            <input name="email" onChange={handleChange} placeholder="Email Address *" required type="email" value={form.email}/>
            <select name="service" onChange={handleChange} value={form.service}><option value="">Service Needed</option><option>GST Services</option><option>Income Tax Services</option><option>Accounting Services</option><option>Business Registration</option></select>
            <textarea name="message" onChange={handleChange} placeholder="Tell us a little about your requirement..." required rows="5" value={form.message}/>
          </div>
          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}
          <button disabled={submitting} type="submit"><ContactIcon name="send"/>{submitting ? 'Sending...' : 'Send Consultation'}</button>
          <small className="contact-safe-note"><ContactIcon name="shield"/> Your information is safe with us. We never share your details.</small>
        </form>
      </section>

      <section className="contact-map-new">
        <header><span>Visit Us</span><h2>Find us in the heart of Purnia</h2><p>Visit our office for a face-to-face consultation or book an appointment<br/>for personalized support.</p></header>
        <article className="map-panel">
            <a
              aria-label="Open office location in Google Maps"
              className="map-link-wrap"
              href={siteContact.mapLink}
              rel="noreferrer"
              target="_blank"
            >
              <iframe
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(siteContact.mapQuery)}&z=15&output=embed`}
                title="Office map"
              />
              <span className="map-link-overlay">Tap to open in Google Maps</span>
            </a>
        </article>
        <a className="contact-map-button" href={siteContact.mapLink} rel="noreferrer" target="_blank"><ContactIcon name="send"/>Open in Google Maps</a>
      </section>
    </div>
  )
}

export default Contact
