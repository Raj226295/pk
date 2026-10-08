import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const revealSelector = [
  '.public-main > * > section',
  '.dashboard-main .page-stack > *',
  '.dashboard-main .dashboard-overview-page > *',
  '.dashboard-main .services-workspace-page > *',
  '.dashboard-main .payments-workspace-page > *',
  '.dashboard-main .appointments-workspace-page > *',
].join(', ')

function ScrollFadeOutUp() {
  const location = useLocation()

  useEffect(() => {
    const elements = [...document.querySelectorAll(revealSelector)]
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion || !('IntersectionObserver' in window)) return undefined

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('scroll-fade-out-up-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12 })

    elements.forEach((element) => {
      const isAlreadyVisible = element.getBoundingClientRect().top < window.innerHeight * 0.9
      if (isAlreadyVisible) {
        element.classList.add('scroll-fade-out-up-visible')
      } else {
        element.classList.add('scroll-fade-out-up')
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [location.pathname])

  return null
}

export default ScrollFadeOutUp
