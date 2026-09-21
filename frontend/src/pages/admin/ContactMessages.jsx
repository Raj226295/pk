import { useEffect, useMemo, useState } from 'react'
import Loader from '../../components/common/Loader.jsx'
import AdminIcon from '../../components/admin/AdminIcon.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDateTime } from '../../lib/formatters.js'

function sourceLabel(source = 'contact') {
  return source === 'popup' ? 'Popup' : 'Contact Page'
}

function ContactMessages() {
  const [messages, setMessages] = useState([])
  const [summary, setSummary] = useState({ total: 0, popupLeads: 0, contactPage: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    api.get('/api/admin/contact-messages')
      .then(({ data }) => {
        setMessages(data.messages || [])
        setSummary(data.summary || { total: 0, popupLeads: 0, contactPage: 0 })
      })
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredMessages = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return messages.filter((message) => {
      const matchesSource = sourceFilter === 'all' || message.source === sourceFilter
      const createdAt = new Date(message.createdAt)
      const ageInDays = (Date.now() - createdAt.getTime()) / 86400000
      const matchesDate = dateFilter === 'all' || (dateFilter === 'today' && ageInDays < 1) || (dateFilter === '7days' && ageInDays < 7) || (dateFilter === '30days' && ageInDays < 30)
      const matchesQuery =
        !query ||
        message.name.toLowerCase().includes(query) ||
        message.email.toLowerCase().includes(query) ||
        message.phone.toLowerCase().includes(query) ||
        message.message.toLowerCase().includes(query)

      return matchesSource && matchesDate && matchesQuery
    })
  }, [dateFilter, messages, searchTerm, sourceFilter])

  const todaysInquiries = useMemo(() => messages.filter((message) => {
    const createdAt = new Date(message.createdAt)
    const today = new Date()
    return createdAt.toDateString() === today.toDateString()
  }).length, [messages])

  if (loading) {
    return <Loader message="Loading inquiries..." />
  }

  return (
    <div className="page-stack admin-page-stack admin-inquiries-page">
      <nav aria-label="Breadcrumb" className="admin-overview-breadcrumb admin-inquiries-breadcrumb">
        <AdminIcon name="overview" size={17} />
        <span>Admin Workspace</span><b>›</b><strong>Inquiries</strong>
      </nav>

      <section className="admin-inquiries-hero">
        <div>
          <span className="admin-surface-eyebrow">Admin Workspace</span>
          <h1>Inquiries Center</h1>
          <p>Review all callback requests submitted from the public website and respond to clients.</p>
        </div>
        <div aria-hidden="true" className="admin-inquiries-art">
          <span className="admin-inquiries-paper"><i/><i/><i/></span>
          <span className="admin-inquiries-phone"><AdminIcon name="phone" size={31} strokeWidth={2.1} /></span>
          <div><strong>Stay Connected</strong><span>Manage and respond to<br/>client inquiries quickly.</span></div>
        </div>
      </section>

      <section className="admin-inquiry-stat-grid">
        {[
          ['phone', 'blue', summary.total, 'Total Inquiries', 'All client inquiries'],
          ['clock', 'gold', summary.total, 'Pending Response', 'Awaiting your action'],
          ['check', 'green', 0, 'Responded', 'Successfully handled'],
          ['users', 'purple', todaysInquiries, "Today's Inquiries", 'New inquiries today'],
        ].map(([icon, tone, value, label, copy]) => (
          <article className={`admin-inquiry-stat ${tone}`} key={label}>
            <i><AdminIcon name={icon} size={26} strokeWidth={2} /></i>
            <div><strong>{value}</strong><span>{label}</span></div>
            <p>{copy}</p><b>→</b>
          </article>
        ))}
      </section>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="panel admin-inquiries-table-panel">
          <div className="admin-inquiries-filters">
            <label className="admin-search-field">
              <AdminIcon name="search" size={16} />
              <input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, phone, email, or subject..."
                type="text"
                value={searchTerm}
              />
            </label>
            <select onChange={(event) => setSourceFilter(event.target.value)} value={sourceFilter}>
              <option value="all">All Sources</option>
              <option value="popup">Popup</option>
              <option value="contact">Contact Page</option>
            </select>
            <label className="admin-inquiries-date-filter">
              <AdminIcon name="appointment" size={17} />
              <select onChange={(event) => setDateFilter(event.target.value)} value={dateFilter}>
                <option value="all">Select date range</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
              </select>
            </label>
          </div>

        <div className="admin-inquiries-table-head"><span>Name</span><span>Contact</span><span>Subject</span><span>Source</span><span>Date</span><span>Status</span><span>Actions</span></div>
        <div className="admin-inquiries-table-body">
          {filteredMessages.length ? (
            filteredMessages.map((message) => (
              <article className="admin-inquiries-row" key={message._id}>
                <strong>{message.name}</strong>
                <span className="admin-inquiry-contact"><b>{message.phone}</b><small>{message.email}</small></span>
                <span className="admin-inquiry-subject">{message.message}</span>
                <span>{sourceLabel(message.source)}</span>
                <span>{formatDateTime(message.createdAt)}</span>
                <span className="admin-inquiry-pending">Pending</span>
                <span className="admin-inquiry-actions"><a aria-label={`Call ${message.name}`} href={`tel:${message.phone}`}><AdminIcon name="phone" size={16}/></a><a aria-label={`Email ${message.name}`} href={`mailto:${message.email}`}><AdminIcon name="email" size={16}/></a></span>
              </article>
            ))
          ) : (
            <div className="admin-inquiries-empty"><span><i/><i/><i/><AdminIcon name="phone" size={19}/></span><h3>No inquiries found</h3><p>Client inquiries from your website will appear here.</p></div>
          )}
        </div>
      </section>

      <aside className="admin-inquiries-tip"><i>💡</i><div><strong>Tip</strong><span>Respond to inquiries within 24 hours to provide better client service.</span></div></aside>
    </div>
  )
}

export default ContactMessages
