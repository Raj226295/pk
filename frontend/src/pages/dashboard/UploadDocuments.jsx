import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import Loader from '../../components/common/Loader.jsx'
import {
  documentTypeOptions,
  getRequiredDocumentInputType,
  getServiceSelectionByDocumentType,
  getServiceSelectionById,
} from '../../data/serviceSelectionFlow.js'
import api, { extractApiError } from '../../lib/api.js'
import { resolveUploadUrl } from '../../lib/uploads.js'
import { Icon } from '../public/Home.jsx'
import { serviceGroups } from '../public/Services.jsx'
import { directServices, influencers, webPackages } from '../public/MarketingWebApps.jsx'
import gstServiceIllustration from '../../assets/upload-service-icons/gst.png'
import incomeTaxIllustration from '../../assets/upload-service-icons/income-tax.png'
import accountingIllustration from '../../assets/upload-service-icons/accounting.png'
import registrationIllustration from '../../assets/upload-service-icons/registration.png'
import influencerIllustration from '../../assets/upload-service-icons/influencer.png'
import marketingIllustration from '../../assets/upload-service-icons/marketing.png'
import webAppsIllustration from '../../assets/upload-service-icons/web-apps.png'
import backIllustration from '../../assets/upload-service-icons/back.png'

const initialForm = {
  documentType: documentTypeOptions[0],
  serviceType: '',
  notes: '',
}

const activeServiceStatuses = ['pending', 'approved', 'in progress']

// The required-document checklist has a small, deliberately limited icon set.
// Keeping these inline makes every mobile icon sharp at every pixel density and
// avoids mixing image assets with the dashboard's outline-icon language.
function RequiredDocumentIcon({ name }) {
  const icons = {
    card: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
    identity: <><circle cx="12" cy="8" r="3.25" /><path d="M5 20v-1.2a7 7 0 0 1 14 0V20" /></>,
    bank: <><path d="m3 9 9-5 9 5" /><path d="M5 10h14M4 20h16M6 10v10M10 10v10M14 10v10M18 10v10" /></>,
    phone: <path d="M7 3.8 4.7 5.1c-.8.5-1.1 1.5-.8 2.4 1.7 5.2 5.8 9.3 11 11 .9.3 1.9 0 2.4-.8l1.3-2.3-3.7-2.1-1.3 1.3c-2.1-1.1-3.8-2.8-4.9-4.9l1.3-1.3z" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    cloudUpload: <><path d="M7 18a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18.3 12H19a3 3 0 0 1 0 6H7" /><path d="M12 20V12M8.75 15.25 12 12l3.25 3.25" /></>,
  }

  return (
    <svg aria-hidden="true" className="required-document-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      {icons[name] || icons.card}
    </svg>
  )
}

// Default fallback documents shown when no service/catalog match is found
const FALLBACK_REQUIRED_DOCUMENTS = [
  { label: 'Identity Proof', inputType: 'file' },
  { label: 'Address Proof', inputType: 'file' },
  { label: 'PAN Card', inputType: 'file' },
]

const taxDocumentTypesByGroup = {
  gst: 'GST Registration & Return',
  'income-tax': 'Income Tax Filing',
  accounting: 'Accounting / Bookkeeping',
  registration: 'Company Registration',
}

// These are the same client-facing services shown on the dashboard Services page.
// A detailed tax service shares its parent service's document checklist.
const dashboardServiceOptions = [
  ...serviceGroups.flatMap((group) =>
    group.services.map(([name]) => ({
      name,
      documentType: taxDocumentTypesByGroup[group.id] || name,
    })),
  ),
  ...directServices.map(([name]) => ({ name, documentType: name })),
  { name: 'Influencer Marketing', documentType: 'Influencer Marketing' },
  ...influencers.map((creator) => ({
    name: `Influencer Booking — ${creator.name}`,
    documentType: `Influencer Booking — ${creator.name}`,
  })),
  ...webPackages.map((service) => ({ name: service.title, documentType: service.title })),
]

const documentTypeByServiceName = new Map(
  dashboardServiceOptions.map((service) => [service.name, service.documentType]),
)

const serviceCategories = [
  { name: 'GST Services', icon: 'gst', artwork: gstServiceIllustration, tone: 'gold', services: ['GST Registration', 'GST Return Filing', 'GSTR-1 Filing', 'GSTR-3B Filing', 'Notice Handling', 'LUT Filing', 'Refund Services', 'GST Audit & Compliance', 'GST Consultation'] },
  { name: 'Income Tax', icon: 'taxFile', artwork: incomeTaxIllustration, tone: 'blue', services: ['Individual ITR', 'Business ITR', 'Income Tax Return', 'Tax Planning', 'TDS Return', 'TDS Compliance', 'Notice Handling', 'Tax Consultation'] },
  { name: 'Accounting', icon: 'calculator', artwork: accountingIllustration, tone: 'green', services: ['Bookkeeping', 'Payroll', 'MIS Reporting', 'Virtual CFO', 'Financial Reporting', 'Accounts Management', 'Bank Reconciliation', 'Financial Compliance'] },
  { name: 'Business Registration', icon: 'building', artwork: registrationIllustration, tone: 'purple', services: ['Private Limited Company', 'LLP Registration', 'Partnership Registration', 'MSME/Udyam Registration', 'Trade License', 'DSC', 'IEC Registration', 'Business Compliance'] },
  { name: 'Influencer Marketing', icon: 'megaphone', artwork: influencerIllustration, tone: 'rose', services: ['Influencer Campaign', 'Brand Promotion', 'Product Promotion', 'Instagram Collaboration', 'YouTube Collaboration', 'Creator Collaboration', 'Influencer Marketing Campaign'] },
  { name: 'Web & App Development', icon: 'code', artwork: webAppsIllustration, tone: 'blue', services: ['Business Website', 'E-commerce Website', 'Custom Web Application', 'Mobile App Development', 'UI/UX Design', 'Website Redesign', 'Website Maintenance'] },
  { name: 'Marketing', icon: 'growthChart', artwork: marketingIllustration, tone: 'orange', services: ['SEO', 'Social Media Marketing', 'Google Ads', 'Meta Ads', 'Content Marketing', 'Performance Marketing', 'Branding', 'Marketing Campaign'] },
]

