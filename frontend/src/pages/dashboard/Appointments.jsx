import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDateTime } from '../../lib/formatters.js'
import { Icon } from '../public/Home.jsx'
import { directServices, webPackages } from '../public/MarketingWebApps.jsx'
import { serviceGroups } from '../public/Services.jsx'

const serviceOptionGroups = [
  {
    label: 'Tax Services',
    options: serviceGroups.flatMap((group) => group.services.map(([title]) => title)),
  },
  {
    label: 'Marketing',
    options: directServices.map(([title]) => title),
  },
  {
    label: 'Web & Apps',
    options: webPackages.map((service) => service.title),
  },
  {
    label: 'Influencer Marketing',
    options: ['Influencer Marketing'],
  },
]

const activeAppointmentStatuses = ['pending', 'approved', 'rescheduled', 'confirmed', 'scheduled']

const timeSlots = (() => {
  const slots = []
  for (let hour = 9; hour <= 18; hour++) {
    for (let min of [0, 30]) {
      if (hour === 18 && min === 30) break
      const h = hour % 12 === 0 ? 12 : hour % 12
      const ampm = hour < 12 ? 'AM' : 'PM'
      const label = `${h}:${min === 0 ? '00' : min} ${ampm}`
      const value = `${String(hour).padStart(2, '0')}:${min === 0 ? '00' : '30'}`
      slots.push({ label, value })
    }
  }
  return slots
})()

