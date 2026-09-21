import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDateTime } from '../../lib/formatters.js'
import { Icon } from '../public/Home.jsx'

const messageFilters = [
  ['all', 'All Messages'],
  ['unread', 'Unread'],
  ['response', 'Admin Replies'],
  ['service', 'Service Updates'],
  ['payment', 'Payment Updates'],
  ['document', 'Document Review'],
]

function categoryIcon(category = 'general') {
  const icons = { response: 'advisor', payment: 'wallet', appointment: 'calendar', service: 'briefcase', document: 'fileCheck', security: 'shield' }
  return icons[String(category).toLowerCase()] || 'bell'
}

function categoryLabel(category = 'general') {
  const normalized = String(category).toLowerCase()

  if (normalized === 'response') return 'Admin Reply'
  if (normalized === 'payment') return 'Payment'
  if (normalized === 'appointment') return 'Appointment'
  if (normalized === 'service') return 'Service'
  if (normalized === 'document') return 'Document'
  if (normalized === 'security') return 'Security'

  return 'General'
}

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const summary = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.read).length,
      adminReplies: notifications.filter((notification) => notification.category === 'response').length,
    }
  }, [notifications])

  const visibleNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return notifications.filter((notification) => {
      const category = String(notification.category || 'general').toLowerCase()
      const matchesFilter = activeFilter === 'all'
        || (activeFilter === 'unread' ? !notification.read : category === activeFilter)
      const text = `${notification.title || ''} ${notification.message || ''} ${categoryLabel(category)}`.toLowerCase()
      return matchesFilter && (!query || text.includes(query))
    })
  }, [activeFilter, notifications, searchQuery])

  const loadNotifications = async () => {
    const { data } = await api.get('/api/notifications')
    const notificationList = Array.isArray(data)
      ? data
      : Array.isArray(data?.notifications)
        ? data.notifications
        : []
    setNotifications(notificationList.filter(Boolean))
  }

  useEffect(() => {
    loadNotifications()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const markAsRead = async (notificationId) => {
    await api.patch(`/api/notifications/${notificationId}/read`)
    setNotifications((current) =>
      current.map((notification) =>
        notification._id === notificationId ? { ...notification, read: true } : notification,
      ),
    )
  }

  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all')
      await loadNotifications()
      setStatus({ type: 'success', message: 'All notifications marked as read.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const openNotificationAction = async (notification) => {
    try {
      if (!notification.read) {
        await markAsRead(notification._id)
      }

      if (notification.link) {
        navigate(notification.link)
        return
      }

      if (notification.fileUrl) {
        navigate('/dashboard/my-documents')
      }
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading notifications..." />
  }

  return (
    <div className="page-stack messages-workspace-page">
      <header className="messages-page-heading">
        <span className="eyebrow">Client Workspace</span>
        <h1>Mes<em>sages</em></h1>
        <p>Read admin replies, document review updates, payment verification messages, and request responses from one place.</p>
      </header>

      <section className="messages-hero-banner">
        <span className="messages-hero-icon"><Icon name="bell" /></span>
        <div><h2>Stay <em>Updated</em></h2><p>Get all updates, replies and important notifications here.</p></div>
        <span className="messages-paper-plane"><Icon name="arrowRight" /></span>
        <strong>We're here<br />to help you!</strong>
      </section>

      <section className="messages-summary-grid">
        <article className="messages-summary-card total">
          <span><Icon name="bell" /></span>
          <div><h3>Total Messages</h3><strong>{summary.total}</strong><p>All notifications &amp; updates</p></div>
        </article>
        <article className="messages-summary-card unread">
          <span><Icon name="clock" /></span>
          <div><h3>Unread Messages</h3><strong>{summary.unread}</strong><p>Messages pending to read</p></div>
        </article>
        <article className="messages-summary-card replies">
          <span><Icon name="advisor" /></span>
          <div><h3>Admin Replies</h3><strong>{summary.adminReplies}</strong><p>Responses from admin</p></div>
        </article>
      </section>

      <section className="messages-toolbar">
        <div className="messages-filter-tabs">
          {messageFilters.map(([value, label]) => (
            <button className={activeFilter === value ? 'active' : ''} key={value} onClick={() => setActiveFilter(value)} type="button">{label}</button>
          ))}
        </div>
        <label className="messages-search"><Icon name="search" /><input aria-label="Search messages" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search messages..." type="search" value={searchQuery} /></label>
        {notifications.length && summary.unread ? <button className="messages-read-all" onClick={markAllAsRead} type="button">Mark all read</button> : null}
      </section>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {visibleNotifications.length ? (
        <div className="messages-list">
          {visibleNotifications.map((notification) => (
            <article
              className={`message-row message-category-${String(notification.category || 'general').toLowerCase()} ${notification.read ? 'muted' : 'unread'}`}
              key={notification._id}
            >
              <span className="message-row-icon"><Icon name={categoryIcon(notification.category)} />{!notification.read ? <i aria-label="Unread message" /> : null}</span>
              <div className="message-row-copy">
                <div><strong>{notification.title}</strong><span>{categoryLabel(notification.category)}</span></div>
                <p>{notification.message}</p>
                <small><Icon name="clock" />{formatDateTime(notification.createdAt)}</small>
              </div>
              <span className={`message-read-state ${notification.read ? 'read' : ''}`}>{notification.read ? 'Read' : 'Unread'}</span>
              <button aria-label={`Open ${notification.title}`} className="message-open-button" onClick={() => openNotificationAction(notification)} type="button"><Icon name="arrowRight" /></button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState description={notifications.length ? 'Try another filter or search term.' : 'Admin replies and system responses will appear here.'} title="No messages available" />
      )}
    </div>
  )
}

export default Notifications