const serviceDescriptions = {
  'GST Registration': 'New GST registration for your business',
  'GST Return Filing': 'Monthly, quarterly & annual returns',
  'GSTR-1 Filing': 'Outward supplies return filing.',
  'GSTR-3B Filing': 'Monthly summary return filing.',
  'Notice Handling': 'Reply to GST notices and demand orders.',
  'LUT Filing': 'Export without GST with LUT.',
  'Refund Services': 'GST refund application and tracking.',
  'GST Audit & Compliance': 'Audit support and regulatory compliance.',
  'GST Consultation': 'Expert advice and guidance.',
  'GST Notice Handling': 'Reply to departmental notices',
  'LUT & Refunds': 'LUT filing and GST refund support',
  'E-Way Bill & E-Invoicing': 'Generate and manage e-way bills',
  'GST Audit & Health Check': 'Comprehensive GST compliance review',
}

const serviceIcons = {
  'GST Registration': 'gst',
  'GST Return Filing': 'documentStack',
  'GSTR-1 Filing': 'documentStack',
  'GSTR-3B Filing': 'taxFile',
  'Notice Handling': 'shield',
  'LUT Filing': 'returnArrow',
  'Refund Services': 'wallet',
  'GST Audit & Compliance': 'audit',
  'GST Consultation': 'headset',
  'GST Notice Handling': 'shield',
  'LUT & Refunds': 'returnArrow',
  'E-Way Bill & E-Invoicing': 'truck',
  'GST Audit & Health Check': 'audit',
  'Income Tax Filing': 'taxFile',
  'ITR Filing (All Forms)': 'taxFile',
  'Tax Planning & Consultancy': 'calculator',
  'Income Tax Notices': 'shield',
  'TDS Return Filing': 'documentStack',
  'Capital Gains & Crypto': 'growthChart',
  'Business Tax Compliance': 'fileCheck',
  'Accounting / Bookkeeping': 'book',
  Bookkeeping: 'book',
  'Payroll Management': 'users',
  'Virtual CFO Services': 'briefcase',
  'Company Registration': 'building',
  'Food License': 'utensils',
  'MSME Registration': 'building',
  'Trade License': 'fileCheck',
  'IEC / DSC': 'key',
  'Instagram Influencer Marketing': 'instagram',
  'YouTube Influencer Marketing': 'youtube',
  'Brand Collaboration': 'users',
  'Campaign Management': 'megaphone',
  'Influencer Discovery': 'search',
  'Performance Tracking': 'barChart',
  'Business Website': 'globe',
  'E-commerce Website': 'cart',
  'Website Development': 'code',
  'App Development': 'phone',
  'CRM Development': 'network',
  SEO: 'seo',
  'Google Ads': 'growthChart',
  'Meta Ads': 'barChart',
  'Social Media Marketing': 'megaphone',
  'Content Marketing': 'book',
  'Individual ITR': 'taxFile',
  'Business ITR': 'briefcase',
  'Income Tax Return': 'tax',
  'Tax Planning': 'calculator',
  'TDS Return': 'documentStack',
  'TDS Compliance': 'shield',
  'Tax Consultation': 'headset',
  Payroll: 'users',
  'MIS Reporting': 'barChart',
  'Virtual CFO': 'briefcase',
  'Financial Reporting': 'pieChart',
  'Accounts Management': 'calculator',
  'Bank Reconciliation': 'wallet',
  'Financial Compliance': 'fileCheck',
  'Private Limited Company': 'building',
  'LLP Registration': 'building',
  'Partnership Registration': 'users',
  'MSME/Udyam Registration': 'building',
  DSC: 'key',
  'IEC Registration': 'fileCheck',
  'Business Compliance': 'shield',
  'Custom Web Application': 'code',
  'Mobile App Development': 'phone',
  'UI/UX Design': 'grid',
  'Website Redesign': 'refresh',
  'Website Maintenance': 'audit',
  'Performance Marketing': 'speedometer',
  Branding: 'award',
  'Marketing Campaign': 'rocket',
  'Influencer Campaign': 'megaphone',
  'Brand Promotion': 'award',
  'Product Promotion': 'cart',
  'Instagram Collaboration': 'instagram',
  'YouTube Collaboration': 'youtube',
  'Creator Collaboration': 'users',
  'Influencer Marketing Campaign': 'sparkle',
}

