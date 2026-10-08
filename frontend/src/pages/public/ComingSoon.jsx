import { Link, useParams } from 'react-router-dom'
import comingSoonIllustration from '../../assets/coming-soon-illustration.png'

const labels = { 'tax-service': 'Tax Services', marketing: 'Marketing', influencers: 'Influencer Marketing', 'web-apps': 'Web & Apps' }

export default function ComingSoon() {
  const { service } = useParams()
  const name = labels[service] || 'This service'
  return <div className="coming-soon-page"><section className="coming-soon-hero container"><div className="coming-soon-intro"><h1>Coming <em>Soon</em></h1><h2>{name} is getting something amazing.</h2><p>We’re working behind the scenes to bring you a better experience. Stay tuned for exciting updates.</p></div><div className="coming-soon-scene"><img className="coming-soon-illustration" src={comingSoonIllustration} alt="PK Business Solutions page under development" /></div><div className="coming-soon-actions"><Link className="button button-primary" to="/contact">Talk to our team</Link><Link className="button button-ghost" to="/">Back to home</Link></div></section></div>
}
