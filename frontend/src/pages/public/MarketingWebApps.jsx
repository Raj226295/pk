import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from './Home.jsx'
import api from '../../lib/api.js'
import { resolveUploadUrl } from '../../lib/uploads.js'
import webGrowthDashboard from '../../assets/web-growth-dashboard.png'
import instagramPlatformIcon from '../../assets/instagram-platform.png'
import youtubePlatformIcon from '../../assets/youtube-platform.png'
import { useServiceRequest } from '../../context/ServiceRequestContext.jsx'
import Loader from '../../components/common/Loader.jsx'

const marketingOfferings = [
  {
    number: '01',
    title: 'Performance Marketing',
    copy: 'Performance-focused campaigns, social media strategy, content planning, and measurable growth support.',
  },
  {
    number: '02',
    title: 'Social Media & Content',
    copy: 'Platform-specific content, creative planning, and consistent social media management for stronger engagement.',
  },
  {
    number: '03',
    title: 'Brand & Influencer Growth',
    copy: 'Brand positioning, creative campaigns, and influencer collaborations that connect with the right audience.',
  },
]

const webAppOfferings = [
  {
    number: '01',
    title: 'Business Websites',
    copy: 'Fast, responsive, conversion-focused websites designed to present your business professionally.',
  },
  {
    number: '02',
    title: 'Custom Web Apps',
    copy: 'Practical web applications and internal tools designed around your operations and customer journey.',
  },
  {
    number: '03',
    title: 'Mobile Applications',
    copy: 'User-friendly mobile app experiences with scalable architecture and reliable ongoing support.',
  },
]

const platformIcon = (platform) => platform === 'Instagram' ? instagramPlatformIcon : youtubePlatformIcon