const categoryDescriptions = {
  'GST Services': 'Registration, return filing, compliance and more.',
  'Income Tax': 'ITR filing, tax planning, TDS and consultation.',
  Accounting: 'Bookkeeping, payroll, MIS and financial reporting.',
  'Business Registration': 'Company setup, licenses and registrations.',
  'Web & App Development': 'Websites, apps and custom digital products.',
  Marketing: 'SEO, paid ads, content and social media marketing.',
  'Influencer Marketing': 'Brand promotions and creator collaborations.',
}

const workflowDocumentsByCategory = {
  'GST Services': ['PAN Card', 'Aadhaar Card', 'Business Address Proof', 'Business Registration Proof', 'Bank Account Details', 'Photograph'],
  'Income Tax': ['PAN Card', 'Aadhaar Card', 'Bank Account Details', 'Income Proof / Form 16', 'Previous Return Copy'],
  Accounting: ['PAN Card', 'Business Registration Proof', 'Bank Statements', 'Sales and Purchase Records', 'Existing Accounting Data'],
  'Business Registration': ['PAN Card', 'Aadhaar Card', 'Business Address Proof', 'Photograph', 'Proposed Business Details'],
  'Web & App Development': ['Logo / Brand Assets', 'Business Details', 'Content', 'Product Data', 'Existing Website Details', 'Reference Files'],
  Marketing: ['Brand Logo', 'Brand Guidelines', 'Campaign Brief', 'Product / Service Details', 'Target Audience Information', 'Existing Creatives'],
  'Influencer Marketing': ['Campaign Brief', 'Brand Logo', 'Product Details', 'Creative Guidelines', 'Reference Content', 'Campaign Requirements'],
}

function UploadStepper({ step }) {
  const steps = ['Select Service', 'Select Type', 'Upload Documents']

  return (
    <nav aria-label="Upload progress" className="upload-flow-stepper" style={{ '--completed-line': `${(step - 1) * 33.333}%` }}>
      {steps.map((label, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < step
        const isActive = stepNumber === step
        return (
          <div className={`upload-flow-step${isActive ? ' active' : ''}${isComplete ? ' complete' : ''}`} key={label}>
            <span>{isComplete ? '✓' : stepNumber}</span>
            <strong>{label}</strong>
          </div>
        )
      })}
    </nav>
  )
}

function getLatestMatchingDocument(documents = [], { requiredDocument = '', documentType = '', serviceType = '' }) {
  return (
    [...documents]
      .filter(
        (document) =>
          document.title === requiredDocument &&
          document.documentType === documentType &&
          document.serviceType === serviceType,
      )
      .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))[0] ||
    null
  )
}

