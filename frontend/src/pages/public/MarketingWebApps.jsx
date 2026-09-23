import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Home.jsx'
import influencerPortraits from '../../assets/influencer-portraits-grid.png'
import webGrowthDashboard from '../../assets/web-growth-dashboard.png'
import { useServiceRequest } from '../../context/ServiceRequestContext.jsx'

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

const influencerOfferings = [
  { number: '01', title: 'Influencer Discovery', copy: 'Find relevant and verified creators based on your audience, platform, niche and campaign goals.' },
  { number: '02', title: 'Campaign Management', copy: 'From creator outreach and commercials to briefs and deliverables, we coordinate the complete campaign.' },
  { number: '03', title: 'Performance Tracking', copy: 'Track campaign reach, engagement and conversions with clear reporting and practical insights.' },
]

export const influencers = [
  ['Ananya Sharma','@ananya_style','Fashion & Lifestyle','Instagram','439K','8.3%','Mumbai','25,000'],
  ['Rohan Malhotra','@tech.rohan','Tech & Gadgets','YouTube','326K','3.2%','Bengaluru','45,000'],
  ['Priya Verma','@priya_verma','Finance & Wealth','Instagram','530K','7.4%','Delhi','30,000'],
  ['Arjun Mehta','@arjuntrip','Food & Travel','YouTube','628K','9.3%','Hyderabad','35,000'],
  ['Kedar Anand','@kedarontheroad','Travel','Instagram','2.2M','4.6%','Pune','50,000'],
  ['Sneha Kulkarni','@snehafit','Fitness & Health','Instagram','389K','5.2%','Mumbai','35,000'],
  ['Vikram Singh','@vikramtech','Tech & Gadgets','YouTube','891K','4.4%','Jaipur','22,000'],
  ['Ishita Rao','@ishita_beauty','Fashion & Lifestyle','Instagram','2.3M','6.3%','Delhi NCR','55,000'],
  ['Neha Joshi','@nehajoshi.style','Fashion & Lifestyle','Instagram','431K','3.4%','Ahmedabad','18,000'],
  ['Dev Patel','@dev_gaming','Gaming','YouTube','426K','7.7%','Surat','28,000'],
  ['Tara Shah','@tara_travel','Food & Travel','Instagram','738K','3.3%','Goa','40,000'],
  ['Kabir Khanna','@kabirfinance','Finance & Wealth','YouTube','612K','5.8%','Gurugram','42,000'],
].map(([name,handle,category,platform,followers,engagement,location,price],index)=>({name,handle,category,platform,followers,engagement,location,price,index}))

const influencerCategories = ['All','Fashion & Lifestyle','Tech & Gadgets','Finance & Wealth','Food & Travel','Fitness & Health','Gaming']
const influencerCategoryIcons = {
  All:'grid', 'Fashion & Lifestyle':'fashion', 'Tech & Gadgets':'phone',
  'Finance & Wealth':'wallet', 'Food & Travel':'utensils',
  'Fitness & Health':'dumbbell', Gaming:'gamepad',
}

