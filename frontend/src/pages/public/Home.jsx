import { Link, useNavigate } from 'react-router-dom'
import homeHeroAdvisor from '../../assets/home-hero-advisor-transparent.png'
import whatsappCtaIcon from '../../assets/whatsapp-cta-icon.png'
import whyChooseTeam from '../../assets/why-choose-team.png'


export const homeServices = [
  { icon: 'fileCheck', tone: 'blue', title: 'GST Services', copy: 'Registration, monthly returns, notice handling, LUT, refunds and audits — fully managed.', tags: ['Registration', 'GSTR-1/3B', 'Notices'], to: '/services?category=gst', price: '2,500', flowId: 'gst-registration-return', documentType: 'GST Registration & Return' },
  { icon: 'calculator', tone: 'green', title: 'Income Tax Services', copy: 'ITR filing for individuals and businesses, tax planning, TDS and notice resolution.', tags: ['ITR Filing', 'Tax Planning', 'TDS'], to: '/services?category=income-tax', price: '1,500', flowId: 'income-tax-filing', documentType: 'Income Tax Filing' },
  { icon: 'book', tone: 'purple', title: 'Accounting Services', copy: 'Bookkeeping, payroll, MIS reporting and Virtual CFO support for growing businesses.', tags: ['Bookkeeping', 'Payroll', 'MIS'], to: '/services?category=accounting', price: '3,500', flowId: 'accounting-bookkeeping', documentType: 'Accounting / Bookkeeping' },
  { icon: 'building', tone: 'amber', title: 'Business Registration', copy: 'Company, LLP, Partnership, MSME, Trade License, DSC and IEC — start right, stay compliant.', tags: ['Pvt Ltd / LLP', 'MSME', 'IEC / DSC'], to: '/services?category=registration', price: '5,000', flowId: 'company-registration-food-license', documentType: 'Company Registration' },
  { icon: 'megaphone', tone: 'rose', title: 'Digital Marketing', copy: 'SEO, Google Ads, Meta Ads, content and AI video — performance marketing that converts.', tags: ['SEO', 'Google Ads', 'Meta Ads'], to: '/marketing' },
  { icon: 'sparkle', tone: 'royal', title: 'Influencer Marketing', copy: 'Browse verified influencers and launch campaigns across Instagram and YouTube.', tags: ['Instagram', 'YouTube', 'Celebrity'], to: '/influencers' },
  { icon: 'globe', tone: 'cyan', title: 'Website Development', copy: 'Business websites, e-commerce stores and landing pages built for speed and SEO.', tags: ['Business Sites', 'E-commerce', 'Landing Pages'], to: '/web-apps' },
  { icon: 'phone', tone: 'orange', title: 'App Development', copy: 'Android and iOS apps, CRM and custom IT solutions tailored to your operations.', tags: ['Android / iOS', 'CRM', 'Custom IT'], to: '/web-apps' },
]

const homeTestimonials = [
  { quote: 'PK handles our GST, TDS and books end-to-end. There are zero missed deadlines and zero penalties.', name: 'Rajesh Agarwal', company: 'Director, Agarwal Textiles' },
  { quote: 'Their influencer campaign gave us 5× ROAS in the first month. The marketplace made booking effortless.', name: 'Sunita Menon', company: 'Founder, GlowLeaf Skincare' },
  { quote: 'From trade license to Instagram ads — one team did it all. Our weekend footfall has tripled.', name: 'Amit Chauhan', company: 'Cafe Owner, Delhi' },
  { quote: 'IEC, LUT and GST refunds were handled professionally. A ₹6.2L refund came through without follow-ups.', name: 'Farhan Qureshi', company: 'Director, Qureshi Exports' },
  { quote: 'ITR, clinic accounting and Google Ads under one roof. I finally stopped juggling three vendors.', name: 'Dr. Nidhi Kapoor', company: 'Dental Clinic, Gurugram' },
  { quote: 'They built our CRM and website, then scaled our lead generation from 40 to 300 leads a month.', name: 'Vivek Sinha', company: 'CEO, LegiTrack' },
]

