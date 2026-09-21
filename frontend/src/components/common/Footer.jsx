import { Link } from 'react-router-dom'
import logo from '../../assets/logo.png'
import { siteBrand, siteContact, siteSocials } from '../../data/siteData.js'

const Icon = ({ name }) => {
  const paths = {
    link: <><path d="M10.6 13.4a4.5 4.5 0 0 0 6.4.1l2.5-2.5a4.5 4.5 0 0 0-6.4-6.4l-1.4 1.5"/><path d="M13.4 10.6a4.5 4.5 0 0 0-6.4-.1L4.5 13a4.5 4.5 0 0 0 6.4 6.4l1.4-1.5"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    phone: <path d="M7.1 3.8 9.5 8l-2.2 2a15.5 15.5 0 0 0 6.7 6.7l2-2.2 4.2 2.4-.8 3.1c-.2.7-.9 1.1-1.6 1-7.5-1-13.8-7.3-14.8-14.8-.1-.7.3-1.4 1-1.6Z"/>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></>,
    facebook: <path d="M14 21v-8h2.7l.4-3H14V8.2c0-.9.3-1.5 1.6-1.5h1.7V4a23 23 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3V10H8v3h2.6v8Z" fill="currentColor" stroke="none"/>,
    youtube: <path d="M21 8.2a2.6 2.6 0 0 0-1.8-1.8C17.6 6 12 6 12 6s-5.6 0-7.2.4A2.6 2.6 0 0 0 3 8.2 27 27 0 0 0 2.6 12 27 27 0 0 0 3 15.8a2.6 2.6 0 0 0 1.8 1.8C6.4 18 12 18 12 18s5.6 0 7.2-.4a2.6 2.6 0 0 0 1.8-1.8 27 27 0 0 0 .4-3.8 27 27 0 0 0-.4-3.8ZM10 15V9l5.2 3Z" fill="currentColor" stroke="none"/>,
    shield: <><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6Z"/><path d="m9 12 2 2 4-5"/></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

const quickLinks = [['Services', '/services'], ['Marketing', '/marketing'], ['Web & Apps', '/web-apps'], ['Contact', '/contact'], ['Client Login', '/login'], ['Privacy Policy', '/privacy-policy'], ['Terms of Service', '/terms'], ['Refund Policy', '/refund-policy']]

function Footer() {
  const contactRows = [
    { icon: 'pin', content: <a href={siteContact.mapLink} target="_blank" rel="noreferrer">{siteContact.address}</a> },
    { icon: 'clock', content: <span>{siteContact.officeHours}</span> },
    { icon: 'mail', content: <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a> },
    { icon: 'phone', content: <span><a href="tel:+916299484291">+91 62994 84291</a><a href="tel:+917280873845">+91 72808 73845</a></span> },
  ]
  const socials = [['Instagram', siteSocials.instagram, 'instagram'], ['Facebook', siteSocials.facebook, 'facebook'], ['YouTube', siteSocials.youtube, 'youtube'], ['Email', siteSocials.gmail, 'mail']]

  return (
    <footer className="footer">
      <div className="footer-grid container">
        <div className="footer-brand">
          <img src={logo} alt={`${siteBrand.name} logo`} />
          <h3>Practical tax, compliance,<br />and growth guidance for<br />Indian businesses.</h3>
          <i className="footer-accent" />
          <p>From incorporation to audit readiness, we help founders and families stay compliant and confident.</p>
        </div>
        <div className="footer-column footer-quick">
          <div className="footer-heading"><b><Icon name="link" /></b><h4>Quick Links</h4></div>
          <nav className="footer-links" aria-label="Footer navigation">
            {quickLinks.map(([label, to]) => <Link key={label} to={to}><span>›</span>{label}</Link>)}
          </nav>
        </div>
        <div className="footer-column footer-office">
          <div className="footer-heading"><b><Icon name="pin" /></b><h4>Office</h4></div>
          <div className="footer-contact">
            {contactRows.map((row) => <div className="footer-contact-row" key={row.icon}><i><Icon name={row.icon} /></i>{row.content}</div>)}
          </div>
          <div className="footer-socials" aria-label="Social links">
            {socials.map(([label, href, icon]) => <a key={label} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel={href.startsWith('mailto:') ? undefined : 'noreferrer'} aria-label={label}><Icon name={icon} /></a>)}
          </div>
        </div>
      </div>
      <div className="footer-bottom"><div className="container"><i /><Icon name="shield" /><span>&copy; {new Date().getFullYear()} {siteBrand.name}. All rights reserved.</span><i /></div></div>
    </footer>
  )
}

export default Footer
