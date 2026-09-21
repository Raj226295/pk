import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Loader from '../../components/common/Loader.jsx'
import AdminIcon from '../../components/admin/AdminIcon.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

function AdminDashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadDirectory = async () => {
    const [{ data: overviewData }, { data: usersData }] = await Promise.all([
      api.get('/api/admin/overview'),
      api.get('/api/admin/users'),
    ])

    const clientUsers = (usersData.users || []).filter((user) => user.role !== 'admin')
    setOverview(overviewData.overview)
    setUsers(clientUsers)
  }

  useEffect(() => {
    loadDirectory()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone || '').toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !user.isBlocked) ||
        (statusFilter === 'blocked' && user.isBlocked)

      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, users])

  const openPreview = (userId) => {
    navigate(`/admin/clients/${userId}`)
  }

  const toggleUserBlock = async (user) => {
    const nextAction = user.isBlocked ? 'unblock' : 'block'

    if (!window.confirm(`Do you want to ${nextAction} ${user.name}?`)) {
      return
    }

    try {
      await api.patch(`/api/admin/users/${user._id}/block`, { isBlocked: !user.isBlocked })
      await loadDirectory()
      setStatus({
        type: 'success',
        message: user.isBlocked ? 'Client unblocked successfully.' : 'Client blocked successfully.',
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name} and all related records? This cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/api/admin/users/${user._id}`)
      await loadDirectory()
      setStatus({ type: 'success', message: 'Client deleted successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading admin workspace..." />
  }

  return (
    <div className="page-stack admin-page-stack admin-overview-page">
      <nav aria-label="Breadcrumb" className="admin-overview-breadcrumb">
        <AdminIcon name="overview" size={17} />
        <span>Admin Workspace</span><b>›</b><strong>Overview</strong>
      </nav>

      <section className="admin-overview-hero">
        <div>
          <span className="admin-surface-eyebrow">Admin Workspace</span>
          <h1>Overview</h1>
          <p>Manage your clients, services, appointments, payments, and more from one place.</p>
        </div>
        <div aria-hidden="true" className="admin-overview-illustration">
          <span className="admin-overview-chart"><i/><i/><i/><i/></span>
          <span className="admin-overview-person"><AdminIcon name="profile" size={30} strokeWidth={2} /></span>
        </div>
      </section>

      <section className="admin-overview-kpis">
        {[
          ['users', 'blue', overview?.totalUsers ?? users.length, 'Total Users', 'Active client records in the portal.'],
          ['bell', 'gold', overview?.newNotifications ?? 0, 'New Notifications', 'Open items waiting for your response.'],
          ['appointment', 'green', overview?.totalAppointments ?? 0, 'Total Appointments', 'Scheduled client meetings.'],
          ['document', 'purple', overview?.pendingDocuments ?? 0, 'Pending Documents', 'Awaiting your review.'],
        ].map(([icon, tone, value, label, copy]) => (
          <article className={`admin-overview-kpi ${tone}`} key={label}>
            <i><AdminIcon name={icon} size={27} strokeWidth={2} /></i>
            <div><strong>{value}</strong><span>{label}</span></div>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="panel admin-table-surface admin-overview-directory">
        <div className="admin-table-head">
          <div>
            <span className="admin-surface-eyebrow">User Directory</span>
            <h3>Client workspace overview</h3>
            <p>Delete, block, unblock, or open each client in a dedicated preview workspace.</p>
          </div>

          <div className="admin-table-controls">
            <label className="admin-search-field">
              <AdminIcon name="search" size={16} />
              <input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, email, or phone..."
                type="text"
                value={searchTerm}
              />
            </label>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        <div className="admin-user-table">
          <div className="admin-user-table-head">
            <span>Client</span>
            <span>Email / Phone</span>
            <span>Status</span>
            <span>Joined On</span>
            <span>Actions</span>
          </div>

          {filteredUsers.length ? (
            filteredUsers.map((user) => (
              <article className="admin-user-row" key={user._id}>
                <div className="admin-user-cell">
                  <UserAvatar alt={`${user.name} profile`} className="admin-table-avatar" user={user} />
                  <strong>{user.name}</strong>
                </div>
                <div className="admin-overview-contact">
                  <strong>{user.email}</strong><span>{user.phone || 'No phone number'}</span>
                </div>
                <span className={`admin-overview-status ${user.isBlocked ? 'blocked' : 'active'}`}>
                  {user.isBlocked ? 'Blocked' : 'Active'}
                </span>
                <span className="admin-overview-joined">{formatDate(user.createdAt)}</span>
                <div className="admin-user-action-cell admin-overview-actions">
                  <button aria-label={`Preview ${user.name}`} className="admin-overview-action preview" onClick={() => openPreview(user._id)} title="Preview" type="button"><AdminIcon name="preview" /></button>
                  <button
                    aria-label={`${user.isBlocked ? 'Unblock' : 'Block'} ${user.name}`}
                    className={`admin-overview-action ${user.isBlocked ? 'unblock' : 'block'}`}
                    onClick={() => toggleUserBlock(user)}
                    title={user.isBlocked ? 'Unblock' : 'Block'}
                    type="button"
                  >
                    <AdminIcon name="block" />
                  </button>
                  <button aria-label={`Delete ${user.name}`} className="admin-overview-action delete" onClick={() => deleteUser(user)} title="Delete" type="button"><AdminIcon name="delete" /></button>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-table-empty">
              <i><AdminIcon name="users" size={34} strokeWidth={1.8} /></i>
              <h4>No matching users</h4>
              <p>Try another search term or switch the account filter.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
