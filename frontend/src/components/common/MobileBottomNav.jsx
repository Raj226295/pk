import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Icon } from '../../pages/public/Home.jsx'
import AdminIcon from '../admin/AdminIcon.jsx'
import navHome from '../../assets/nav-home.png'
import navTaxServices from '../../assets/nav-tax-services.png'
import navInfluencer from '../../assets/nav-influencer.png'
import navWebApps from '../../assets/nav-web-apps.png'
import navMarketing from '../../assets/nav-marketing.png'
import navProfile from '../../assets/nav-profile.png'

const navigationIcons = {
  home: navHome,
  taxFile: navTaxServices,
  megaphone: navInfluencer,
  code: navWebApps,
  growthChart: navMarketing,
  profile: navProfile,
}

function MobileBottomNav({ dashboard = false }) {
  const location = useLocation()
  const navigationRef = useRef(null)

  useEffect(() => {
    const navigation = navigationRef.current
    if (!navigation) return undefined

    let frame = 0
    const lockToViewport = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const viewport = window.visualViewport
        const visibleBottomOffset = viewport
          ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
          : 0
        navigation.style.setProperty('position', 'fixed', 'important')
        navigation.style.setProperty('top', 'auto', 'important')
        navigation.style.setProperty('right', '0', 'important')
        navigation.style.setProperty('bottom', `${visibleBottomOffset}px`, 'important')
        navigation.style.setProperty('left', '0', 'important')
        navigation.style.setProperty('width', '100%', 'important')
        navigation.style.setProperty('z-index', '2147483640', 'important')
        navigation.style.setProperty('visibility', 'visible', 'important')
        navigation.style.setProperty('opacity', '1', 'important')
      })
    }

    lockToViewport()
    window.addEventListener('scroll', lockToViewport, { passive: true })
    window.addEventListener('resize', lockToViewport, { passive: true })
    window.addEventListener('orientationchange', lockToViewport)
    window.addEventListener('pageshow', lockToViewport)
    window.visualViewport?.addEventListener('resize', lockToViewport)
    window.visualViewport?.addEventListener('scroll', lockToViewport)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', lockToViewport)
      window.removeEventListener('resize', lockToViewport)
      window.removeEventListener('orientationchange', lockToViewport)
      window.removeEventListener('pageshow', lockToViewport)
      window.visualViewport?.removeEventListener('resize', lockToViewport)
      window.visualViewport?.removeEventListener('scroll', lockToViewport)
    }
  }, [])

  const items = dashboard
    ? [
        { label: 'Overview', to: '/dashboard', icon: 'overview', end: true },
        { label: 'Services', to: '/dashboard/services', icon: 'services' },
        { label: 'Requests', to: '/dashboard/upload-documents', icon: 'document' },
        { label: 'Payments', to: '/dashboard/payments', icon: 'payment' },
        { label: 'Profile', to: '/dashboard/profile', icon: 'profile' },
      ]
    : [
        { label: 'Home', to: '/', icon: 'home', end: true },
        { label: 'Tax Services', to: '/services', icon: 'taxFile' },
        { label: 'Influencer', to: '/influencers', icon: 'megaphone' },
        { label: 'Web & Apps', to: '/web-apps', icon: 'code' },
        { label: 'Marketing', to: '/marketing', icon: 'growthChart' },
        { label: 'Profile', to: '/login', icon: 'profile' },
      ]

  const getItemClass = (item, routerActive) => {
    if (item.category) {
      const selectedCategory = new URLSearchParams(location.search).get('category') || 'tax'
      return location.pathname === '/dashboard/services' && selectedCategory === item.category ? 'active' : ''
    }
    return routerActive ? 'active' : ''
  }

  const navigation = (
    <nav aria-label="Mobile navigation" className={`mobile-bottom-nav${dashboard ? ' dashboard-mobile-bottom-nav' : ''}`} ref={navigationRef}>
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