const homeFaqs = [
  { question: 'What documents do I need for GST registration?', answer: 'Typically you need PAN and Aadhaar of the proprietor or directors, a photograph, business address proof, bank proof, and entity documents where applicable. Our team provides a precise checklist for your business type.' },
  { question: 'How long does company registration take?', answer: 'Most registrations are completed in 7–15 working days after all documents and approvals are available. Government processing times can vary, and we keep you updated at every stage.' },
  { question: 'Do you handle GST and Income Tax notices?', answer: 'Yes. We review the notice, explain the issue in plain language, prepare the required response and supporting documents, and assist with submission and follow-up.' },
  { question: 'What is included in your digital marketing packages?', answer: 'Packages can include strategy, SEO, Google Ads, Meta Ads, social media management, content creation, reporting, and conversion optimization based on your goals and budget.' },
  { question: 'How does influencer booking work?', answer: 'Share your campaign goal, audience, platform, location and budget. We shortlist suitable creators, coordinate commercials and deliverables, and help track campaign execution.' },
  { question: 'What are your charges for ITR filing?', answer: 'Pricing depends on income sources, filing complexity and the documents involved. Contact us for a transparent quote before any work begins—there are no hidden charges.' },
  { question: 'Do you provide services outside Delhi?', answer: 'Yes. We serve clients across India through secure digital document collection, online consultations, progress updates and remote support.' },
  { question: 'How do I get started?', answer: 'Use the consultation button or WhatsApp us with your requirement. Our team will understand your needs, recommend the right service and share the next steps.' },
]