export function InfluencerMarketplace({ onBook }) {
  const [query,setQuery] = useState('')
  const [category,setCategory] = useState('All')
  const [platform,setPlatform] = useState('All Platforms')
  const visibleCreators = influencers.filter((creator) => {
    const matchesQuery = `${creator.name} ${creator.handle} ${creator.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (category === 'All' || creator.category === category) && (platform === 'All Platforms' || creator.platform === platform)
  })
  const campaignServices = [
    ['megaphone','Brand Promotion','End-to-end influencer campaigns with creative strategy and execution.'],
    ['users','Product Reviews','Authentic reviews that build trust and strengthen purchase intent.'],
    ['verified','Celebrity Promotions','High-impact endorsements that amplify your brand message.'],
    ['mapPin','Local Influencer Drives','Hyperlocal campaigns that improve visibility and sales in your area.'],
  ]

  const bookCreator = (creator) => onBook(creator)

  return <div className="influencer-marketplace">
    <header className="influencer-hero"><span>Creator Marketplace</span><h1>Find the right voice for your brand</h1><p>Discover verified creators, compare real audience metrics and launch campaigns with confidence.</p></header>

    <section className="influencer-filter-panel" aria-label="Influencer filters">
      <label className="influencer-search"><Icon name="search"/><input aria-label="Search influencers" placeholder="Search influencers by name, handle or niche..." value={query} onChange={(event)=>setQuery(event.target.value)}/></label>
      <select aria-label="Filter by platform" value={platform} onChange={(event)=>setPlatform(event.target.value)}><option>All Platforms</option><option>Instagram</option><option>YouTube</option></select>
      <select aria-label="Filter by followers"><option>Any Followers</option><option>Under 500K</option><option>500K – 1M</option><option>1M+</option></select>
      <select aria-label="Filter by engagement"><option>Any Engagement</option><option>3%+</option><option>5%+</option><option>8%+</option></select>
      <div className="influencer-category-pills">{influencerCategories.map((item)=><button className={category===item?'active':''} key={item} onClick={()=>setCategory(item)} type="button"><Icon name={influencerCategoryIcons[item]}/>{item}</button>)}</div>
    </section>

    <section className="influencer-results">
      <div className="influencer-results-heading"><h2><Icon name="users"/>{visibleCreators.length} Creators match your filters</h2><button onClick={()=>{setQuery('');setCategory('All');setPlatform('All Platforms')}} type="button">View All Influencers <span>→</span></button></div>
      {visibleCreators.length ? <div className="influencer-card-grid">{visibleCreators.map((creator)=><article className="influencer-card" key={creator.handle} onClick={()=>bookCreator(creator)} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();bookCreator(creator)}}} role="button" tabIndex="0">
        <div className={`influencer-photo influencer-photo-${creator.index}`} style={{backgroundImage:`url(${influencerPortraits})`}}><span><Icon name={creator.platform==='Instagram'?'instagram':'youtube'}/>{creator.category}</span></div>
        <div className="influencer-card-body"><h3>{creator.name}<b title="Verified creator"><Icon name="verified"/></b></h3><p><Icon name={creator.platform==='Instagram'?'instagram':'youtube'}/>{creator.handle}</p><div className="influencer-metrics"><div><Icon name="users"/><strong>{creator.followers}</strong><small>Followers</small></div><div><Icon name="growthChart"/><strong>{creator.engagement}</strong><small>Engagement</small></div><div><Icon name="mapPin"/><strong>{creator.location}</strong><small>Location</small></div></div><footer><strong>₹{creator.price}</strong><button onClick={(event)=>{event.stopPropagation();bookCreator(creator)}} type="button">Book Now</button></footer></div>
      </article>)}</div> : <div className="influencer-empty"><Icon name="search"/><h3>No creators found</h3><p>Try another name, niche or platform.</p></div>}
    </section>

    <section className="influencer-campaigns"><header><span>Full-Funnel Campaigns</span><h2>More than bookings — complete campaign management</h2><p>From brand promotions to product reviews, we handle everything with a data-driven approach.</p></header><div>{campaignServices.map(([icon,title,copy])=><article key={title}><i><Icon name={icon}/></i><section><h3>{title}</h3><p>{copy}</p></section></article>)}</div></section>
  </div>
}

function InfluencerPage() {
  const navigate = useNavigate()
  const bookCreator = () => navigate('/login')

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

function WebAppsPage() {
  const { requestService } = useServiceRequest()
  const growthPoints = [
    ['speedometer','90+ Page Speed Score','Clean code and optimized builds for Google and a better user experience.'],
    ['seo','SEO-Ready Structure','Schema, sitemaps, meta tags and clean URLs out of the box.'],
    ['growthChart','Lead Capture Built-in','Forms, WhatsApp, live chat and CRM hooks wired into every page.'],
    ['network','CRM & IT Solutions','Custom dashboards, automation and integrations for your operations.'],
  ]
  return <div className="web-apps-page">
    <section className="web-packages container"><header><span>Packages</span><h1>Transparent pricing, premium delivery</h1><p>Fixed-scope packages with clear timelines.<br/>Custom builds are quoted after a free discovery call.</p></header><div className="web-package-grid">{webPackages.map((item)=><article className="web-package-card" key={item.title} onClick={()=>requestService({ title:item.title, description:item.copy, icon:item.icon, price:item.price })} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();requestService({ title:item.title, description:item.copy, icon:item.icon, price:item.price })}}} role="button" tabIndex="0"><i><Icon name={item.icon}/></i><h2>{item.title}</h2><div className="web-package-price"><strong>₹{item.price}</strong><small>onwards</small></div><b aria-hidden="true"/><p>{item.copy}</p><ul>{item.features.map((feature)=><li key={feature}><span>✓</span>{feature}</li>)}</ul><Link onClick={(event)=>requestService({ title:item.title, description:item.copy, icon:item.icon, price:item.price }) && event.preventDefault()} to="/contact">Get Started</Link></article>)}</div></section>
    <section className="web-growth-section"><div className="container"><div className="web-growth-media"><img src={webGrowthDashboard} alt="Laptop showing a modern business analytics dashboard"/><span aria-hidden="true"/></div><div className="web-growth-copy"><header><span>Built for Growth</span><h2>Every build ships with marketing in its DNA</h2><p>A beautiful site that can’t be found or doesn’t convert is a cost, not an asset. Our development team works with marketing from day one.</p></header><div>{growthPoints.map(([icon,title,copy])=><article key={title}><i><Icon name={icon}/></i><section><h3>{title}</h3><p>{copy}</p></section></article>)}</div></div></div></section>
  </div>
}

function MarketingPage() {
  const { requestService } = useServiceRequest()
  const [budget,setBudget] = useState('50000')
  const [cost,setCost] = useState('250')
  const [rate,setRate] = useState('4')
  const leads = (+cost || 0) ? (+budget || 0) / +cost : 0
  const conversions = leads * (+rate || 0) / 100
  return <div className="interactive-services-page marketing-interactive-page">
    <header className="services-page-heading"><span>Our Marketing Services</span><h1>Marketing Solutions Built for Growth</h1><p>Strategy, creative execution and performance tracking—all in one place.</p></header>
    <section className="marketing-direct-services">
      <div className="service-detail-grid marketing-direct-grid">{directServices.map(([title,copy,icon],index)=><article className={`service-detail-card service-detail-card-${index + 1} marketing-direct-card`} key={title} onClick={()=>requestService({title,description:copy,icon})} onKeyDown={(event)=>(event.key==='Enter'||event.key===' ')&&requestService({title,description:copy,icon})} role="button" tabIndex="0"><i><Icon name={icon}/></i><div><h3>{title}</h3><p>{copy}</p></div><footer><strong>Learn More</strong><span aria-hidden="true">→</span></footer></article>)}</div>
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
  const offerings = isWebApps ? webAppOfferings : isInfluencers ? influencerOfferings : marketingOfferings

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