const initialForm = {
  scheduledDate: '',
  scheduledTime: '',
  mainService: '',
  serviceType: '',
  notes: '',
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

function combineDatetime(date, time) {
  if (!date || !time) return ''
  return new Date(`${date}T${time}:00`).toISOString()
}

function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const summary = useMemo(() => ({
    total: appointments.length,
    active: appointments.filter((a) => activeAppointmentStatuses.includes(a.status)).length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => ['cancelled', 'rejected'].includes(a.status)).length,
  }), [appointments])

  const loadAppointments = async () => {
    const { data } = await api.get('/api/appointments')
    setAppointments(data.appointments || [])
  }

  useEffect(() => {
    loadAppointments()
      .catch((error) => setStatus({ type: 'error', message: extractApiError(error) }))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleMainServiceChange = (event) => {
    setForm((current) => ({
      ...current,
      mainService: event.target.value,
      serviceType: '',
    }))
  }

  const selectedServiceGroup = serviceOptionGroups.find((group) => group.label === form.mainService)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })
    if (!form.mainService) { setStatus({ type: 'error', message: 'Please select a main service.' }); return }
    if (!form.serviceType) { setStatus({ type: 'error', message: 'Please select a sub-service.' }); return }
    if (!form.scheduledDate) { setStatus({ type: 'error', message: 'Please select a date.' }); return }
    if (!form.scheduledTime) { setStatus({ type: 'error', message: 'Please select a time slot.' }); return }
    setSubmitting(true)
    try {
      const scheduledFor = combineDatetime(form.scheduledDate, form.scheduledTime)
      await api.post('/api/appointments', { scheduledFor, serviceType: form.serviceType, notes: form.notes })
      setForm(initialForm)
      await loadAppointments()
      setStatus({ type: 'success', message: 'Appointment booked successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader message="Loading appointments..." />

  return (
    <div className="page-stack appointments-workspace-page">
      <PageHeader
        description="Request a consultation, select the service you need help with, and track approval, reschedule, or completion updates."
        eyebrow="Appointments"
        title="Consultation Booking"
      />

      <section className="card-grid two-up appointments-main-grid">
        <form className="panel form-panel appointment-booking-panel" onSubmit={handleSubmit}>
          <h3>Book a consultation</h3>
          <p>Fill in the details to request a consultation with our team.</p>
          <label>
            Main service
            <select name="mainService" onChange={handleMainServiceChange} required value={form.mainService}>
              <option value="">Select a main service</option>
              {serviceOptionGroups.map((group) => <option key={group.label} value={group.label}>{group.label}</option>)}
            </select>
          </label>
          <label>
            Selected sub-service
            <select disabled={!selectedServiceGroup} name="serviceType" onChange={handleChange} required value={form.serviceType}>
              <option value="">{selectedServiceGroup ? 'Select a sub-service' : 'Choose a main service first'}</option>
              {selectedServiceGroup?.options.map((service) => <option key={service} value={service}>{service}</option>)}
            </select>
          </label>
          <div className="appointment-datetime-group">
            <label>
              Preferred date
              <input min={getTodayString()} name="scheduledDate" onChange={handleChange} required type="date" value={form.scheduledDate} />
            </label>
            <label>
              Preferred time
              <select name="scheduledTime" onChange={handleChange} required value={form.scheduledTime}>
                <option value="">Select a slot</option>
                {timeSlots.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
              </select>
            </label>
          </div>
          {form.scheduledDate && form.scheduledTime ? (
            <p className="appointment-datetime-preview">
              Scheduled for <strong>{new Date(`${form.scheduledDate}T${form.scheduledTime}`).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</strong>
            </p>
          ) : null}
          <label>
            Message <em>(Optional)</em>
            <textarea name="notes" onChange={handleChange} placeholder="Add context for the discussion" rows="4" value={form.notes} />
          </label>
          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Booking...' : 'Book Consultation'}
            {!submitting ? <Icon name="arrowRight" /> : null}
          </button>
        </form>

        <article className="panel document-summary-panel appointment-summary-panel">
          <h3>Appointment summary</h3>
          <p>Track your consultation requests and their status.</p>
          <div className="document-summary-grid">
            <div className="document-stat-tile blue"><i><Icon name="taxFile" /></i><strong>{summary.total}</strong><span>Total</span></div>
            <div className="document-stat-tile gold"><i><Icon name="clock" /></i><strong>{summary.active}</strong><span>Active</span></div>
            <div className="document-stat-tile green"><i><Icon name="fileCheck" /></i><strong>{summary.completed}</strong><span>Completed</span></div>
            <div className="document-stat-tile violet"><i><Icon name="calendar" /></i><strong>{summary.cancelled}</strong><span>Cancelled</span></div>
          </div>
          <div className="appointment-quick-info">
            <Icon name="bolt" />
            <div><strong>Quick Info</strong><ul className="bullet-list">
            <li>New bookings go to admin for review and approval.</li>
            <li>You will be notified once your appointment is confirmed.</li>
            <li>Reschedule, rejection, and admin notes will appear in your history.</li>
            </ul></div>
          </div>
        </article>
      </section>

      <section className="panel appointments-history-panel">
        <header><h3>Your Appointments</h3><p>View and manage all your consultation requests.</p></header>
      {appointments.length ? (
        <div className="appt-list">
          {appointments.map((appt) => (
            <article className="appt-row" key={appt._id}>
              <div className="appt-row-left">
                <span className="appt-row-dot" />
              </div>
              <div className="appt-row-body">
                <div className="appt-row-top">
                  <div className="appt-row-info">
                    <strong className="appt-row-datetime">{formatDateTime(appt.scheduledFor)}</strong>
                    <span className="appt-row-service">{appt.serviceType || 'General consultation'}</span>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
                {appt.notes ? <p className="appt-row-notes">{appt.notes}</p> : null}
                {appt.rejectionReason ? (
                  <div className="appt-row-tag appt-row-tag-danger">
                    <span>⚠</span> {appt.rejectionReason}
                  </div>
                ) : null}
                {appt.adminNotes ? (
                  <div className="appt-row-tag appt-row-tag-info">
                    <span>💬</span> {appt.adminNotes}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState description="Your booked consultations will show up here." icon={<Icon name="calendar" />} title="No appointments yet" />
      )}
      </section>
    </div>
  )
}

export default Appointments