export const Icon = ({ name }) => {
  const paths = {
    tax: <><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5M10 12h6M10 16h3"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    taxFile: <><path d="M6 2.5h8l4 4V21H6z"/><path d="M14 2.5V7h4M9 11h6M9 14h6M9 17h4"/></>,
    gst: <><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5M10 12h6M10 16h6"/><path d="M4 7v13h3"/></>,
    audit: <><path d="M5 4h12v15H5z"/><path d="M9 8h4M9 12h3"/><circle cx="17" cy="17" r="4"/><path d="m20 20 2 2"/></>,
    users: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M15 15c4 0 6 2 6 5"/></>,
    shield: <><path d="M12 3 4 6v5c0 5 3 8 8 10 5-2 8-5 8-10V6z"/><path d="m8 12 3 3 5-6"/></>,
    award: <><circle cx="12" cy="9" r="6"/><path d="m8 14-2 7 6-3 6 3-2-7"/><path d="m12 6 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L9 8.3 11 8z"/></>,
    headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h4v6H6a2 2 0 0 1-2-2zM20 14h-4v6h2a2 2 0 0 0 2-2z"/></>,
    bolt: <path d="m13 2-8 12h6l-1 8 9-13h-6z"/>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9z"/></>,
    calculator: <><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h.1M8 14h2M12 14h2M16 14h.1M8 18h2M12 18h4"/></>,
    book: <><path d="M4 5c4-2 7 0 8 2v14c-1-2-4-4-8-2zM20 5c-4-2-7 0-8 2v14c1-2 4-4 8-2z"/></>,
    building: <><path d="M4 21h16M6 21V8h8v13M14 12h4v9M9 11h2M9 14h2M9 17h2"/></>,
    megaphone: <><path d="m3 11 14-6v14L3 13zM17 9c3 1 3 5 0 6M6 14l2 6h4l-2-7"/></>,
    sparkle: <><path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8zM5 3l.7 1.8L8 5.5l-2.3.7L5 8l-.7-1.8L2 5.5l2.3-.7z"/></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4M11 18h2"/></>,
    phoneCall: <path d="M7 3.8 4.7 5.1c-.8.5-1.1 1.5-.8 2.4 1.7 5.2 5.8 9.3 11 11 .9.3 1.9 0 2.4-.8l1.3-2.3-3.7-2.1-1.3 1.3c-2.1-1.1-3.8-2.8-4.9-4.9l1.3-1.3z"/>,
    code: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    returnArrow: <><path d="m9 7-5 5 5 5"/><path d="M4 12h9a5 5 0 0 1 0 10h-2"/></>,
    arrowRight: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    send: <><path d="m21 3-7.5 18-3.7-7.8L3 9.5z"/><path d="m9.8 13.2 4-3.8"/></>,
    camera: <><path d="M4 7h4l1.5-2h5L16 7h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 4l3 3M14 6l3 3"/></>,
    logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="M14 8l4 4-4 4M18 12H8"/></>,
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/></>,
    more: <><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>,
    truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    searchCheck: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 10.5l1.7 1.7 3.5-4"/></>,
    barChart: <><path d="M4 20V9M9 20V4M14 20v-7M19 20V7"/><path d="M2 20h20"/></>,
    growthChart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M18.5 15a7 7 0 1 1-1-8.5L20 9"/></>,
    chevronDown: <path d="m7 10 5 5 5-5"/>,
    fileCheck: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 13l2 2 4-5"/></>,
    download: <><path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19.5h16"/></>,
    upload: <><path d="M12 21V8"/><path d="m7.5 12.5 4.5-4.5 4.5 4.5"/><path d="M4 17v2.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V17"/></>,
    closeCircle: <><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></>,
    documentStack: <><path d="M7 2.5h8l4 4V21H7z"/><path d="M15 2.5V7h4M10 11h6M10 15h6"/><path d="M4 6v15h3"/></>,
    layers: <><path d="m12 3-9 5 9 5 9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="m9 16 2 2 4-5"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1"/><path d="M12 16v2"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></>,
    eyeOff: <><path d="m3 3 18 18"/><path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.9M6.5 6.5C4 8.2 2.5 12 2.5 12s3.5 6 9.5 6c1 0 2-.2 2.8-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/><path d="M5.6 4.8 4 3.2M18.4 4.8 20 3.2"/></>,
    advisor: <><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/><path d="m16.5 11.5 1.2 1.2 2.8-3"/></>,
    profile: <><circle cx="12" cy="7.5" r="3.7"/><path d="M5 21v-1.8a7 7 0 0 1 14 0V21"/></>,
    wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h11"/><path d="M15 11h7v5h-7a2.5 2.5 0 0 1 0-5z"/><circle cx="16" cy="13.5" r=".5"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/></>,
    profileLock: <><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20v-1.2a6.5 6.5 0 0 1 11-4.5"/><rect x="14" y="14" width="7" height="6" rx="1.2"/><path d="M15.7 14v-1a1.8 1.8 0 0 1 3.6 0v1M17.5 16.6v1.1"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/></>,
    youtube: <><path d="M21 12c0 3.5-.4 5.6-1.2 6.3S16.8 19.5 12 19.5s-7-.4-7.8-1.2S3 15.5 3 12s.4-5.6 1.2-6.3S7.2 4.5 12 4.5s7 .4 7.8 1.2S21 8.5 21 12Z"/><path d="m10 9 5 3-5 3z"/></>,
    mapPin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    fashion: <><path d="m8 4 4 3 4-3 4 4-3 3v10H7V11L4 8z"/><path d="M12 7v14"/></>,
    utensils: <><path d="M6 3v7M3 3v5a3 3 0 0 0 6 0V3M6 11v10M16 3v18M16 3c4 2 5 7 0 10"/></>,
    dumbbell: <><path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/></>,
    gamepad: <><path d="M7 7h10c3 0 5 3 4 7l-1 4c-.5 2-3 2-4 0l-1-2H9l-1 2c-1 2-3.5 2-4 0l-1-4c-1-4 1-7 4-7Z"/><path d="M7 10v4M5 12h4M16.5 11h.1M18.5 13h.1"/></>,
    verified: <><path d="m12 2 2.1 2 2.9-.4.9 2.8 2.6 1.3-.8 2.8 1.3 2.6-2.3 1.8-.4 2.9-2.9.4-2 2.1-2.6-1.3-2.8.8-1.3-2.6-2.8-.9.4-2.9-2-2.1 2-2.1-.4-2.9 2.8-.9 1.3-2.6 2.8.8Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    cart: <><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.4 11.3a2 2 0 0 0 2 1.7h8.8a2 2 0 0 0 1.9-1.5L22 8H6"/></>,
    rocket: <><path d="M14 5c2.8-2.8 6-2 6-2s.8 3.2-2 6l-5 5-4-4z"/><path d="m9 10-4 1-2 3 6 1M13 14l-1 4-3 2-1-6"/><circle cx="15.5" cy="7.5" r="1.5"/><path d="M5 18c-2 1-2 3-2 3s2 0 3-2"/></>,
    speedometer: <><path d="M4.9 19a9 9 0 1 1 14.2 0"/><path d="M12 12 17 8M5 15h2M17 15h2M8 9l-1-1M12 7V5"/><circle cx="12" cy="12" r="1.5"/></>,
    seo: <><rect x="3" y="4" width="18" height="15" rx="2"/><path d="M3 8h18M8 22h8M12 19v3"/><path d="M7 13h3M14 11v4M17 12v3"/></>,
    network: <><circle cx="12" cy="5" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><circle cx="12" cy="13" r="2"/><path d="m12 7v4M10.5 14.5 6.5 16M13.5 14.5l4 1.5"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>,
    star: <path d="m12 2.5 3 6.1 6.7 1-4.9 4.7 1.2 6.7-6-3.2L6 21l1.2-6.7-4.9-4.7 6.7-1z"/>,
    thumbsUp: <><path d="M7 10v11H3V10zM7 19c3 2 8 2 11 1a2 2 0 0 0 1.5-1.5l1.4-6A2 2 0 0 0 19 10h-4l.7-4.2A3.3 3.3 0 0 0 12.5 2L7 10"/></>,
    pieChart: <><path d="M11 3a9 9 0 1 0 9 9h-9z"/><path d="M14 3.5A8 8 0 0 1 20.5 10H14z"/></>,
    smile: <><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></>,
  }
  // Keep a meaningful icon visible when a service is added with an unknown icon key.
  return <svg aria-hidden="true" className="pk-icon" viewBox="0 0 24 24">{paths[name] || paths.fileCheck}</svg>
}

