import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import WhatsAppButton from './WhatsAppButton.jsx'
import GetInTouchModal from './GetInTouchModal.jsx'
import PageTransition from './PageTransition.jsx'

function PublicLayout() {
  const location = useLocation()
  const hideFooter = ['/login', '/register'].includes(location.pathname)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <div className="site-shell">
      <Navbar />
      <main className="public-main">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      {!hideFooter && <Footer />}
      {!hideFooter && <WhatsAppButton />}
      {!hideFooter && <GetInTouchModal />}
    </div>
  )
}

export default PublicLayout
