import { useEffect, useState } from 'react'
import { Icon } from '../../pages/public/Home.jsx'
import { useServiceRequest } from '../../context/ServiceRequestContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import api, { extractApiError } from '../../lib/api.js'

const emptyForm = { name: '', phone: '', address: '' }

function ServiceRequestModal() {
  const { selectedService, closeServiceRequest } = useServiceRequest()
  const { createLocalServiceSession } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [step, setStep] = useState(1)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!selectedService) return undefined
    setStep(1)
    setStatus({ type: '', message: '' })
    setForm(emptyForm)
    setPassword('')
    setShowPassword(false)
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event) => event.key === 'Escape' && closeServiceRequest()
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeServiceRequest, selectedService])

  if (!selectedService) return null

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submitRequest = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })
    const phoneDigits = form.phone.replace(/\D/g, '')
    const requestPayload = {
      name: form.name,
      phone: form.phone,
      // Keeps this form compatible with older deployed API versions where email was mandatory.
      email: `service-request-${phoneDigits || Date.now()}@pkbusiness.local`,
      message: `Service: ${selectedService.title}\nAddress: ${form.address}\n${selectedService.description || ''}`,
      source: 'service-card',
      pageUrl: `${window.location.pathname}${window.location.search}`,
    }
    try {
      await api.post('/api/contact', requestPayload)
      setStatus({ type: '', message: '' })
      setStep(2)
    } catch (error) {
      // Do not block the customer journey during a temporary API outage.
      try {
        const pending = JSON.parse(localStorage.getItem('pk_pending_service_requests') || '[]')
        pending.push({ ...requestPayload, service: selectedService, savedAt: new Date().toISOString() })
        localStorage.setItem('pk_pending_service_requests', JSON.stringify(pending.slice(-10)))
        setStatus({ type: '', message: '' })
        setStep(2)
      } catch {
        setStatus({ type: 'error', message: extractApiError(error) })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const createDashboard = async (event) => {
    event.preventDefault()
    if (password.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters.' })
      return
    }
    setSubmitting(true)
    setStatus({ type: '', message: '' })
    const openSelectedServiceDashboard = () => {
      const flowId = selectedService.flowId || ''
      const documentType = selectedService.documentType || selectedService.title
      const uploadQuery = new URLSearchParams({ documentType })
      if (flowId) uploadQuery.set('service', flowId)
      setStep(3)
      window.setTimeout(() => {
        closeServiceRequest()
        window.location.assign(`/dashboard/upload-documents?${uploadQuery.toString()}`)
      }, 450)
    }

    createLocalServiceSession({ name: form.name, phone: form.phone })
    openSelectedServiceDashboard()
    setSubmitting(false)
  }

  return <div className="service-request-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeServiceRequest()} role="presentation">
    <section aria-labelledby="service-request-title" aria-modal="true" className="service-request-modal" role="dialog">
      <button aria-label="Close service request" className="service-request-close" onClick={closeServiceRequest} type="button">×</button>
      {step === 1 ? <>
        <header>
          <small>Service Request · {selectedService.title}</small>
          <h2 id="service-request-title">Tell us where to <em>reach you</em></h2>
          <p>Share your contact details and our service expert will guide you through the next steps.</p>
        </header>
        <form onSubmit={submitRequest}>
        <div className="service-request-fields">
          <label className="service-request-field service-request-field-name"><i className="service-request-field-icon"><Icon name="profile"/></i><div><span>Full name <b>*</b></span><input autoFocus name="name" onChange={updateField} placeholder="Enter your full name" required type="text" value={form.name}/></div></label>
          <label className="service-request-field service-request-field-phone"><i className="service-request-field-icon"><Icon name="phone"/></i><div><span>Phone number <b>*</b></span><div className="service-request-phone-input"><span aria-hidden="true"><i className="phone-country-flag"/><b>+91</b></span><input inputMode="tel" name="phone" onChange={updateField} pattern="[0-9 +()-]{10,15}" placeholder="Enter your phone number" required type="tel" value={form.phone}/><i aria-hidden="true" className="phone-call-icon"><Icon name="phoneCall"/></i></div></div></label>
          <label className="full-width service-request-field service-request-field-address"><i className="service-request-field-icon"><Icon name="mapPin"/></i><div><span>Address <b>*</b></span><textarea name="address" onChange={updateField} placeholder="Enter your complete address" required rows="3" value={form.address}/></div></label>
        </div>
        <div className="service-request-selected">
          <i><Icon name={selectedService.icon || 'fileCheck'}/></i>
          <div><small>Selected service</small><strong>{selectedService.title}</strong><p>{selectedService.description || 'Expert support tailored to your requirement.'}</p></div>
        </div>
        {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}
        <button className="service-request-submit" disabled={submitting} type="submit"><Icon name="send"/><span>{submitting ? 'Submitting…' : 'Submit Request'}</span><b aria-hidden="true">→</b></button>
        <div className="service-request-assurances">
          <span><Icon name="lock"/>Your information is secure</span><span><Icon name="shield"/>Used only for this service request</span><span><Icon name="advisor"/>Our expert will contact you soon</span>
        </div>
        </form>
      </> : step === 2 ? <div className="service-request-next-step">
        <header>
          <small>Service Request · {selectedService.title}</small>
          <h2 id="service-request-title">How would you like to <em>continue?</em></h2>
        </header>
        <div className="service-request-choices">
          <button className="service-request-choice-payment" onClick={() => { closeServiceRequest(); window.location.assign(`/register?service=${encodeURIComponent(selectedService.title)}&intent=payment`) }} type="button">
            <i><Icon name="card"/></i><strong>Pay Now</strong><b>{selectedService.price ? `₹${selectedService.price}` : 'Get Quote'}<em>→</em></b>
          </button>
          <button className="service-request-choice-dashboard" onClick={() => { setStatus({ type: '', message: '' }); setStep(3) }} type="button">
            <i><Icon name="profileLock"/></i><strong>Create Password</strong><b>Dashboard<em>→</em></b>
          </button>
        </div>
        <button className="service-request-edit" onClick={() => setStep(1)} type="button">← <span>Edit your details</span></button>
      </div> : null}
      {step === 3 ? <div className="service-password-step">
        <header>
          <h2 id="service-request-title">Create your <em>password</em></h2>
        </header>
        <form onSubmit={createDashboard}>
          <label className="service-password-field"><div><Icon name="lock"/><input autoFocus minLength="6" onChange={(event)=>setPassword(event.target.value)} placeholder="Enter your password" required type={showPassword?'text':'password'} value={password}/><button aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword((visible)=>!visible)} type="button"><Icon name={showPassword?'eyeOff':'eye'}/></button></div><small>Minimum 6 characters</small></label>
          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}
          <button className="service-password-submit" disabled={submitting} type="submit"><span>{submitting?'Creating dashboard…':'Create Password & Open Dashboard'}</span><b>→</b></button>
          <button className="service-password-back" onClick={()=>{setStatus({type:'',message:''});setStep(2)}} type="button">← <span>Back to options</span></button>
        </form>
      </div> : null}
    </section>
  </div>
}

export default ServiceRequestModal
