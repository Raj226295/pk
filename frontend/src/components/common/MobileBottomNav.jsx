import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Icon } from '../../pages/public/Home.jsx'
import AdminIcon from '../admin/AdminIcon.jsx'
import navHome from '../../assets/nav-home.png'
import navTaxServices from '../../assets/nav-tax-services.png'
import navInfluencer from '../../assets/nav-influencer.png'
import navWebApps from '../../assets/nav-web-apps.png'
import navMarketing from '../../assets/nav-marketing.png'

const navigationIcons = {
  home: navHome,
  taxFile: navTaxServices,
  megaphone: navInfluencer,
  code: navWebApps,
  growthChart: navMarketing,
}

function MobileBottomNav({ dashboard = false }) {
  const location = useLocation()
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    const updateKeyboardState = () => {
      const viewport = window.visualViewport
      const keyboardHeight = viewport
        ? window.innerHeight - viewport.height - viewport.offsetTop
        : 0
      setKeyboardOpen(keyboardHeight > 120)
    }

    const hideForTextEntry = (event) => {
      if (event.target.matches?.('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
        setKeyboardOpen(true)
      }
    }
    const updateAfterFocusOut = () => window.setTimeout(updateKeyboardState, 0)

    updateKeyboardState()
    window.visualViewport?.addEventListener('resize', updateKeyboardState)
    window.visualViewport?.addEventListener('scroll', updateKeyboardState)
    window.addEventListener('focusin', hideForTextEntry)
    window.addEventListener('focusout', updateAfterFocusOut)
    window.addEventListener('orientationchange', updateKeyboardState)

    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardState)
      window.visualViewport?.removeEventListener('scroll', updateKeyboardState)
      window.removeEventListener('focusin', hideForTextEntry)
      window.removeEventListener('focusout', updateAfterFocusOut)
      window.removeEventListener('orientationchange', updateKeyboardState)
    }
  }, [])

  const items = dashboard
    ? [
        { label: 'Overview', to: '/dashboard', icon: 'overview', end: true },
        { label: 'Services', to: '/dashboard/services', icon: 'services' },
        { label: 'Requests', to: '/dashboard/upload-documents', icon: 'document' },
        { label: 'Payments', to: '/dashboard/payments', icon: 'payment' },
      ]
    : [
        { label: 'Home', to: '/', icon: 'home', end: true },
        { label: 'Tax Services', to: '/services', icon: 'taxFile' },
        { label: 'Influencer', to: '/influencers', icon: 'megaphone' },
        { label: 'Web & Apps', to: '/web-apps', icon: 'code' },
        { label: 'Marketing', to: '/marketing', icon: 'growthChart' },
      ]

  const getItemClass = (item, routerActive) => {
    if (item.category) {
      const selectedCategory = new URLSearchParams(location.search).get('category') || 'tax'
      return location.pathname === '/dashboard/services' && selectedCategory === item.category ? 'active' : ''
    }
    return routerActive ? 'active' : ''
  }

  const navigation = (
    <nav aria-label="Mobile navigation" className={`mobile-bottom-nav${dashboard ? ' dashboard-mobile-bottom-nav' : ''}${keyboardOpen ? ' mobile-keyboard-open' : ''}`}>
      {items.map((item) => (
        <NavLink className={({ isActive }) => getItemClass(item, isActive)} end={item.end} key={item.label} to={item.to}>
          {dashboard ? <AdminIcon name={item.icon} size={22} /> : navigationIcons[item.icon]
            ? <img alt="" aria-hidden="true" className="mobile-nav-custom-icon" src={navigationIcons[item.icon]} />
            : <Icon name={item.icon} />}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )

  return createPortal(navigation, document.body)
}

export default MobileBottomNav