function UploadDocuments() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedServiceId = searchParams.get('service') || ''
  const selectedDocumentType = searchParams.get('documentType') || ''
  const selectedCatalogServiceId = searchParams.get('catalogServiceId') || ''
  const selectedService = getServiceSelectionById(selectedServiceId)
  const [documents, setDocuments] = useState([])
  const [services, setServices] = useState([])
  const [serviceCatalog, setServiceCatalog] = useState([])
  const [selectedInputs, setSelectedInputs] = useState({})
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fileInputSeed, setFileInputSeed] = useState(0)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [activeCategory, setActiveCategory] = useState('')
  const [selectedSubservice, setSelectedSubservice] = useState('')
  const [isServiceSelectionComplete, setIsServiceSelectionComplete] = useState(Boolean(selectedCatalogServiceId || selectedServiceId))
  const [flowStep, setFlowStep] = useState(selectedCatalogServiceId || selectedServiceId ? 3 : 1)

  const selectedCatalogItem = useMemo(
    () => serviceCatalog.find((service) => service._id === selectedCatalogServiceId) || null,
    [selectedCatalogServiceId, serviceCatalog],
  )

  const formCatalogItem = useMemo(
    () => serviceCatalog.find((service) => service.name === form.serviceType || service.name === form.documentType) || null,
    [form.documentType, form.serviceType, serviceCatalog],
  )

  // Include every client-facing service, not only the tax services stored in the
  // backend catalog. This keeps the upload page aligned with the Services page.
  const serviceOptions = useMemo(() => {
    const options = []
    const addOption = (serviceName) => {
      if (serviceName && !options.includes(serviceName)) {
        options.push(serviceName)
      }
    }

    serviceCatalog.forEach((service) => addOption(service.name))
    documentTypeOptions.forEach(addOption)
    dashboardServiceOptions.forEach((service) => addOption(service.name))

    if (selectedCatalogItem?.name) {
      const selectedIndex = options.indexOf(selectedCatalogItem.name)
      if (selectedIndex >= 0) options.splice(selectedIndex, 1)
      options.unshift(selectedCatalogItem.name)
    }

    return options.length ? options : ['General']
  }, [selectedCatalogItem, serviceCatalog])

  const activeCategoryServices = useMemo(() => {
    const category = serviceCategories.find((item) => item.name === activeCategory)
    if (!category) return []
    return category.services
  }, [activeCategory])

  const selectCategory = (categoryName) => {
    setActiveCategory(categoryName)
    setSelectedSubservice('')
    setIsServiceSelectionComplete(false)
    setFlowStep(2)
  }

  const continueWithSelectedService = () => {
    if (!selectedSubservice) return
    setForm((current) => ({
      ...current,
      serviceType: selectedSubservice,
      documentType: documentTypeByServiceName.get(selectedSubservice) || selectedSubservice,
    }))
    setIsServiceSelectionComplete(true)
    setFlowStep(3)
  }

  const goBackInUploadFlow = () => {
    if (flowStep === 1) {
      navigate('/dashboard')
      return
    }

    if (flowStep === 3) {
      setIsServiceSelectionComplete(false)
    }

    setFlowStep((current) => Math.max(1, current - 1))
  }

  useEffect(() => {
    if (!isServiceSelectionComplete) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('required-documents')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isServiceSelectionComplete])

  const activeDocumentGuide = useMemo(() => {
    const dynamicService = selectedCatalogItem || formCatalogItem

    if (dynamicService) {
      const imageUrl = dynamicService.image ? resolveUploadUrl(dynamicService.image) : ''
      const fallbackGuide = getServiceSelectionByDocumentType(dynamicService.name)
      const cardImages = imageUrl
        ? [
            {
              src: imageUrl,
              alt: `${dynamicService.name} service artwork`,
              style: {
                objectPosition: `${50 + Number(dynamicService.imageOffsetX || 0)}% ${50 + Number(dynamicService.imageOffsetY || 0)}%`,
                transform: `scale(${Number(dynamicService.imageZoom || 1)})`,
              },
            },
          ]
        : fallbackGuide?.cardImages || []

      // If the catalog service has no requiredDocuments stored in the DB,
      // fall back to the hardcoded serviceSelectionFlow.js list for that service name.
      const dbRequiredDocs = dynamicService.requiredDocuments || []
      const requiredDocuments = dbRequiredDocs.length > 0
        ? dbRequiredDocs.map((requirement) => ({
            label: requirement.label,
            inputType: requirement.inputType === 'text' ? 'text' : 'file',
          }))
        : (() => {
            const flowGuide = getServiceSelectionByDocumentType(dynamicService.name)
            const activeDocumentType = flowGuide?.defaultDocumentType || dynamicService.name
            const flowDocs = flowGuide?.requiredDocumentsByType?.[activeDocumentType] || []
            return flowDocs.map((label) => ({
              label,
              inputType: getRequiredDocumentInputType(label),
            }))
          })()

      return {
        id: dynamicService._id,
        name: dynamicService.name,
        description: dynamicService.description || 'Upload the required details for this service.',
        activeDocumentType: dynamicService.name,
        documentTypes: [dynamicService.name],
        cardImages,
        requiredDocuments,
      }
    }

    const guide = selectedService || getServiceSelectionByDocumentType(form.documentType)

    if (guide) {
      const activeDocumentType = guide.documentTypes.includes(form.documentType)
        ? form.documentType
        : guide.defaultDocumentType

      return {
        ...guide,
        activeDocumentType,
        requiredDocuments: (guide.requiredDocumentsByType[activeDocumentType] || []).map((label) => ({
          label,
          inputType: getRequiredDocumentInputType(label),
        })),
      }
    }

    const fallbackDocumentType = selectedDocumentType || form.documentType

    if (fallbackDocumentType && fallbackDocumentType !== 'General') {
      const normalizedType = fallbackDocumentType.toLowerCase()
      const workflowCategory = serviceCategories.find((category) => category.services.includes(fallbackDocumentType))
      const isDigitalBuild = /website|web app|app development|e-commerce|landing page/.test(normalizedType)
      const isMarketing = /marketing|seo|ads|content|influencer|lead generation|campaign|booking/.test(normalizedType)
      const requiredDocuments = workflowCategory
        ? (workflowDocumentsByCategory[workflowCategory.name] || FALLBACK_REQUIRED_DOCUMENTS).map((label) => ({
            label,
            inputType: getRequiredDocumentInputType(label),
          }))
        : isDigitalBuild
        ? [
            { label: 'Business / brand name', inputType: 'text' },
            { label: 'Mobile number', inputType: 'text' },
            { label: 'Email ID', inputType: 'text' },
            { label: 'Project brief and required features', inputType: 'text' },
            { label: 'Logo or brand assets', inputType: 'file' },
            { label: 'Reference website or app links', inputType: 'text' },
          ]
        : isMarketing
          ? [
              { label: 'Business / brand name', inputType: 'text' },
              { label: 'Mobile number', inputType: 'text' },
              { label: 'Email ID', inputType: 'text' },
              { label: 'Website or social profile links', inputType: 'text' },
              { label: 'Campaign goal and target audience', inputType: 'text' },
              { label: 'Indicative monthly budget', inputType: 'text' },
            ]
          : FALLBACK_REQUIRED_DOCUMENTS

      return {
        id: fallbackDocumentType.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: fallbackDocumentType,
        description: `Provide the required details so our team can begin your ${fallbackDocumentType} request.`,
        activeDocumentType: fallbackDocumentType,
        documentTypes: [fallbackDocumentType],
        cardImages: [],
        requiredDocuments,
      }
    }

    // --- FIX: Fallback guide so file inputs always render ---
    return {
      id: 'general',
      name: 'General',
      description: 'Upload the required documents for your selected service.',
      activeDocumentType: form.documentType || 'General',
      documentTypes: ['General'],
      cardImages: [],
      requiredDocuments: FALLBACK_REQUIRED_DOCUMENTS,
    }
  }, [form.documentType, formCatalogItem, selectedCatalogItem, selectedDocumentType, selectedService])

  const activeServiceType = form.serviceType || activeDocumentGuide?.activeDocumentType || 'General'

  const loadData = useCallback(async () => {
    const [{ data: documentsData }, { data: catalogData }, { data: servicesData }] = await Promise.all([
      api.get('/api/documents'),
      api.get('/api/services/catalog'),
      api.get('/api/services'),
    ])

    setDocuments(documentsData.documents || [])
    setServiceCatalog(catalogData.services || [])
    setServices(servicesData.services || [])
  }, [])

  useEffect(() => {
    loadData()
      .catch(() => {
        // The selected-service checklist is available locally when no backend is configured.
        setDocuments([])
        setServiceCatalog([])
        setServices([])
        setStatus({ type: '', message: '' })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [loadData])

  useEffect(() => {
    const fallbackServiceType = selectedCatalogItem?.name || serviceCatalog[0]?.name || 'General'

    setForm((current) => {
      const preferredDocumentType =
        selectedService && selectedService.documentTypes.includes(selectedDocumentType)
          ? selectedDocumentType
          : ''

      const nextDocumentType = selectedCatalogItem
        ? selectedCatalogItem.name
        : selectedService
        ? preferredDocumentType || (selectedService.documentTypes.includes(current.documentType)
            ? current.documentType
            : selectedService.defaultDocumentType)
        : selectedDocumentType || current.documentType || documentTypeOptions[0]

      const nextServiceType = selectedCatalogItem || selectedService ? nextDocumentType : current.serviceType || fallbackServiceType

      if (current.documentType === nextDocumentType && current.serviceType === nextServiceType) {
        return current
      }

      return {
        ...current,
        documentType: nextDocumentType,
        serviceType: nextServiceType,
      }
    })
  }, [selectedCatalogItem, selectedDocumentType, selectedService, serviceCatalog])

  useEffect(() => {
    setSelectedInputs({})
    setFileInputSeed((current) => current + 1)
  }, [activeDocumentGuide?.activeDocumentType, activeServiceType])

  const checklistItems = useMemo(() => {
    if (!activeDocumentGuide) {
      return []
    }

    return activeDocumentGuide.requiredDocuments.map((requirement) => {
      const requiredDocument = requirement.label
      const existingDocument = getLatestMatchingDocument(documents, {
        requiredDocument,
        documentType: activeDocumentGuide.activeDocumentType,
        serviceType: activeServiceType,
      })
      const inputType = requirement.inputType === 'text' ? 'text' : 'file'
      const selectedInput = selectedInputs[requiredDocument] || null
      const selectedFile = inputType === 'file' ? selectedInput : null
      const selectedText = inputType === 'text' ? selectedInput || '' : ''
      const hasValidUpload = Boolean(existingDocument && existingDocument.status !== 'rejected')
      const isReady = Boolean(selectedFile || selectedText || hasValidUpload)

      return {
        requiredDocument,
        inputType,
        existingDocument,
        selectedFile,
        selectedText,
        hasValidUpload,
        isReady,
        statusLabel: selectedFile || selectedText
          ? 'Selected'
          : existingDocument?.status === 'rejected'
            ? 'Rejected'
            : hasValidUpload
              ? 'Uploaded'
              : 'Pending',
      }
    })
  }, [activeDocumentGuide, activeServiceType, documents, selectedInputs])

  const checklistSummary = useMemo(() => {
    return {
      total: checklistItems.length,
      ready: checklistItems.filter((item) => item.isReady).length,
      uploaded: checklistItems.filter((item) => item.hasValidUpload).length,
      missing: checklistItems.filter((item) => !item.isReady).length,
    }
  }, [checklistItems])

  const checklistProgress = checklistSummary.total
    ? Math.round((checklistSummary.ready / checklistSummary.total) * 100)
    : 0

  const getRequirementIcon = (label = '') => {
    const normalizedLabel = label.toLowerCase()

    if (normalizedLabel.includes('pan')) return 'card'
    if (normalizedLabel.includes('aadhaar')) return 'identity'
    if (normalizedLabel.includes('bank')) return 'bank'
    if (normalizedLabel.includes('mobile') || normalizedLabel.includes('phone')) return 'phone'
    if (normalizedLabel.includes('email')) return 'mail'
    return 'card'
  }

  const getRequirementDescription = (label = '') => {
    const normalizedLabel = label.toLowerCase()
    if (normalizedLabel.includes('pan')) return 'Upload PAN card copy'
    if (normalizedLabel.includes('aadhaar')) return 'Upload Aadhaar card copy'
    if (normalizedLabel.includes('passport') || normalizedLabel.includes('photo')) return 'Upload passport size photo'
    if (normalizedLabel.includes('business')) return 'Upload business address proof'
    if (normalizedLabel.includes('electricity') || normalizedLabel.includes('rent')) return 'Upload electricity bill or rent agreement'
    if (normalizedLabel.includes('mobile') || normalizedLabel.includes('phone')) return 'Enter your mobile number'
    if (normalizedLabel.includes('email')) return 'Enter your email address'
    return 'Upload required document'
  }

  const currentCatalogItem = useMemo(
    () => serviceCatalog.find((service) => service.name === activeServiceType) || null,
    [activeServiceType, serviceCatalog],
  )

  const currentActiveService = useMemo(
    () =>
      services.find(
        (service) => service.type === activeServiceType && activeServiceStatuses.includes(service.status),
      ) || null,
    [activeServiceType, services],
  )

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => {
      const nextForm = {
        ...current,
        [name]: value,
      }

      // The service selection controls both the service saved with the upload
      // and the document checklist displayed to the client.
      if (name === 'serviceType') {
        nextForm.documentType = documentTypeByServiceName.get(value) || value
      }

      if (selectedService && name === 'documentType') {
        nextForm.serviceType = value
      }

      return nextForm
    })
  }

  const handleRequirementChange = (requiredDocument, value) => {
    setSelectedInputs((current) => {
      if (!value) {
        const nextInputs = { ...current }
        delete nextInputs[requiredDocument]
        return nextInputs
      }

      return {
        ...current,
        [requiredDocument]: value,
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    const missingDocuments = checklistItems.filter((item) => !item.isReady)

    if (missingDocuments.length) {
      setStatus({
        type: 'error',
        message: `Please choose files for all required documents before continuing. Missing: ${missingDocuments
          .map((item) => item.requiredDocument)
          .join(', ')}`,
      })
      return
    }

    setSubmitting(true)

    try {
      const uploadsToSubmit = checklistItems.filter((item) => item.selectedFile || item.selectedText)

      for (const [index, item] of uploadsToSubmit.entries()) {
        if (item.inputType === 'text') {
          await api.post('/api/documents/upload', {
            title: item.requiredDocument,
            documentType: activeDocumentGuide?.activeDocumentType || form.documentType,
            serviceType: activeServiceType,
            notes: index === 0 ? form.notes : '',
            inputType: 'text',
            textValue: item.selectedText,
          })
        } else {
          const payload = new FormData()
          payload.append('title', item.requiredDocument)
          payload.append('documentType', activeDocumentGuide?.activeDocumentType || form.documentType)
          payload.append('serviceType', activeServiceType)
          payload.append('notes', index === 0 ? form.notes : '')
          payload.append('inputType', 'file')
          payload.append('file', item.selectedFile)

          await api.post('/api/documents/upload', payload, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
        }
      }

      let nextServiceId = currentActiveService?._id || ''

      if (!nextServiceId && currentCatalogItem?._id) {
        const { data } = await api.post('/api/services/request', {
          catalogServiceId: currentCatalogItem._id,
          notes: form.notes,
        })
        nextServiceId = data.service?._id || ''
      }

      const resetDocumentType = selectedCatalogItem
        ? selectedCatalogItem.name
        : selectedService
          ? selectedService.defaultDocumentType
          : documentTypeOptions[0]
      const resetServiceType = selectedCatalogItem || selectedService ? resetDocumentType : serviceCatalog[0]?.name || 'General'

      setForm({
        documentType: resetDocumentType,
        serviceType: resetServiceType,
        notes: '',
      })
      setSelectedInputs({})
      setFileInputSeed((current) => current + 1)
      await loadData()

      navigate('/dashboard/payments', {
        state: nextServiceId
          ? {
              serviceId: nextServiceId,
            }
          : undefined,
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loader variant="upload" />
  }

  return (
    <div className="page-stack upload-documents-page">
      <PageHeader
        description={flowStep === 1 ? 'Select the service for which you want to upload documents.' : flowStep === 2 ? 'Select the service type for your chosen service.' : 'Upload the required documents to proceed.'}
        eyebrow="Client Workspace"
        title="Upload Documents"
      />

      {flowStep > 1 ? <div className="upload-flow-controls">
        <button aria-label={flowStep === 1 ? 'Back to overview' : 'Back to previous step'} className="upload-flow-back" onClick={goBackInUploadFlow} type="button">
          <img alt="" aria-hidden="true" src={backIllustration} />
          <span>Back</span>
        </button>
      </div> : null}

      <UploadStepper step={flowStep} />

      {flowStep === 3 && activeDocumentGuide ? (
        <section className="panel guided-upload-panel">
          <div className="guided-upload-layout">
            <div className="guided-upload-copy">
              <span className="eyebrow">{selectedCatalogItem || selectedService ? 'Selected Service' : 'Document Checklist'}</span>
              <h3>{activeDocumentGuide.name}</h3>
              <p>
                {selectedCatalogItem || selectedService
                  ? 'Select one file for each required document below. The checklist will tick automatically as you choose files.'
                  : `The checklist below updates with the current document type: ${activeDocumentGuide.activeDocumentType}.`}
              </p>
              <div className="guided-upload-chip-row">
                <span className="service-doc-chip">{activeDocumentGuide.activeDocumentType}</span>
              </div>
              <div className="guided-document-group">
                <strong>Required documents</strong>
                <ul className="guided-document-list">
                  {activeDocumentGuide.requiredDocuments.map((item) => (
                    <li key={item.label}>{item.label}</li>
                  ))}
                </ul>
              </div>
            </div>

            {activeDocumentGuide.cardImages.length ? (
              <div className={`guided-upload-media ${activeDocumentGuide.cardImages.length > 1 ? 'dual' : ''}`}>
                {activeDocumentGuide.cardImages.map((image) => (
                  <img alt={image.alt} key={image.alt} loading="lazy" src={image.src} style={image.style} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {flowStep === 1 ? <section className="panel mobile-upload-service-card upload-flow-selection-card upload-flow-content">
        <div className="service-category-heading">
          <span>1</span>
          <div><strong>Select Service</strong><small>Choose the service category to proceed.</small></div>
        </div>
        <div className="service-category-card-grid" role="list">
          {serviceCategories.map((category) => {
            const isActive = activeCategory === category.name
            return (
              <button
                aria-pressed={isActive}
                className={`service-category-card ${category.tone}${isActive ? ' active' : ''}`}
                disabled={Boolean(selectedCatalogItem)}
                key={category.name}
                onClick={() => selectCategory(category.name)}
                type="button"
              >
                <i>{category.artwork ? <img alt="" src={category.artwork} /> : <Icon name={category.icon} />}</i>
                <span><strong>{category.name}</strong><small>{categoryDescriptions[category.name]}</small></span>
                {isActive ? <b aria-label="Selected">✓</b> : null}
              </button>
            )
          })}
        </div>

      </section> : null}

      {flowStep === 2 ? <section aria-live="polite" className="panel service-subservice-panel is-open upload-flow-type-card upload-flow-content">
          <div className="service-subservice-panel-inner">
            <header>
              <span>2</span>
              <div><strong>Select Service Type</strong><small>Choose the specific service under {activeCategory}.</small></div>
            </header>
            <div className="service-subservice-list" role="list">
              {activeCategoryServices.map((serviceName) => {
                const isSelected = selectedSubservice === serviceName
                const activeTone = serviceCategories.find((category) => category.name === activeCategory)?.tone || 'blue'
                return (
                  <button aria-label={`${isSelected ? 'Selected: ' : 'Select '}${serviceName}`} aria-pressed={isSelected} className={`service-type-option ${activeTone}${isSelected ? ' selected' : ''}`} key={serviceName} onClick={() => setSelectedSubservice(serviceName)} type="button">
                    <i><Icon name={serviceIcons[serviceName] || serviceCategories.find((category) => category.name === activeCategory)?.icon || 'fileCheck'} /></i>
                    <span><strong>{serviceName}</strong><small>{serviceDescriptions[serviceName] || `Get expert help with ${serviceName}.`}</small></span>
                    <b aria-hidden="true"><Icon name={isSelected ? 'check' : 'arrowRight'} /></b>
                  </button>
                )
              })}
              {!activeCategoryServices.length ? <p className="service-search-empty">No services are available in this category yet.</p> : null}
            </div>
            <button className="service-selection-continue" disabled={!selectedSubservice} onClick={continueWithSelectedService} type="button">
              Continue <Icon name="arrowRight" />
            </button>
          </div>
        </section>
      : null}

      {flowStep === 3 && isServiceSelectionComplete ? <section className="upload-documents-workspace upload-flow-content" id="required-documents">
        <form className="panel form-panel multi-document-form" onSubmit={handleSubmit}>
          <h3>Upload Required Documents</h3>

          <label className="upload-service-select">
            {selectedService && selectedService.documentTypes.length > 1 ? 'Choose document track' : 'Document type'}
            <select disabled={Boolean(selectedCatalogItem)} name="documentType" onChange={handleChange} value={form.documentType}>
              {(selectedCatalogItem ? [selectedCatalogItem.name] : selectedService ? selectedService.documentTypes : serviceCatalog.map((service) => service.name)).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {!selectedCatalogItem && !selectedService && !serviceCatalog.length ? <option value="General">General</option> : null}
            </select>
          </label>

          <label className="upload-related-service">
            Related service
            {selectedCatalogItem || selectedService ? (
              <input readOnly type="text" value={form.serviceType || form.documentType} />
            ) : (
              <select name="serviceType" onChange={handleChange} value={form.serviceType}>
                {serviceOptions.map((serviceName) => (
                  <option key={serviceName} value={serviceName}>
                    {serviceName}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="upload-notes-field">
            <span><Icon name="documentStack" /> Notes <em>(Optional)</em></span>
            <textarea
              name="notes"
              onChange={handleChange}
              placeholder="Optional message for admin"
              rows="4"
              maxLength="500"
              value={form.notes}
            />
          </label>

          <div className="document-checklist-grid">
            {checklistItems.map((item, index) => (
              <article
                className={`document-checklist-row${item.isReady ? ' ready' : ''}${item.existingDocument?.status === 'rejected' ? ' rejected' : ''}`}
                key={`${form.documentType}-${item.requiredDocument}`}
              >
                <span className="document-type-icon" aria-hidden="true">
                  <RequiredDocumentIcon name={getRequirementIcon(item.requiredDocument)} />
                </span>
                <div className="document-checklist-head">
                  <label className="document-checklist-checkbox">
                    <input checked={item.isReady} readOnly type="checkbox" />
                    <span>{item.requiredDocument}</span>
                  </label>
                  <em className="document-required-badge">Required</em>
                  <span
                    className={`document-checklist-status ${
                      item.selectedFile
                        ? 'selected'
                        : item.existingDocument?.status === 'rejected'
                          ? 'rejected'
                          : item.hasValidUpload
                            ? 'uploaded'
                            : 'pending'
                    }`}
                  >
                    {item.statusLabel}
                  </span>
                </div>

                <div className="document-checklist-copy">
                  <small>
                    {item.selectedFile
                      ? item.selectedFile.name
                      : item.selectedText
                        ? item.selectedText
                        : item.existingDocument?.inputType === 'text'
                          ? item.existingDocument.textValue || 'Text details already submitted'
                          : item.existingDocument?.originalName || getRequirementDescription(item.requiredDocument)}
                  </small>
                  {item.existingDocument?.status === 'rejected' && !item.selectedFile ? (
                    <small>Previous upload was rejected. Please choose a corrected file.</small>
                  ) : null}
                  {item.inputType === 'file' ? <small>PDF, JPG or PNG · Max 10 MB</small> : null}
                </div>

                <div className="document-upload-field">
                  <span>{item.inputType === 'text' ? 'Enter detail' : 'Upload file'}</span>
                  {item.inputType === 'text' ? (
                    <input
                      key={`${fileInputSeed}-${index}-${item.requiredDocument}`}
                      onChange={(event) => handleRequirementChange(item.requiredDocument, event.target.value)}
                      placeholder={`Enter ${item.requiredDocument.toLowerCase()}`}
                      type={item.requiredDocument === 'Email ID' ? 'email' : 'text'}
                      value={item.selectedText}
                    />
                  ) : (
                    <label className="document-file-picker">
                      <RequiredDocumentIcon name="cloudUpload" />
                      <span>{item.selectedFile ? 'Change File' : 'Choose File'}</span>
                      <input
                        accept=".pdf,image/*"
                        key={`${fileInputSeed}-${index}-${item.requiredDocument}`}
                        onChange={(event) => handleRequirementChange(item.requiredDocument, event.target.files?.[0] || null)}
                        type="file"
                      />
                    </label>
                  )}
                </div>
              </article>
            ))}
          </div>

          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Submitting documents...' : 'Submit Documents'}
            {!submitting ? <Icon name="arrowRight" /> : null}
          </button>
        </form>

        <article className="panel document-summary-panel upload-progress-panel">
          <div className="upload-progress-banner">
            <div
              className="upload-progress-ring"
              style={{ '--upload-progress': `${checklistProgress * 3.6}deg` }}
            >
              <strong>{checklistSummary.ready}/{checklistSummary.total || 0}</strong>
            </div>
            <div>
              <span className="eyebrow">Checklist Progress</span>
              <h3>{checklistProgress}% complete</h3>
              <p>{checklistSummary.ready} of {checklistSummary.total || 0} required items are ready.</p>
            </div>
            <strong>{checklistSummary.ready}/{checklistSummary.total || 0}</strong>
            <Icon name="arrowRight" />
          </div>

          <div
            aria-label={`${checklistProgress}% checklist complete`}
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow={checklistProgress}
            className="upload-progress-track"
            role="progressbar"
          >
            <span style={{ width: `${checklistProgress}%` }} />
          </div>

          <div className="upload-progress-metrics">
            <div>
              <strong>{checklistSummary.total}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{checklistSummary.ready}</strong>
              <span>Ready</span>
            </div>
            <div>
              <strong>{checklistSummary.uploaded}</strong>
              <span>Uploaded</span>
            </div>
            <div>
              <strong>{checklistSummary.missing}</strong>
              <span>Missing</span>
            </div>
          </div>

          <div className="upload-progress-table-card">
            <div className="upload-progress-table-title">
              <strong>Required document checklist</strong>
              <span>{activeDocumentGuide?.activeDocumentType || form.documentType}</span>
            </div>
            <div aria-label="Checklist progress details" className="upload-progress-table" role="table">
              <div className="upload-progress-table-head" role="row">
                <span role="columnheader">No.</span>
                <span role="columnheader">Document name</span>
                <span role="columnheader">Input</span>
                <span role="columnheader">Status</span>
              </div>
              {checklistItems.map((item, index) => (
                <div
                  className={`upload-progress-table-row${item.isReady ? ' ready' : ''}${item.existingDocument?.status === 'rejected' ? ' rejected' : ''}`}
                  key={`progress-${item.requiredDocument}`}
                  role="row"
                >
                  <span className="upload-progress-index" role="cell">{index + 1}</span>
                  <strong role="cell">{item.requiredDocument}</strong>
                  <span className="upload-progress-input" role="cell">{item.inputType === 'text' ? 'Text' : 'File'}</span>
                  <span className="upload-progress-status" role="cell">{item.statusLabel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="upload-progress-note">
            <Icon name="headset" />
            <div>
              <strong>Need Help?</strong>
              <p>Facing any issue? Contact our support team.</p>
            </div>
            <button onClick={() => navigate('/contact')} type="button">Contact Support</button>
          </div>
        </article>
      </section> : null}
    </div>
  )
}

export default UploadDocuments
