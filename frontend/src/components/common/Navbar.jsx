import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'
import { publicNavLinks, siteContact, siteSocials } from '../../data/siteData.js'
import logoImg from '../../assets/logo.png' 
import UserAvatar from './UserAvatar.jsx'

const MotionNavLink = motion.create(NavLink)

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const navRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMenuOpen])

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="navbar-wrap"
      initial={reduceMotion ? false : { opacity: 0, y: -18 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="nav-utility nav-announcement">
        <div className="nav-announcement-inner">
          <div className="topbar-update"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 11v3a2 2 0 0 0 2 2h2l9 4V5L8 9H6a2 2 0 0 0-2 2Z"/><path d="m8 16 1.5 5H13l-2-4M20 8v9"/></svg><strong>Important</strong><span>Stay updated with the latest tax compliance and business regulations.</span></div>
          <div className="topbar-info"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6Z"/><path d="m9 12 2 2 4-5"/></svg><span>Trusted by <b>5000+</b><br/>Businesses</span></div>
          <div className="topbar-info"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h4v6H6a2 2 0 0 1-2-2zM20 14h-4v6h2a2 2 0 0 0 2-2z"/></svg><span>Need Help?<br/><a href="tel:+916299484291">+91 62994 84291</a></span></div>
          <div className="topbar-info"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg><span>{siteContact.officeHours.replace('|','')} </span></div>
          <div className="topbar-social"><span>Follow Us:</span><a aria-label="Facebook" href={siteSocials.facebook} target="_blank" rel="noreferrer">f</a><a aria-label="Instagram" href={siteSocials.instagram} target="_blank" rel="noreferrer"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17" cy="7" r=".7" fill="currentColor" stroke="none"/></svg></a><a aria-label="YouTube" href={siteSocials.youtube} target="_blank" rel="noreferrer"><svg viewBox="0 0 24 24"><path d="M21 8s-.2-2-2-2.4C17.7 5.2 12 5.2 12 5.2s-5.7 0-7 .4C3.2 6 3 8 3 8a33 33 0 0 0 0 8s.2 2 2 2.4c1.3.4 7 .4 7 .4s5.7 0 7-.4c1.8-.4 2-2.4 2-2.4a33 33 0 0 0 0-8Z"/><path d="m10 9 5 3-5 3Z"/></svg></a></div>
        </div>
      </div>
      <nav className="navbar" ref={navRef}>
        <Link className="brand" onClick={closeMenu} to="/">
          <img
            src={logoImg}
            alt="PK Business Solution logo"
            className="brand-logo"
          />
        </Link>

        <button
          aria-controls="site-navigation"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className={`menu-toggle ${isMenuOpen ? 'is-active' : ''}`}
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
        >
          <span aria-hidden="true" className="menu-toggle-icon">
            <span />
            <span />
            <span />
          </span>
          <span className="menu-toggle-text">{isMenuOpen ? 'Close' : 'Menu'}</span>
        </button>

        <div className="mobile-nav-actions" aria-label="Quick actions">
          <Link
            aria-label={user ? 'Open notifications' : 'Log in to view notifications'}
            className="mobile-nav-notification"
            onClick={closeMenu}
            to={user ? '/dashboard/notifications' : '/login'}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            <span aria-hidden="true" className="mobile-nav-notification-dot" />
          </Link>

          {user ? (
            <Link aria-label="Open profile" className="mobile-nav-profile" onClick={closeMenu} to="/dashboard/profile">
              <UserAvatar alt={`${user.name || 'User'} profile`} user={user} />
            </Link>
          ) : (
            <Link aria-label="Log in" className="mobile-nav-login" onClick={closeMenu} to="/login">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="7.2" r="3.8" />
                <path d="M4.2 21v-1.8a6.3 6.3 0 0 1 6.3-6.3h3a6.3 6.3 0 0 1 6.3 6.3V21" />
              </svg>
              <span>Login</span>
            </Link>
          )}
        </div>

        <div className={`nav-links ${isMenuOpen ? 'is-open' : ''}`} id="site-navigation">
          <div className="nav-group">
            {publicNavLinks.map((link, index) => (
              <MotionNavLink
                animate={{ opacity: 1, y: 0 }}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                end={link.to === '/'}
                initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                key={link.to}
                onClick={closeMenu}
                to={link.to}
                transition={{ delay: 0.06 + index * 0.045, duration: 0.3 }}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                <span>{link.label}</span>
              </MotionNavLink>
            ))}
          </div>

          <div className="nav-actions">
            <Link className="button button-login" onClick={closeMenu} to="/login">
              <svg aria-hidden="true" className="login-icon" focusable="false" viewBox="0 0 24 24">
                <circle cx="12" cy="7.2" r="3.8" />
                <path d="M4.2 21v-1.8a6.3 6.3 0 0 1 6.3-6.3h3a6.3 6.3 0 0 1 6.3 6.3V21" />
              </svg>
              <span>Login</span>
            </Link>
          </div>
        </div>
      </nav>
      <button
        aria-label="Close navigation menu"
        className={`navbar-backdrop ${isMenuOpen ? 'is-visible' : ''}`}
        onClick={closeMenu}
        tabIndex={isMenuOpen ? 0 : -1}
        type="button"
      />
    </motion.header>
  )
}

export default Navbar
