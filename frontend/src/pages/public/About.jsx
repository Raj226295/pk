import { useState } from 'react'
import { Link } from 'react-router-dom'
import aboutFounder from '../../assets/about-founder.jpg'
import aboutBrandPoster from '../../assets/about-brand-poster.jpg'
import { Icon } from './Home.jsx'
import { useServiceRequest } from '../../context/ServiceRequestContext.jsx'
import { aboutServicesOverview, aboutStats, siteBrand, testimonials } from '../../data/siteData.js'

const serviceIcons = ['fileCheck', 'growthChart', 'building', 'shield', 'pieChart', 'headset']
const serviceItems = [...aboutServicesOverview, { title:'Other Business Services', description:'Payroll, bookkeeping, DSC, IEC, MSME, professional licences and more.' }]
const statIcons = ['users', 'briefcase', 'star', 'thumbsUp']
const numberIcons = ['users', 'fileCheck', 'star', 'smile']
const trustPoints = [['shield','Trusted Support'],['advisor','Expert Advisors'],['clock','On-Time Delivery']]
const commitments = [
  'Clear guidance for filings, registrations and compliance.',
  'Strong communication with timely updates and documents.',
  'Practical solutions tailored to your business needs.',
  'Confidentiality, accuracy and transparency at every step.',
]

function SectionHeading({ eyebrow, children }) {
  return <header className="about-heading"><span>{eyebrow}</span><h2>{children}</h2></header>
}

function About() {
  const { requestService } = useServiceRequest()
  const [testimonialStart,setTestimonialStart] = useState(0)
  const featuredTestimonials = testimonials.slice(0,3)
  const visibleTestimonials = featuredTestimonials.map((_,index)=>featuredTestimonials[(testimonialStart+index)%featuredTestimonials.length])
  const rotateTestimonials = (direction) => setTestimonialStart((current)=>(current+direction+featuredTestimonials.length)%featuredTestimonials.length)

  return <div className="about-premium-page">
    <section className="about-premium-hero container">
      <div className="about-premium-copy"><span className="about-kicker">About Us</span><h1>Professional tax,<br/>compliance, and<br/>financial guidance<br/><em>built on clarity and trust.</em></h1><p>{siteBrand.name} provides expert taxation, compliance, audit and financial advisory services for individuals, startups and businesses.</p><i aria-hidden="true"/><div className="about-trust-points">{trustPoints.map(([icon,label])=><div key={label}><Icon name={icon}/><strong>{label}</strong></div>)}</div></div>
      <div className="about-founder-showcase"><div className="about-founder-photo"><img src={aboutFounder} alt={`${siteBrand.name} founder`}/></div><article><i><Icon name="building"/></i><div><strong>Founder, PK Business Solution</strong><p>Our mission is simple — help clients stay compliant, grow financially and make confident business decisions.</p></div></article></div>
    </section>

    <section className="about-dark-stats container">{aboutStats.map((item,index)=><article key={item.label}><Icon name={statIcons[index]}/><div><strong>{item.value}</strong><span>{item.label.replace('ITR ','').replace(' focus','')}</span></div></article>)}</section>

    <section className="about-services container"><SectionHeading eyebrow="What We Do">Focused support across essential<br/><em>tax and business</em> requirements.</SectionHeading><div>{serviceItems.map((service,index)=><article key={service.title} onClick={()=>requestService({title:service.title,description:service.description,icon:serviceIcons[index]})} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();requestService({title:service.title,description:service.description,icon:serviceIcons[index]})}}} role="button" tabIndex="0"><i><Icon name={serviceIcons[index]}/></i><section><h3>{service.title}</h3><p>{service.description}</p><b aria-hidden="true">→</b></section></article>)}</div></section>

    <section className="about-numbers container"><SectionHeading eyebrow="Our Experience">Numbers that reflect <em>consistency,<br/>client confidence,</em> and service depth.</SectionHeading><div>{aboutStats.map((item,index)=><article key={item.label}><i><Icon name={numberIcons[index]}/></i><strong>{item.value}</strong><span>{item.label.replace('ITR ','').replace(' focus','')}</span></article>)}</div></section>

    <section className="about-commitment container"><div><span className="about-kicker">Our Commitment</span><h2>Professional support that’s reliable, organized, and dependable.</h2><ul>{commitments.map((item)=><li key={item}><span>✓</span>{item}</li>)}</ul></div><div className="about-commitment-photo"><img src={aboutBrandPoster} alt={`${siteBrand.name} services presentation`}/></div></section>

    <section className="about-testimonials container"><SectionHeading eyebrow="Client Testimonials">Positive feedback from clients who value<br/>clarity, responsiveness, and results.</SectionHeading><div className="about-testimonial-slider"><button aria-label="Previous testimonials" onClick={()=>rotateTestimonials(-1)} type="button">‹</button><div>{visibleTestimonials.map((item)=><article key={item.name}><b>“</b><p>{item.quote}</p><i/><strong>{item.name}</strong><span>{item.company}</span><small aria-label="5 out of 5 stars">★★★★★</small></article>)}</div><button aria-label="Next testimonials" onClick={()=>rotateTestimonials(1)} type="button">›</button></div><nav aria-label="Testimonial pages">{featuredTestimonials.map((item,index)=><button aria-label={`Show testimonial set ${index+1}`} className={testimonialStart===index?'active':''} key={item.name} onClick={()=>setTestimonialStart(index)} type="button"/>)}</nav></section>

    <section className="about-final-cta container"><i><Icon name="phone"/></i><div><span>Let’s work together</span><h2>Contact us for a free consultation and let’s<br/>make your next financial step simple and organized.</h2></div><aside><Link to="/contact">Free Consultation <b>›</b></Link><Link to="/services">View Services <b>›</b></Link></aside></section>
  </div>
}

export default About