export function InfluencerMarketplace({ onBook }) {
  const [query,setQuery] = useState('')
  const [category,setCategory] = useState('All')
  const [platform,setPlatform] = useState('All Platforms')
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  useEffect(() => { let mounted = true; api.get('/api/public/influencers').then(({ data }) => { if (mounted) setCreators((data.influencers || []).map((item, index) => ({ ...item, handle: item.username, category: item.niche, price: Number(item.booking_price || 0).toLocaleString('en-IN'), index }))) }).catch(() => { if (mounted) setLoadFailed(true) }).finally(() => { if (mounted) setLoading(false) }); return () => { mounted = false } }, [])
  const availableCategories = [...new Set(creators.map((creator) => creator.category).filter(Boolean))]
  const visibleCreators = creators.filter((creator) => {
    const matchesQuery = `${creator.name} ${creator.handle} ${creator.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (category === 'All' || creator.category === category) && (platform === 'All Platforms' || creator.platform === platform)
  })
  const bookCreator = (creator) => onBook(creator)

  if (loading) return <Loader fullScreen message="Loading influencers..." />

  return <div className="influencer-marketplace">
    <section className="influencer-filter-panel" aria-label="Influencer filters">
      <label className="influencer-search"><Icon name="search"/><input aria-label="Search influencers" placeholder="Search influencers by name, handle or niche..." value={query} onChange={(event)=>setQuery(event.target.value)}/></label>
      <select aria-label="Filter by platform" value={platform} onChange={(event)=>setPlatform(event.target.value)}><option>All Platforms</option><option>Instagram</option><option>YouTube</option></select>
      <select aria-label="Filter by followers"><option>Any Followers</option><option>Under 500K</option><option>500K – 1M</option><option>1M+</option></select>
      <select aria-label="Filter by engagement"><option>Any Engagement</option><option>3%+</option><option>5%+</option><option>8%+</option></select>
      <div className="influencer-category-pills">{['All', ...availableCategories].map((item)=><button className={category===item?'active':''} key={item} onClick={()=>setCategory(item)} type="button"><Icon name="grid"/>{item}</button>)}</div>
    </section>

    <section className="influencer-results">
      <div className="influencer-results-heading"><h2><Icon name="users"/>{`${visibleCreators.length} Creators match your filters`}</h2></div>
      {visibleCreators.length ? <div className="influencer-card-grid">{visibleCreators.map((creator)=><article className="influencer-card" key={creator.id} onClick={()=>bookCreator(creator)} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();bookCreator(creator)}}} role="button" tabIndex="0">
        <div className="influencer-photo" style={creator.image ? { backgroundImage: `url(${resolveUploadUrl(creator.image)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><span><img alt="" className="influencer-platform-icon" src={platformIcon(creator.platform)} />{creator.category}</span></div>
        <div className="influencer-card-body"><h3>{creator.name}<b title="Verified creator"><Icon name="verified"/></b></h3><p><img alt="" className="influencer-platform-icon" src={platformIcon(creator.platform)} />{creator.handle}</p><div className="influencer-metrics"><div><Icon name="users"/><strong>{creator.followers}</strong><small>Followers</small></div><div><Icon name="growthChart"/><strong>{creator.engagement}</strong><small>Engagement</small></div><div><Icon name="mapPin"/><strong>{creator.location}</strong><small>Location</small></div></div><footer><strong>₹{creator.price}</strong><button onClick={(event)=>{event.stopPropagation();bookCreator(creator)}} type="button">Book Now</button></footer></div>
      </article>)}</div> : <div className="influencer-empty"><Icon name="search"/><h3>{loadFailed ? 'Creators are unavailable right now' : 'No creators found'}</h3><p>{loadFailed ? 'Please try again shortly.' : 'Try another name, niche or platform.'}</p></div>}
    </section>

  </div>
}

function InfluencerPage() {
  const { requestService } = useServiceRequest()
  const bookCreator = (creator) => requestService({
    title: 'Influencer Booking',
    description: `Create your account to continue booking ${creator.name}.`,
    icon: 'users',
    influencerId: creator.id,
    influencerName: creator.name,
  }, 'influencers')

  return <InfluencerMarketplace onBook={bookCreator} />
}

export const webPackages = [
  { icon:'globe', title:'Business Website', price:'14,999', copy:'3–5 pages premium website with modern UI/UX, responsive design and basic SEO.', features:['Modern & Responsive Design','Up to 5 Pages','Basic SEO Setup','1 Contact Form','Delivery in 7 Days'] },
  { icon:'cart', title:'E-Commerce Website', price:'34,999', copy:'Full online store with payments, shipping, coupons and complete order management.', features:['Payment Gateway Integration','Product & Inventory Management','Coupons / Offers','Order Management / COD','Training & Handover'] },
  { icon:'rocket', title:'Landing Page', price:'7,999', copy:'High-converting campaign landing pages built for ad traffic and lead capture.', features:['A/B Optimized','Lead Form / CTA Block','Fast Loading Performance','Fully Responsive','Delivery in 3 Days'] },
  { icon:'phone', title:'App Development', price:'79,999', copy:'Android & iOS apps, CRM and custom solutions tailored to your workflow.', features:['Cross-platform (Android & iOS)','Admin Dashboard','Play Store / App Store Launch','AMC Available','Support & Maintenance'] },
]

export const directServices = [
  ['SEO Services','Technical SEO, local SEO and content clusters that rank and bring organic leads.','searchCheck'],
  ['Google Ads','Search, Shopping, Display and YouTube campaigns managed to a clear ROAS target.','growthChart'],
  ['Facebook & Instagram Ads','Full-funnel Meta campaigns with creative testing, audiences and retargeting.','megaphone'],
  ['Instagram Marketing','Grid strategy, reels calendar and community growth for strong brand recall.','users'],
  ['Content & AI Video Creation','Scripts, professional reels, video editing and AI-generated content at scale.','sparkle'],
  ['Lead Generation','Landing pages, advertisements and conversion pipelines for predictable lead flow.','layers'],
]

function useDirectServiceNodes(rootSlug) {
  const [state, setState] = useState({ services: [], loading: true, failed: false })

  useEffect(() => {
    let current = true
    api.get('/api/public/service-display-tree')
      .then(({ data }) => {
        const root = (data.services || []).find((service) => service.slug === rootSlug)
        if (current) setState({ services: root?.children || [], loading: false, failed: false })
      })
      .catch(() => { if (current) setState({ services: [], loading: false, failed: true }) })
    return () => { current = false }
  }, [rootSlug])

  return state
}

function WebAppsPage() {
  const { requestService } = useServiceRequest()
  const { services: packageNodes, loading, failed } = useDirectServiceNodes('web-apps')
  const packages = packageNodes.map((item) => ({ id: item.id, title: item.name, copy: item.description, price: Number(item.price || 0).toLocaleString('en-IN'), icon: item.metadata?.icon || 'code', features: item.metadata?.features || [] }))
  const growthPoints = [
    ['speedometer','90+ Page Speed Score','Clean code and optimized builds for Google and a better user experience.'],
    ['seo','SEO-Ready Structure','Schema, sitemaps, meta tags and clean URLs out of the box.'],
    ['growthChart','Lead Capture Built-in','Forms, WhatsApp, live chat and CRM hooks wired into every page.'],
    ['network','CRM & IT Solutions','Custom dashboards, automation and integrations for your operations.'],
  ]
  if (loading) return <Loader fullScreen message="Loading web & apps..." />
  return <div className="web-apps-page">
    <section className="web-packages container"><header><span>Packages</span><h1>Transparent pricing, premium delivery</h1><p>Fixed-scope packages with clear timelines.<br/>Custom builds are quoted after a free discovery call.</p></header><div className="web-package-grid">{packages.length ? packages.map((item)=><article className="web-package-card" key={item.id} onClick={()=>requestService({ title:item.title, description:item.copy, icon:item.icon, price:item.price }, 'web-apps')} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();requestService({ title:item.title, description:item.copy, icon:item.icon, price:item.price }, 'web-apps')}}} role="button" tabIndex="0"><i><Icon name={item.icon}/></i><h2>{item.title}</h2><div className="web-package-price"><strong>₹{item.price}</strong><small>onwards</small></div><b aria-hidden="true"/><p>{item.copy}</p><ul>{item.features.map((feature)=><li key={feature}><span>✓</span>{feature}</li>)}</ul><Link onClick={(event)=>{event.preventDefault();requestService({ title:item.title, description:item.copy, icon:item.icon, price:item.price }, 'web-apps')}} to="/contact">Get Started</Link></article>) : <p className="admin-muted-text">{failed ? 'Packages are unavailable right now.' : 'No packages are available yet.'}</p>}</div></section>
    <section className="web-growth-section"><div className="container"><div className="web-growth-media"><img src={webGrowthDashboard} alt="Laptop showing a modern business analytics dashboard"/><span aria-hidden="true"/></div><div className="web-growth-copy"><header><span>Built for Growth</span><h2>Every build ships with marketing in its DNA</h2><p>A beautiful site that can’t be found or doesn’t convert is a cost, not an asset. Our development team works with marketing from day one.</p></header><div>{growthPoints.map(([icon,title,copy])=><article key={title}><i><Icon name={icon}/></i><section><h3>{title}</h3><p>{copy}</p></section></article>)}</div></div></div></section>
  </div>
}

