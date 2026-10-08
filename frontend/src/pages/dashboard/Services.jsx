import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { getServiceSelectionByDocumentType } from '../../data/serviceSelectionFlow.js'
import { formatCurrency, formatDate } from '../../lib/formatters.js'
import { getServicePaymentEligibility } from '../../lib/paymentEligibility.js'
import { resolveUploadUrl } from '../../lib/uploads.js'
import { Icon } from '../public/Home.jsx'
import ServiceCatalogCard from '../../components/common/ServiceCatalogCard.jsx'
import { serviceGroups } from '../public/Services.jsx'
import { directServices, InfluencerMarketplace, webPackages } from '../public/MarketingWebApps.jsx'
import { useServiceRequest } from '../../context/ServiceRequestContext.jsx'
import comingSoonIllustration from '../../assets/coming-soon-illustration.png'

const visibleServiceStatuses = ['pending', 'approved', 'rejected', 'in progress', 'completed']

const serviceCategories = [
  { id: 'tax', label: 'Tax Services', icon: 'calculator' },
  { id: 'marketing', label: 'Marketing', icon: 'megaphone' },
  { id: 'influencer', label: 'Influencers', icon: 'sparkle' },
  { id: 'web', label: 'Web & Apps', icon: 'code' },
]

const mainServiceByCategory = {
  tax: 'tax-service',
  marketing: 'marketing',
  influencer: 'influencers',
  web: 'web-apps',
}

const mainServiceLabels = {
  'tax-service': 'Tax Services',
  marketing: 'Marketing',
  influencers: 'Influencer Marketing',
  'web-apps': 'Web & Apps',
}

const comingSoonHighlights = [
  ['sparkle', 'Better Experience', 'A smoother, more useful service experience for you.'],
  ['shield', 'New Features', 'Helpful tools and expert support are on the way.'],
  ['star', 'More Opportunities', 'More ways to help your business grow with confidence.'],
  ['award', 'Same Trust', 'The trusted support you know, delivered even better.'],
]

function getServiceCategory(service) {
  return service.category
}

const taxFlowIds = {
  gst: 'gst-registration-return',
  'income-tax': 'income-tax-filing',
  accounting: 'accounting-bookkeeping',
  registration: 'company-registration-food-license',
}

const taxDocumentTypes = {
  gst: 'GST Registration & Return',
  'income-tax': 'Income Tax Filing',
  accounting: 'Accounting / Bookkeeping',
  registration: 'Company Registration',
}

const taxGroupTags = {
  gst: ['GST Registration', 'GSTR-1', 'GSTR-3B', 'LUT'],
  'income-tax': ['ITR Filing', 'Tax Planning', 'TDS', 'Notice Handling'],
  accounting: ['Bookkeeping', 'Payroll', 'MIS', 'Virtual CFO'],
  registration: ['Pvt Ltd / LLP', 'MSME', 'IEC / DSC', 'Trade License'],
}

const taxOverviewCatalog = serviceGroups.map((group) => ({
  _id: `tax-group-${group.id}`,
  name: group.title,
  description: group.subtitle,
  icon: group.id === 'gst' ? 'gst' : group.id === 'income-tax' ? 'calculator' : group.id === 'accounting' ? 'book' : 'building',
  tone: group.tone,
  tags: taxGroupTags[group.id] || [],
  priceLabel: `Starting ₹${group.price}`,
  category: 'tax',
  groupId: group.id,
  isTaxGroup: true,
  featureItems: group.services.map(([name]) => name),
}))