function Home() {
  const navigate = useNavigate()
  const stats = [
    ['users', '2,500+', 'Happy Clients'],
    ['bolt', 'Same-Day', 'Response'],
    ['shield', 'PAN-India', 'Service'],
    ['headset', 'Expert', 'Support 24/7'],
  ]

  return (
    <div className="pk-home">
      <section className="pk-hero container">
        <div className="pk-hero-copy">
          <span className="pk-kicker">Compliance • Accounting • Digital Growth</span>
          <h1>Your Trusted Partner for<br/>Business Compliance,<br/>Accounting &amp; <em>Digital<br/>Growth</em></h1>
          <p>GST, Income Tax, Accounting, Digital Marketing, Website Development &amp; Influencer Marketing — All Under One Roof.</p>
          <div className="pk-hero-actions">
            <Link className="pk-btn pk-btn-gold" to="/contact">Get Free Consultation <span>→</span></Link>
            <a className="pk-btn pk-btn-outline pk-whatsapp-cta" href="https://wa.me/916299484291?text=Hi%20PK%20Business%20Solution%2C%20I%20need%20a%20consultation." target="_blank" rel="noreferrer"><img src={whatsappCtaIcon} alt="" aria-hidden="true"/> <span>WhatsApp Now</span></a>
          </div>
          <div className="pk-stats">
            {stats.map(([icon, value, label]) => (
              <div className="pk-stat" key={label}><Icon name={icon}/><strong>{value}</strong><span>{label}</span></div>
            ))}
          </div>
        </div>

        <div className="pk-hero-visual">
          <div className="pk-hero-pattern" aria-hidden="true" />
          <div className="pk-growth-bars" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
          <div className="pk-growth-arrow" aria-hidden="true">↗</div>
          <img src={homeHeroAdvisor} alt="PK Business Solution professional advisor holding a services board"/>
        </div>
      </section>

      <section className="pk-section pk-services-showcase container">
        <div className="pk-section-title">
          <span>Our Services</span>
          <h2>Everything your business needs, in one place</h2>
          <p>From your first registration to daily compliance and aggressive digital growth —<br/>one expert team owns it all.</p>
        </div>
        <div className="pk-service-grid pk-service-grid-eight">
          {homeServices.map((service) => (
            <article
              className={`pk-service-card pk-service-card-${service.tone}`}
              key={service.title}
              onClick={() => navigate(service.to)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(service.to)
                }
              }}
              role="button"
              tabIndex="0"
            >
              <div className="pk-service-icon"><Icon name={service.icon}/></div>
              <div className="pk-service-watermark"><Icon name={service.icon}/></div>
              <h3>{service.title}</h3>
              <p>{service.copy}</p>
              <div className="pk-service-tags">{service.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <Link onClick={(event) => event.stopPropagation()} to={service.to}>Explore <span>→</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="pk-why-choose container">
        <div className="pk-why-copy">
          <span className="pk-why-eyebrow">Why Choose Us</span>
          <h2>One partner.<br/><em>Zero</em> vendor chaos.</h2>
          <p>Most businesses juggle a CA, an accountant, a marketing agency and a developer. We replace all four with one accountable team.</p>
          <div className="pk-why-grid">
            <article><i><Icon name="users"/></i><div><h3>Expert Team</h3><p>CAs, tax consultants and certified marketers under one roof.</p></div></article>
            <article><i><Icon name="wallet"/></i><div><h3>Affordable Pricing</h3><p>Transparent, MSME-friendly packages with no hidden charges.</p></div></article>
            <article><i><Icon name="bolt"/></i><div><h3>Fast Service</h3><p>Same-day responses and deadline-first filing discipline.</p></div></article>
            <article><i><Icon name="headset"/></i><div><h3>Dedicated Support</h3><p>A single relationship manager for all your services.</p></div></article>
            <article><i><Icon name="shield"/></i><div><h3>Trusted by Businesses</h3><p>2,500+ clients across retail, D2C, services and manufacturing.</p></div></article>
            <article><i><Icon name="layers"/></i><div><h3>End-to-End Solutions</h3><p>From registration to returns to revenue growth — one partner.</p></div></article>
          </div>
        </div>
        <div className="pk-why-media">
          <img src={whyChooseTeam} alt="Business professionals reviewing a plan together"/>
          <div className="pk-experience-badge"><i>★</i><div><strong>10+ Years</strong><span>Combined expertise</span></div></div>
        </div>
      </section>

      <section className="pk-consult container">
        <div className="pk-consult-top">
          <div className="pk-consult-emblem"><Icon name="calendar"/></div>
          <div className="pk-consult-copy">
            <span>Need expert guidance?</span>
            <h2>Book a consultation and get a practical action plan for your next <em>compliance</em> step.</h2>
            <p>Talk to our experts and get clear solutions tailored to your business needs.</p>
          </div>
          <div className="pk-consult-action">
            <Link className="pk-btn pk-btn-gold" to="/contact"><Icon name="calendar"/> Book Consultation <b>→</b></Link>
            <p>Get expert guidance. Take the right step.</p>
          </div>
        </div>
        <div className="pk-consult-benefits">
          <div><i><Icon name="shield"/></i><span><strong>Expert Advice</strong><small>from industry pros</small></span></div>
          <div><i><Icon name="clock"/></i><span><strong>Quick &amp; Easy</strong><small>Hassle-free process</small></span></div>
          <div><i><Icon name="lock"/></i><span><strong>Confidential</strong><small>100% Secure</small></span></div>
        </div>
      </section>

      <section className="pk-section pk-testimonials container">
        <div className="pk-section-title"><span>Testimonials</span><h2>Trusted by businesses like yours</h2></div>
        <div className="pk-testimonial-grid pk-testimonial-grid-six">
          {homeTestimonials.map((testimonial) => (
            <article key={testimonial.name}>
              <div className="pk-quote" aria-hidden="true">”</div>
              <p>“{testimonial.quote}”</p>
              <div className="pk-testimonial-footer">
                <div className="pk-client"><div><strong>{testimonial.name}</strong><small>{testimonial.company}</small></div></div>
                <div className="pk-stars" aria-label="5 out of 5 stars">★★★★★</div>
              </div>
            </article>
          ))}
        </div>
        <div className="pk-google-rating"><span aria-hidden="true">★★★★★</span><strong>4.9 / 5</strong><small>based on 480+ Google Reviews</small></div>
      </section>

      <section className="pk-faq-section">
        <div className="container">
          <div className="pk-section-title"><span>FAQ</span><h2>Questions, answered</h2></div>
          <div className="pk-faq-list">
            {homeFaqs.map((faq) => (
              <details key={faq.question}>
                <summary><span>{faq.question}</span><i><Icon name="chevronDown"/></i></summary>
                <div className="pk-faq-answer"><p>{faq.answer}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pk-trust-strip"><div className="container">
        <span><i><Icon name="lock"/></i><b>Secure &amp; Confidential</b><small>Your data is protected</small></span>
        <span><i><Icon name="clock"/></i><b>Timely Delivery</b><small>On-time, every time</small></span>
        <span><i><Icon name="advisor"/></i><b>Expert Advisors</b><small>Experienced professionals</small></span>
        <span><i><Icon name="wallet"/></i><b>Affordable Pricing</b><small>Transparent &amp; fair</small></span>
      </div></section>
    </div>
  )
}

export default Home
