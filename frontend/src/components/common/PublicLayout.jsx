import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import WhatsAppButton from './WhatsAppButton.jsx'
import GetInTouchModal from './GetInTouchModal.jsx'

function PublicLayout() {
  const location = useLocation()
  const hideFooter = ['/login', '/register'].includes(location.pathname)
  const hasTightFooterSpacing = ['/about', '/contact', '/influencers'].includes(location.pathname)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <div className="site-shell">
      <Navbar />
      <main className={`public-main${hideFooter ? ' public-main-auth' : ''}${hasTightFooterSpacing ? ' public-main-footer-tight' : ''}`}>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      {!hideFooter && <WhatsAppButton />}
      {!hideFooter && <GetInTouchModal />}
    </div>
  )
}

export default PublicLayout