const localServiceCatalog = [
  ...serviceGroups.flatMap((group) => group.services.map(([name, description, icon], index) => ({
    _id: `tax-${group.id}-${index}`,
    name,
    description,
    icon,
    tone: group.tone,
    tags: [group.title, 'Expert support'],
    price: Number(String(group.price || '0').replace(/,/g, '')),
    priceLabel: group.price ? `₹${group.price} onwards` : 'Quote after consultation',
    flowId: taxFlowIds[group.id] || '',
    documentType: taxDocumentTypes[group.id] || group.title,
    category: 'tax',
    groupId: group.id,
  }))),
  ...directServices.map(([name, description, icon], index) => ({
    _id: `marketing-${index}`,
    name,
    description,
    icon,
    tone: 'rose',
    tags: ['Growth strategy', 'Managed service'],
    priceLabel: 'Quote after consultation',
    documentType: name,
    category: 'marketing',
  })),
  ...webPackages.map((service, index) => ({
    _id: `web-${index}`,
    name: service.title,
    description: service.copy,
    icon: service.icon,
    tone: index % 2 ? 'orange' : 'cyan',
    tags: service.features.slice(0, 3),
    price: Number(String(service.price).replace(/,/g, '')),
    priceLabel: `₹${service.price} onwards`,
    documentType: service.title,
    category: 'web',
  })),
]

function getLocalSelectedServices() {
  try {
    const pendingRequests = JSON.parse(localStorage.getItem('pk_pending_service_requests') || '[]')
    return pendingRequests.map((request, index) => ({
      _id: `local-selected-${index}`,
      type: request.service?.title || 'Selected service',
      description: request.service?.description || request.message || '',
      status: 'pending',
      priority: 'normal',
      price: Number(String(request.service?.price || '0').replace(/,/g, '')),
      createdAt: request.savedAt,
      updatedAt: request.savedAt,
    }))
  } catch {
    return []
  }
}

function getServiceStageTitle(state) {
  switch (state.stage) {
    case 'service_completed':
      return 'Service completed'
    case 'service_rejected':
      return 'Service rejected'
    case 'service_in_progress':
      return 'Work in progress'
    case 'approved':
      return 'Payment approved'
    case 'under_review':
      return 'Payment under review'
    case 'ready':
      return 'Approved for payment'
    case 'retry':
      return 'Retry payment'
    case 'awaiting_price':
      return 'Waiting for price'
    case 'review_pending':
      return 'Documents under review'
    case 'reupload_required':
      return 'Re-upload required'
    case 'service_pending_approval':
      return 'Waiting for admin approval'
    default:
      return 'Upload documents'
  }
}

function getPaymentHint(service, state) {
  switch (state.stage) {
    case 'service_completed':
      return service.adminRemarks || 'Admin has marked this service as completed.'
    case 'service_rejected':
      return service.adminRemarks || 'Admin has rejected this service. Please review the note and upload corrected documents if needed.'
    case 'service_in_progress':
      return 'Payment is verified and the admin team is now working on this service.'
    case 'service_pending_approval':
      return 'Admin will first approve this service, then payment will open after document review and price update.'
    case 'ready':
      return 'Admin approved this service, reviewed the documents, and set the final price. Payment is ready now.'
    case 'retry':
      return state.latestPayment?.reviewRemarks
        ? `Payment rejected: ${state.latestPayment.reviewRemarks}`
        : 'Previous payment was rejected. Please submit payment again.'
    case 'under_review':
      return 'Payment request submitted. Admin is verifying screenshot and transaction ID.'
    case 'approved':
      return 'Payment approved successfully.'
    case 'awaiting_price':
      return 'Admin is yet to set the final service price.'
    case 'review_pending':
      return 'Documents are still under admin review.'
    case 'reupload_required':
      return 'Some documents were rejected. Please upload the corrected files.'
    default:
      return 'Upload documents to move this service ahead.'
  }
}