function MarketingPage() {
  const { requestService } = useServiceRequest()
  const { services: marketingNodes, loading, failed } = useDirectServiceNodes('marketing')
  const marketingServices = marketingNodes.map((item) => ({ id: item.id, title: item.name, copy: item.description, icon: item.metadata?.icon || 'megaphone' }))
  const [budget,setBudget] = useState('50000')
  const [cost,setCost] = useState('250')
  const [rate,setRate] = useState('4')
  const leads = (+cost || 0) ? (+budget || 0) / +cost : 0
  const conversions = leads * (+rate || 0) / 100
  if (loading) return <Loader fullScreen message="Loading marketing services..." />
  return <div className="interactive-services-page marketing-interactive-page">
    <header className="services-page-heading"><span>Our Marketing Services</span><h1>Marketing Solutions Built for Growth</h1><p>Strategy, creative execution and performance tracking—all in one place.</p></header>
    <section className="marketing-direct-services">
      <div className="service-detail-grid marketing-direct-grid">{marketingServices.length ? marketingServices.map(({id,title,copy,icon},index)=><article className={`service-detail-card service-detail-card-${index + 1} marketing-direct-card`} key={id} onClick={()=>requestService({title,description:copy,icon}, 'marketing')} onKeyDown={(event)=>(event.key==='Enter'||event.key===' ')&&requestService({title,description:copy,icon}, 'marketing')} role="button" tabIndex="0"><i><Icon name={icon}/></i><div><h3>{title}</h3><p>{copy}</p></div><footer><strong>Learn More</strong><span aria-hidden="true">→</span></footer></article>) : <p className="admin-muted-text">{failed ? 'Services are unavailable right now.' : 'No marketing services are available yet.'}</p>}</div>
    </section>
    <section className="service-free-tool marketing-estimator">
      <header><span><Icon name="calculator"/>Free Tool</span><h2>Marketing <em>Results</em> Estimator</h2><p>Plan an indicative campaign outcome using your budget and conversion assumptions.</p></header>
      <div className="service-tool-box"><div className="service-tool-fields">
        <label><strong>Monthly Budget (₹)</strong><span><Icon name="wallet"/><input type="number" min="0" value={budget} onChange={(e)=>setBudget(e.target.value)}/></span></label>
        <label><strong>Estimated Cost per Lead (₹)</strong><span><Icon name="users"/><input type="number" min="1" value={cost} onChange={(e)=>setCost(e.target.value)}/></span></label>
        <label><strong>Lead Conversion Rate (%)</strong><span><Icon name="growthChart"/><input type="number" min="0" max="100" value={rate} onChange={(e)=>setRate(e.target.value)}/></span></label>
      </div><div className="service-tool-results"><article><i><Icon name="wallet"/></i><div><small>Campaign Budget</small><strong>₹{(+budget||0).toLocaleString('en-IN')}</strong></div></article><article><i><Icon name="users"/></i><div><small>Estimated Leads</small><strong>{Math.round(leads)}</strong></div></article><article className="primary"><i><Icon name="growthChart"/></i><div><small>Estimated Conversions</small><strong>{Math.round(conversions)}</strong></div></article></div><p className="service-tool-note"><Icon name="shield"/> Indicative estimate only. Actual results depend on audience, offer, channel and campaign quality.</p></div>
    </section>
    <section className="service-process-section marketing-process"><header><span>How It Works</span><h2>A simple, <em>transparent</em> process</h2><i/><p>From strategy to reporting, every step stays clear and measurable.</p></header><div className="service-process-grid">
      {[['Share Your Goal','Tell us your audience, offer, objective and campaign budget.','fileCheck'],['Strategy & Creative','We build the channel plan, messaging and campaign creatives.','sparkle'],['Launch & Optimise','Campaigns go live and are continuously improved for performance.','growthChart'],['Reports & Growth','Receive clear results, insights and practical next steps.','barChart']].map(([title,copy,icon],index)=><article key={title}><i><Icon name={icon}/></i><b>{String(index+1).padStart(2,'0')}</b><h3>{title}</h3><span/><p>{copy}</p>{index<3?<strong><Icon name="chevronDown"/></strong>:null}</article>)}
    </div></section>
  </div>
}

