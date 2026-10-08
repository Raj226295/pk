import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { adminLinks, dashboardLinks } from '../../data/siteData.js'
import AdminIcon from '../admin/AdminIcon.jsx'
import logoImg from '../../assets/logo-optimized.png' 
import UserAvatar from '../common/UserAvatar.jsx'

function Sidebar({ role = 'user' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isServiceMenuOpen, setIsServiceMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const links = role === 'admin' ? adminLinks : dashboardLinks

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
    navigate('/')
  }

  return (
    <aside className={`sidebar ${role === 'admin' ? 'admin-sidebar' : ''}`}>
      <div className="sidebar-brand">
        <img src={logoImg} alt="PK Business Solution logo" className="brand-logo" />
        <div>
          <small>{role === 'admin' ? 'Client Portal Admin' : 'Client Portal'}</small>
          {role === 'admin' ? <span className="role-chip admin sidebar-role-chip">ADMIN</span> : user?.name ? <small>{user.name}</small> : null}
        </div>
      </div>

      <button
        aria-controls="dashboard-sidebar-menu"
        aria-expanded={isMenuOpen}
        className="sidebar-menu-toggle"
        onClick={() => setIsMenuOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true" className="sidebar-menu-toggle-icon">
          <span />
          <span />
          <span />
        </span>
        <span>{isMenuOpen ? 'Close menu' : 'Menu'}</span>
      </button>

      {role === 'user' ? <div className="mobile-dashboard-actions">
        <button aria-label="Open notifications" className="mobile-dashboard-notification" onClick={() => navigate('/dashboard/notifications')} type="button"><AdminIcon name="bell" size={23} /></button>
        <button aria-label="Open profile" className="mobile-dashboard-profile" onClick={() => navigate('/dashboard/profile')} type="button"><UserAvatar alt={`${user?.name || 'User'} profile`} user={user} /></button>
      </div> : null}

      <div className={`sidebar-menu ${isMenuOpen ? 'is-open' : ''}`} id="dashboard-sidebar-menu">
        <nav className="sidebar-nav">
          {links.map((link) => link.isServiceMenu ? (
            <div className="sidebar-service-menu" key="admin-service-menu">
              <button aria-expanded={isServiceMenuOpen} className="sidebar-link sidebar-service-menu-trigger" onClick={() => setIsServiceMenuOpen((open) => !open)} type="button">
                <span className="sidebar-link-icon"><AdminIcon name="services" size={17} strokeWidth={1.8} /></span><span>Services</span><span className="sidebar-service-caret">▾</span>
              </button>
              {isServiceMenuOpen ? <div className="sidebar-service-submenu">
                <NavLink to="/admin/services/tax-service">Tax Service</NavLink>
                <NavLink to="/admin/services/marketing">Marketing</NavLink>
                <NavLink to="/admin/services/influencers">Influencers</NavLink>
                <NavLink to="/admin/services/web-apps">Web & Apps</NavLink>
              </div> : null}
            </div>
          ) : (
            <NavLink
              key={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              onClick={() => setIsMenuOpen(false)}
              to={link.to}
            >
              {link.icon ? (
                <span className="sidebar-link-icon">
                  <AdminIcon name={link.icon} size={role === 'admin' ? 17 : 20} strokeWidth={role === 'admin' ? 1.8 : 1.9} />
                </span>
              ) : null}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          className="button button-primary button-compact sidebar-logout"
          onClick={handleLogout}
          type="button"
        >
          {role === 'admin' ? (
            <span className="sidebar-link-icon">
              <AdminIcon name="logout" size={16} />
            </span>
          ) : null}
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
