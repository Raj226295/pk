import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Sidebar from './Sidebar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import UserAvatar from '../common/UserAvatar.jsx'
import WhatsAppButton from '../common/WhatsAppButton.jsx'

const titleMap = {
  '/dashboard': 'Overview',
  '/dashboard/upload-documents': 'Upload Documents',
  '/dashboard/my-documents': 'My Documents',
  '/dashboard/documents': 'My Documents',
  '/dashboard/appointments': 'Appointments',
  '/dashboard/services': 'Services',
  '/dashboard/payments': 'Payments',
  '/dashboard/messages': 'Messages',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/profile': 'Profile',
  '/admin': 'OVERVIEW',
  '/admin/users': 'OVERVIEW',
  '/admin/messages': 'MESSAGE',
  '/admin/inquiries': 'INQUIRIES',
  '/admin/documents': 'MY FOLDER',
  '/admin/folders': 'MY FOLDER',
  '/admin/services': 'SERVICES',
  '/admin/appointments': 'APPOINTMENT',
  '/admin/payments': 'PAYMENTS',
  '/admin/profile': 'PROFILE',
}

function getWorkspaceTitle(pathname) {
  if (titleMap[pathname]) {
    return titleMap[pathname]
  }

  if (pathname.startsWith('/admin/clients/')) {
    if (pathname.endsWith('/services')) return 'SERVICES'
    if (pathname.includes('/services/')) return 'SERVICES'
    if (pathname.endsWith('/appointments')) return 'APPOINTMENT'
    if (pathname.endsWith('/payments')) return 'PAYMENT'
    if (pathname.endsWith('/profile')) return 'PROFILE'
    return 'CLIENT PREVIEW'
  }

  if (pathname.startsWith('/admin/folders/')) {
    return 'MY FOLDER'
  }

  return 'Workspace'
}

function DashboardLayout({ role }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdminPanel = role === 'admin'
  const profilePath = role === 'admin' ? '/admin/profile' : '/dashboard/profile'
  const reduceMotion = useReducedMotion()

  return (
    <div className={`dashboard-shell${isAdminPanel ? ' admin-shell' : ' user-dashboard-shell'}`}>
      <Sidebar role={role} />
      <div className="dashboard-content">
        <motion.header
          animate={{ opacity: 1, y: 0 }}
          className={`dashboard-topbar${isAdminPanel ? ' admin-topbar' : ''}`}
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <span className="eyebrow">{role === 'admin' ? 'Admin Workspace' : 'Client Workspace'}</span>
            <h2>{getWorkspaceTitle(location.pathname)}</h2>
            {isAdminPanel ? (
              <p className="admin-topbar-subtitle">Client Workspace</p>
            ) : null}
          </div>
          <button
            className={`user-pill user-pill-button${isAdminPanel ? ' admin-profile-pill' : ''}`}
            onClick={() => navigate(profilePath)}
            type="button"
          >
            <UserAvatar alt={`${user?.name || 'User'} profile image`} className="user-pill-avatar" user={user} />
            <div className="user-pill-copy">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
              <div className="workspace-identity">
                <span className={`role-chip ${user?.role === 'admin' ? 'admin' : 'client'}`}>
                  {user?.role === 'admin' ? 'ADMIN' : 'Client'}
                </span>
              </div>
            </div>
          </button>
        </motion.header>

        <main className="dashboard-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              initial={reduceMotion ? false : { opacity: 0, x: 14 }}
              key={location.pathname}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {isAdminPanel ? null : <WhatsAppButton />}
    </div>
  )
}

export default DashboardLayout