function MarketingWebApps({ type = 'marketing' }) {
  const { requestService } = useServiceRequest()
  const isWebApps = type === 'web-apps'
  const isInfluencers = type === 'influencers'
  const offerings = isWebApps ? webAppOfferings : marketingOfferings

  if (type === 'marketing') return <MarketingPage />
  if (type === 'influencers') return <InfluencerPage />
  if (type === 'web-apps') return <WebAppsPage />

  return (
    <div className="page-stack container">
      <section className="page-hero">
        <span className="eyebrow">{isWebApps ? 'Web & Apps' : isInfluencers ? 'Influencers' : 'Marketing'}</span>
        <h1>{isWebApps ? 'Digital products built around your business.' : isInfluencers ? 'Influencer campaigns built for real brand growth.' : 'Marketing systems built for measurable growth.'}</h1>
        <p>
          {isWebApps
            ? 'From responsive websites to custom web and mobile applications, we turn practical ideas into polished digital experiences.'
            : isInfluencers
              ? 'Discover the right creators, manage collaborations and measure campaign performance through one clear process.'
            : 'From customer acquisition to brand visibility, we bring strategy, creative execution, and performance tracking together.'}
        </p>
      </section>

      <section className="pk-service-grid marketing-service-grid">
        {offerings.map((offering) => (
          <article
            className="pk-service-card"
            key={offering.title}
            onClick={() => requestService({ title: offering.title, description: offering.copy, icon: offering.icon })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                requestService({ title: offering.title, description: offering.copy, icon: offering.icon })
              }
            }}
            role="button"
            tabIndex="0"
          >
            <span className="eyebrow">{offering.number}</span>
            <h2>{offering.title}</h2>
            <p>{offering.copy}</p>
            <Link onClick={(event) => requestService({ title: offering.title, description: offering.copy, icon: offering.icon }) && event.preventDefault()} to="/contact">Discuss your project <span>→</span></Link>
          </article>
        ))}
      </section>

      <section className="cta-banner">
        <div>
          <span className="eyebrow">Ready to grow?</span>
          <h2>{isWebApps ? 'Tell us what you want to build or improve.' : isInfluencers ? 'Tell us about your next creator campaign.' : 'Tell us what you want to promote or scale.'}</h2>
        </div>
        <Link className="button button-secondary" to="/contact">Get a Free Consultation</Link>
      </section>
    </div>
  )
}

export default MarketingWebApps