function MobileServiceCard({ service, onSelect }) {
  const price = (service.priceLabel || `From ₹${Number(service.price || 0).toLocaleString('en-IN')}`)
    .replace(/^Starting\s+/i, 'From ')
    .replace(/\s+onwards$/i, '')
  const tags = (service.isTaxGroup ? service.featureItems : service.tags || []).slice(0, 3)

  return (
    <button className={`mobile-service-card service-tone-${service.tone || 'blue'}`} onClick={onSelect} type="button">
      <span className="mobile-service-icon"><Icon name={service.icon || 'fileCheck'} /></span>
      <span className="mobile-service-copy">
        <span className="mobile-service-titleline"><strong>{service.name}</strong><i className="mobile-service-price">{price}</i></span>
        <small>{service.description || 'Professional support for your business.'}</small>
        {tags.length ? <span className="mobile-service-tags">{tags.map((tag) => <i key={tag}>{tag}</i>)}</span> : null}
      </span>
      <span className="mobile-service-arrow"><Icon name="arrowRight" /></span>
    </button>
  )
}

function Services() {
  const [searchParams] = useSearchParams()
  const requestedCategory = searchParams.get('category')
  const [services] = useState(getLocalSelectedServices)
  const [catalog] = useState(localServiceCatalog)
  const [documents] = useState([])
  const [payments] = useState([])
  const [activeCategory, setActiveCategory] = useState(
    serviceCategories.some((category) => category.id === requestedCategory) ? requestedCategory : 'tax',
  )
  const [activeTaxGroup, setActiveTaxGroup] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inactiveService, setInactiveService] = useState('')
  const navigate = useNavigate()
  const { ensureServiceAvailable } = useServiceRequest()

  useEffect(() => {
    if (serviceCategories.some((category) => category.id === requestedCategory)) {
      setActiveCategory(requestedCategory)
      setActiveTaxGroup(null)
      setSearchQuery('')
      setInactiveService('')
    }
  }, [requestedCategory])

  const selectedServices = useMemo(
    () => services.filter((service) => visibleServiceStatuses.includes(service.status)),
    [services],
  )

  const availableServices = useMemo(() => {
    return catalog.map((service) => {
      const guide = getServiceSelectionByDocumentType(service.name)
      const imageIndex = guide ? Math.max(guide.documentTypes.indexOf(service.name), 0) : -1
      const guideImage = guide ? guide.cardImages[imageIndex] || guide.cardImages[0] : null

      return {
        ...service,
        guide,
        cardImageUrl: service.image
          ? resolveUploadUrl(service.image)
          : guideImage?.src || '',
        cardImageAlt: guideImage?.alt || `${service.name} poster`,
        cardImageStyle: service.image
          ? {
              objectPosition: `${50 + Number(service.imageOffsetX || 0)}% ${50 + Number(service.imageOffsetY || 0)}%`,
              transform: `scale(${Number(service.imageZoom || 1)})`,
            }
          : guideImage?.style,
      }
    })
  }, [catalog])

  const selectedServiceStates = useMemo(
    () =>
      selectedServices.map((service) => ({
        service,
        paymentState: getServicePaymentEligibility({
          service,
          documents,
          payments,
        }),
      })),
    [documents, payments, selectedServices],
  )

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const source = activeCategory === 'tax' && !activeTaxGroup ? taxOverviewCatalog : availableServices
    return source.filter((service) => {
      const matchesCategory = getServiceCategory(service) === activeCategory
      const matchesTaxGroup = activeCategory !== 'tax' || !activeTaxGroup || service.groupId === activeTaxGroup
      const searchText = [service.name, service.description, ...(service.tags || [])].join(' ').toLowerCase()
      return matchesCategory && matchesTaxGroup && (!query || searchText.includes(query))
    })
  }, [activeCategory, activeTaxGroup, availableServices, searchQuery])

  const activeTaxGroupData = serviceGroups.find((group) => group.id === activeTaxGroup)

  const buildUploadDocumentsUrl = (service) => {
    const serviceName = typeof service === 'string' ? service : service.name
    const guide = getServiceSelectionByDocumentType(
      typeof service === 'string' ? service : service.documentType || service.name,
    )

    const query = new URLSearchParams({
      documentType: typeof service === 'string' ? serviceName : service.documentType || serviceName,
    })
    const flowId = typeof service === 'string' ? guide?.id : service.flowId || guide?.id
    if (flowId) query.set('service', flowId)

    return `/dashboard/upload-documents?${query.toString()}`
  }

  const handleOpenUploadDocuments = (service) => {
    navigate(buildUploadDocumentsUrl(service))
  }

  const handleCatalogSelection = async (service) => {
    const mainService = mainServiceByCategory[service.category] || 'tax-service'
    if (!await ensureServiceAvailable(mainService, { redirectToComingSoon: false })) {
      setInactiveService(mainService)
      return
    }
    setInactiveService('')
    if (service.isTaxGroup) {
      setActiveTaxGroup(service.groupId)
      return
    }
    handleOpenUploadDocuments(service)
  }

  const handleProceedToPayment = (service) => {
    navigate('/dashboard/payments', {
      state: {
        serviceId: service._id,
      },
    })
  }

  const handleInfluencerBooking = async (creator) => {
    if (!await ensureServiceAvailable('influencers', { redirectToComingSoon: false })) {
      setInactiveService('influencers')
      return
    }
    navigate(`/dashboard/service-request?influencer=${encodeURIComponent(creator.id)}`)
  }

  return (
    <div className="page-stack services-workspace-page">
      <section className="services-workspace-hero">
        <div>
          <span className="eyebrow">Client Workspace</span>
          <h1>Our <em>Services</em></h1>
          <p>Explore our professional services and upload the required documents for the service you need.</p>
          <p className="mobile-services-subtitle">Choose a service to get started.</p>
        </div>
      </section>

      <section className="services-category-panel" aria-label="Service categories">
        {serviceCategories.map((category) => (
          <button
            className={activeCategory === category.id ? 'active' : ''}
            key={category.id}
            onClick={() => {
              setActiveCategory(category.id)
              setActiveTaxGroup(null)
              setSearchQuery('')
              setInactiveService('')
            }}
            type="button"
          >
            <span><Icon name={category.icon} /></span>
            <strong>{category.label}</strong>
          </button>
        ))}
      </section>

      {inactiveService ? (
        <section className="dashboard-service-coming-soon" aria-live="polite">
          <header>
            <h1>Coming <em>Soon</em></h1>
            <h2>{mainServiceLabels[inactiveService] || 'This service'} is getting something amazing.</h2>
            <p>We’re working behind the scenes to bring you a better experience. Stay tuned for exciting updates.</p>
          </header>
          <img className="dashboard-coming-soon-art" src={comingSoonIllustration} alt="PK Business Solutions page under development" />
          <div className="dashboard-coming-soon-actions">
            <button className="button button-ghost" onClick={() => setInactiveService('')} type="button">Browse other services</button>
          </div>
          <div className="dashboard-coming-soon-highlights">{comingSoonHighlights.map(([icon, title, description], index) => <article className={`highlight-${index + 1}`} key={title}><i><Icon name={icon} /></i><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>
      ) : activeCategory === 'influencer' ? (
        <section className="dashboard-influencer-marketplace" aria-label="Influencer marketplace">
          <InfluencerMarketplace onBook={handleInfluencerBooking} />
        </section>
      ) : <>

      <label className="services-search-box services-mobile-search">
        <Icon name="search" />
        <input
          aria-label="Search services"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search services..."
          type="search"
          value={searchQuery}
        />
      </label>

      <section className="panel dashboard-services-section">
        <div className="document-history-head services-catalog-head">
          <div>
            <span className="eyebrow">Available Services</span>
            <h2>{activeTaxGroupData ? activeTaxGroupData.title : 'Choose a Service'}</h2>
            <p>{activeTaxGroupData ? activeTaxGroupData.subtitle : 'Select a service card to view details and upload the required documents.'}</p>
          </div>
          <div className="services-head-actions">
            {activeTaxGroupData ? (
              <button className="services-back-button" onClick={() => { setActiveTaxGroup(null); setSearchQuery('') }} type="button">
                <Icon name="arrowRight" /> All Tax Services
              </button>
            ) : null}
            <label className="services-search-box">
              <Icon name="search" />
              <input
                aria-label="Search services"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search services..."
                type="search"
                value={searchQuery}
              />
            </label>
          </div>
        </div>

        {filteredServices.length ? (
          <div className="dashboard-services-grid">
            {filteredServices.map((service) => (
              <ServiceCatalogCard
                actionLabel={service.isTaxGroup ? 'View all services' : 'Upload documents'}
                className={service.isTaxGroup ? 'tax-group-card' : ''}
                key={service._id}
                onClick={() => handleCatalogSelection(service)}
                service={{ ...service, description: service.description || service.guide?.summary, tags: service.isTaxGroup ? service.featureItems : service.tags }}
              />
            ))}
          </div>
        ) : (
          <EmptyState description="Try another category or a different search term." title="No matching services" />
        )}
      </section>

      <section className="mobile-services-catalog" aria-label="Available services">
        {filteredServices.length ? filteredServices.map((service) => (
          <MobileServiceCard
            key={service._id}
            onSelect={() => handleCatalogSelection(service)}
            service={service}
          />
        )) : <EmptyState description="Choose another category to view available services." title="No matching services" />}

        <aside className="mobile-services-support">
          <span><Icon name="headset" /></span>
          <div><small>Need help?</small><strong>Our support team is here.</strong></div>
          <button onClick={() => navigate('/dashboard/contact')} type="button">Contact Support</button>
        </aside>
      </section>

      <section className="panel my-services-panel">
        <div className="document-history-head">
          <div>
            <span className="eyebrow">My Services</span>
            <h3>Selected and assigned services</h3>
          </div>
        </div>

        {selectedServiceStates.length ? (
          <div className="card-grid two-up">
            {selectedServiceStates.map(({ service, paymentState }) => (
              <article className="panel selected-service-card" key={service._id}>
                <div className="selected-service-card-icon"><Icon name="briefcase" /></div>
                <div className="list-item">
                  <strong>{service.type}</strong>
                  <div className="list-meta-group">
                    <StatusBadge status={service.status} />
                    {paymentState.latestPayment ? (
                      <StatusBadge status={paymentState.latestPayment.verificationStatus || paymentState.latestPayment.status} />
                    ) : null}
                  </div>
                </div>
                <p>{service.description || service.notes || 'Assigned by the CA team.'}</p>
                <div className="detail-row">
                  <span>Priority: {service.priority}</span>
                  <span>Updated: {formatDate(service.updatedAt)}</span>
                </div>
                {service.price ? <small>Price: {formatCurrency(service.price)}</small> : null}
                {service.notes ? <small>Your note: {service.notes}</small> : null}
                {service.adminRemarks ? <small>Admin remarks: {service.adminRemarks}</small> : null}
                <small>{getServiceStageTitle(paymentState)}</small>
                <small>{getPaymentHint(service, paymentState)}</small>
                <div className="section-actions">
                  {!paymentState.isServiceCompleted ? (
                    <button className="button button-primary" onClick={() => handleOpenUploadDocuments(service.type)} type="button">
                      {paymentState.isServiceRejected ? 'Upload Corrected Documents' : 'Upload Documents'}
                    </button>
                  ) : null}
                  {paymentState.isReadyForPayment ? (
                    <button className="button button-secondary" onClick={() => handleProceedToPayment(service)} type="button">
                      {paymentState.latestRejectedPayment ? 'Retry Payment' : 'Proceed to Payment'}
                    </button>
                  ) : paymentState.hasPendingPayment || paymentState.hasVerifiedPayment || paymentState.latestPayment ? (
                    <button className="button button-secondary" onClick={() => navigate('/dashboard/payments')} type="button">
                      Open Payments
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState description="Selected services will appear here after you choose one from the catalog." title="No active services found" />
        )}
      </section>
      </>}
    </div>
  )
}

export default Services
