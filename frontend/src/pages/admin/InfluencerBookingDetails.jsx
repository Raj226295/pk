import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { extractApiError } from '../../lib/api.js'
import Loader from '../../components/common/Loader.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { resolveUploadUrl } from '../../lib/uploads.js'

const amount = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

export default function InfluencerBookingDetails() {
  const { influencerId, bookingId } = useParams()
  const navigate = useNavigate()
  const [influencer, setInfluencer] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [denialReasons, setDenialReasons] = useState({})
  const [workingId, setWorkingId] = useState('')

  const load = useCallback(async () => {
    const [list, details] = await Promise.all([api.get('/api/admin/content/influencers'), api.get(`/api/admin/influencers/${influencerId}/bookings`)])
    setInfluencer((list.data.influencers || []).find((item) => item.id === influencerId) || null)
    setBookings(details.data.bookings || [])
  }, [influencerId])

  useEffect(() => { load().catch((error) => setMessage(extractApiError(error))).finally(() => setLoading(false)) }, [load])

  const review = async (booking, status) => {
    const reason = (denialReasons[booking.id] || '').trim()
    if (status === 'rejected' && !reason) return setMessage('Enter a reason before declining this booking.')
    setWorkingId(booking.id); setMessage('')
    try { const { data } = await api.patch(`/api/admin/influencer-bookings/${booking.id}`, { status, reason }); setMessage(data.message); await load() }
    catch (error) { setMessage(extractApiError(error)) }
    finally { setWorkingId('') }
  }

  const status = (booking) => <span className={`influencer-status ${booking.status === 'approved' ? 'active' : 'hidden'}`}>{booking.status}</span>
  const controls = (booking) => booking.status === 'pending' ? <div className="influencer-review-actions"><button className="button button-primary button-compact" disabled={workingId === booking.id} onClick={() => review(booking, 'approved')} type="button">{workingId === booking.id ? 'Saving...' : 'Approve & open payment'}</button><textarea aria-label={`Denial reason for ${booking.customer_name}`} onChange={(event) => setDenialReasons({ ...denialReasons, [booking.id]: event.target.value })} placeholder="Reason for denial (required)" rows="2" value={denialReasons[booking.id] || ''} /><button className="button button-ghost button-compact influencer-deny-button" disabled={workingId === booking.id} onClick={() => review(booking, 'rejected')} type="button">Decline & notify</button></div> : <small>{booking.status === 'approved' ? 'Payment is available to the customer.' : 'Customer has been notified.'}</small>

  if (loading) return <Loader message="Loading influencer bookings..." />
  const booking = bookings.find((item) => item.id === bookingId)

  if (bookingId) return <div className="page-stack influencer-booking-details-page"><PageHeader eyebrow="Influencer booking" title={booking?.customer_name || 'Booking details'} description="Review the complete customer submission and approve or decline this booking." actions={<button className="button button-ghost" onClick={() => navigate(`/admin/services/influencers/bookings/${influencerId}`)} type="button">Back to booking list</button>} />{message ? <p className="form-message">{message}</p> : null}{booking ? <section className="admin-table-surface influencer-booking-detail-card"><header className="admin-table-head"><div><span className="admin-surface-eyebrow">Customer booking</span><h3>{booking.customer_name}</h3></div>{status(booking)}</header><table className="influencer-booking-detail-table"><tbody><tr><th>Email</th><td>{booking.customer_email}</td></tr><tr><th>Phone</th><td>{booking.customer_phone || '—'}</td></tr><tr><th>Booking price</th><td>{amount(booking.price)}</td></tr><tr><th>Payment received</th><td className="influencer-payment-received">{amount(booking.amount_received)}</td></tr><tr><th>Booked on</th><td>{new Date(booking.created_at).toLocaleString()}</td></tr><tr><th>Customer notes</th><td>{booking.notes || '—'}</td></tr><tr><th>Submitted details</th><td>{booking.submitted_fields.length ? <table className="influencer-submission-table"><tbody>{booking.submitted_fields.map((item, index) => <tr key={`${booking.id}-${index}`}><th>{item.label}</th><td>{item.file_url ? <a href={resolveUploadUrl(item.file_url)} rel="noreferrer" target="_blank">{item.original_name || 'View document'}</a> : item.value_text || '—'}</td></tr>)}</tbody></table> : 'No additional fields submitted'}</td></tr>{booking.status === 'rejected' ? <tr><th>Denial reason</th><td className="influencer-denial-reason">{booking.admin_remarks || '—'}</td></tr> : null}</tbody></table><footer className="influencer-booking-detail-actions">{controls(booking)}</footer></section> : <section className="panel"><p>Booking not found.</p></section>}</div>

  return <div className="page-stack influencer-booking-details-page"><PageHeader eyebrow="Influencer bookings" title={influencer ? `${influencer.name} bookings` : 'Influencer bookings'} description="Select a customer booking to view their complete submission and take action." actions={<button className="button button-ghost" onClick={() => navigate('/admin/services/influencers')} type="button">Back to influencers</button>} />{message ? <p className="form-message">{message}</p> : null}<section className="influencer-booking-card-grid">{bookings.length ? bookings.map((item) => <button className="influencer-booking-customer-card" key={item.id} onClick={() => navigate(`/admin/services/influencers/bookings/${influencerId}/${item.id}`)} type="button"><span className="influencer-booking-customer-avatar">{item.customer_name?.[0]}</span><span className="influencer-booking-customer-copy"><strong>{item.customer_name}</strong><small>{item.customer_email}</small><em>{new Date(item.created_at).toLocaleDateString()} · {amount(item.price)}</em><em className="influencer-payment-received">Received: {amount(item.amount_received)}</em></span>{status(item)}<b>View details →</b></button>) : <section className="panel"><p>No bookings have been submitted for this influencer yet.</p></section>}</section></div>
}
