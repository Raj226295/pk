import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from './Home.jsx'
import { useServiceRequest } from '../../context/ServiceRequestContext.jsx'
import Loader from '../../components/common/Loader.jsx'
import gstDocumentIcon from '../../assets/service-category-icons/gst-document.png'
import taxCalculatorIcon from '../../assets/service-category-icons/tax-calculator.png'
import accountingIcon from '../../assets/service-category-icons/accounting.png'
import businessRegistrationIcon from '../../assets/service-category-icons/business-registration.png'

export const serviceGroups = [
  {
    id: 'gst', title: 'GST Services', icon: 'fileCheck', categoryIcon: gstDocumentIcon, tone: 'blue', price: '2,500',
    cardSubtitle: 'Simplify Your GST Compliance',
    subtitle: 'End-to-end GST solutions for your business',
    summary: 'Complete GST registration, returns, refund and compliance support.',
    services: [
      ['GST Registration', 'New GSTIN in 3–5 working days with complete document assistance and HSN/SAC mapping.', 'fileCheck'],
      ['GST Return Filing', 'GSTR-1, GSTR-3B, GSTR-4, GSTR-9/9C filed on time, every time — with ITC reconciliation.', 'calendar'],
      ['GST Notice Handling', 'Expert replies to ASMT-10, DRC-01, scrutiny and demand notices. We represent you.', 'shield'],
      ['LUT & Refunds', 'Letter of Undertaking for exporters and end-to-end refund claim management.', 'returnArrow'],
      ['E-Way Bill & E-Invoicing', 'Setup, training and managed generation of e-way bills and IRN e-invoices.', 'truck'],
      ['GST Audit & Health Check', 'Annual compliance review to plug ITC leakages and avoid penalties before they happen.', 'searchCheck'],
    ],
  },
  {
    id: 'income-tax', title: 'Income Tax Services', icon: 'calculator', categoryIcon: taxCalculatorIcon, tone: 'green', price: '1,500',
    cardSubtitle: 'File Smart, Save More',
    subtitle: 'Accurate tax filing, planning and compliance support',
    summary: 'ITR filing, tax planning, TDS, notices and expert consultation.',
    services: [
      ['ITR Filing (All Forms)', 'ITR-1 to ITR-7 for salaried, business, capital gains, F&O and NRI taxpayers.', 'tax'],
      ['Tax Planning & Consultancy', 'Regime comparison, deduction optimisation and advance tax planning to legally save more.', 'wallet'],
      ['Income Tax Notices', 'Replies to 143(1), 139(9), 148 and scrutiny notices with expert representation.', 'shield'],
      ['TDS Return Filing', 'Quarterly 24Q/26Q filing, Form 16/16A generation and TDS compliance advisory.', 'calculator'],
      ['Capital Gains & Crypto', 'Accurate reporting of equity, property, F&O and VDA (crypto) gains with loss set-offs.', 'bolt'],
      ['Business Tax Compliance', 'Advance tax, presumptive taxation (44AD/44ADA) and books audit coordination.', 'building'],
    ],
  },
  {
    id: 'accounting', title: 'Accounting Services', icon: 'book', categoryIcon: accountingIcon, tone: 'purple', price: '3,500',
    cardSubtitle: 'Accurate Books, Brighter Business',
    subtitle: 'Reliable financial records and reporting for better decisions',
    summary: 'Bookkeeping, payroll, MIS reports and virtual CFO support.',
    services: [
      ['Bookkeeping', 'Daily/weekly/monthly books on Tally, Zoho or QuickBooks with clean reconciliations.', 'book'],
      ['Payroll Management', 'Salary processing, PF/ESI compliance, payslips and Form 16 — fully managed.', 'users'],
      ['Financial Reporting & MIS', 'P&L, balance sheet, cash-flow and custom MIS dashboards for smarter decisions.', 'barChart'],
      ['TDS Compliance', 'Deduction tracking, quarterly returns and challan reconciliation done for you.', 'calculator'],
      ['Virtual CFO', 'Budgeting, pricing, investor reporting and growth finance guidance on demand.', 'growthChart'],
      ['Software Migration', 'Move from Excel or legacy systems to Tally Prime / Zoho Books without data loss.', 'refresh'],
    ],
  },
  {
    id: 'registration', title: 'Business Registration', icon: 'building', categoryIcon: businessRegistrationIcon, tone: 'amber', price: '5,000',
    cardSubtitle: 'Start Today, Grow Tomorrow',
    subtitle: 'Start and structure your business with complete registration support',
    summary: 'Company, LLP, MSME, DSC, IEC and other business registrations.',
    services: [
      ['Private Limited Company Registration', 'Complete incorporation support for private limited companies.', 'building'],
      ['LLP Registration', 'Professional setup and registration support for LLPs.', 'fileCheck'],
      ['Partnership Firm Registration', 'Simple and compliant registration for partnership firms.', 'users'],
      ['MSME / Udyam Registration', 'Quick MSME recognition and Udyam registration support.', 'award'],
      ['Trade License', 'Assistance with local trade license application and compliance.', 'tax'],
      ['DSC Registration', 'Digital Signature Certificate application and registration.', 'shield'],
      ['IEC Registration', 'Import Export Code registration for international trade.', 'globe'],
      ['Business Compliance', 'Ongoing registrations and statutory compliance support.', 'fileCheck'],
    ],
  },
]

const serviceUploadFlowIds = {
  gst: 'gst-registration-return',
  'income-tax': 'income-tax-filing',
  accounting: 'accounting-bookkeeping',
  registration: 'company-registration-food-license',
}

const toolConfigs = {
  gst: {
    eyebrow: 'Free Tool', title: <>GST <em>Liability</em> Estimator</>,
    subtitle: 'Estimate your monthly output GST, input tax credit and net payable in seconds.',
    fields: [
      { key: 'sales', label: 'Monthly Sales (₹, excl. GST)', placeholder: 'e.g. 500000', icon: 'growthChart' },
      { key: 'purchases', label: 'Purchases with GST (₹)', placeholder: 'e.g. 300000', icon: 'wallet' },
      { key: 'rate', label: 'GST Rate', type: 'select', options: [5, 12, 18, 28], icon: 'calculator' },
    ],
    calculate: ({ sales, purchases, rate }) => {
      const output = (+sales || 0) * (+rate || 0) / 100
      const credit = (+purchases || 0) * (+rate || 0) / 100
      return [['Output GST', output], ['Input Tax Credit', credit], ['Net GST Payable', Math.max(0, output - credit)]]
    },
  },
  'income-tax': {
    eyebrow: 'Free Tool', title: <>Income Tax <em>Estimate</em></>,
    subtitle: 'Get a quick indicative tax estimate based on your taxable income and selected rate.',
    fields: [
      { key: 'income', label: 'Annual Income (₹)', placeholder: 'e.g. 1200000', icon: 'wallet' },
      { key: 'deductions', label: 'Eligible Deductions (₹)', placeholder: 'e.g. 150000', icon: 'fileCheck' },
      { key: 'rate', label: 'Indicative Tax Rate', type: 'select', options: [5, 10, 20, 30], icon: 'calculator' },
    ],
    calculate: ({ income, deductions, rate }) => {
      const taxable = Math.max(0, (+income || 0) - (+deductions || 0))
      const tax = taxable * (+rate || 0) / 100
      return [['Taxable Income', taxable], ['Estimated Tax', tax], ['Income After Tax', Math.max(0, (+income || 0) - tax)]]
    },
  },
  accounting: {
    eyebrow: 'Free Tool', title: <>Business <em>Profit</em> Calculator</>,
    subtitle: 'Understand your monthly profit, margin and expense position at a glance.',
    fields: [
      { key: 'revenue', label: 'Monthly Revenue (₹)', placeholder: 'e.g. 800000', icon: 'growthChart' },
      { key: 'expenses', label: 'Monthly Expenses (₹)', placeholder: 'e.g. 500000', icon: 'wallet' },
      { key: 'tax', label: 'Provision / Tax (₹)', placeholder: 'e.g. 50000', icon: 'calculator' },
    ],
    calculate: ({ revenue, expenses, tax }) => {
      const profit = (+revenue || 0) - (+expenses || 0) - (+tax || 0)
      const margin = (+revenue || 0) ? (profit / +revenue) * 100 : 0
      return [['Gross Revenue', +revenue || 0], ['Total Outflow', (+expenses || 0) + (+tax || 0)], ['Net Profit', profit, `${margin.toFixed(1)}% margin`]]
    },
  },
  registration: {
    eyebrow: 'Free Tool', title: <>Registration <em>Cost</em> Estimator</>,
    subtitle: 'Plan an indicative setup budget for your new business registration.',
    fields: [
      { key: 'government', label: 'Government Fees (₹)', placeholder: 'e.g. 7000', icon: 'building' },
      { key: 'professional', label: 'Professional Fees (₹)', placeholder: 'e.g. 5000', icon: 'advisor' },
      { key: 'addons', label: 'DSC / Other Add-ons (₹)', placeholder: 'e.g. 2000', icon: 'fileCheck' },
    ],
    calculate: ({ government, professional, addons }) => {
      const govt = +government || 0, pro = +professional || 0, extra = +addons || 0
      return [['Government Fees', govt], ['Service & Add-ons', pro + extra], ['Estimated Total', govt + pro + extra]]
    },
  },
}

const processConfigs = {
  gst: [
    ['Share GST Details', 'Send invoices, GSTIN and filing period details securely to our team.', 'fileCheck'],
    ['We Reconcile & File', 'Your sales, purchases and ITC are checked before the return is filed.', 'calculator'],
    ['Get Filing Proof', 'Acknowledgement, challan and filed return copies are shared with you.', 'shield'],
    ['Compliance Reminders', 'Get timely alerts for returns, payments and important GST deadlines.', 'bell'],
  ],
  'income-tax': [
    ['Share Income Details', 'Send Form 16, bank statements and income documents securely.', 'fileCheck'],
    ['Tax Review & Planning', 'We review deductions, select the right regime and prepare your return.', 'calculator'],
    ['Return Filed', 'Your ITR acknowledgement and computation are delivered to your inbox.', 'shield'],
    ['Ongoing Tax Support', 'Receive advance-tax reminders and expert help for notices or queries.', 'bell'],
  ],
  accounting: [
    ['Share Business Records', 'Upload invoices, bank statements and expense records securely.', 'fileCheck'],
    ['Books Are Updated', 'Transactions are classified, reconciled and reviewed by our accounting team.', 'book'],
    ['Receive Reports', 'Get accurate P&L, balance sheet and MIS reports for better decisions.', 'barChart'],
    ['Monthly Review', 'Regular updates and expert guidance keep your books continuously ready.', 'refresh'],
  ],
  registration: [
    ['Choose Your Structure', 'Tell us your business plan and we help select the suitable entity type.', 'building'],
    ['Submit Documents', 'Share identity, address and business documents through a simple checklist.', 'fileCheck'],
    ['Application Processing', 'Our experts prepare, submit and track your registration application.', 'shield'],
    ['Certificate & Support', 'Receive your registration documents with post-registration guidance.', 'award'],
  ],
}

const formatMoney = (value) => `${value < 0 ? '− ' : ''}₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

function ServiceTool({ groupId }) {
  const config = toolConfigs[groupId]
  const defaults = Object.fromEntries(config.fields.map((field) => [field.key, field.type === 'select' ? field.options[2] ?? field.options[0] : '']))
  const [values, setValues] = useState(defaults)
  const results = config.calculate(values)

  return (
    <section className="service-free-tool">
      <header><span><Icon name="calculator" />{config.eyebrow}</span><h2>{config.title}</h2><p>{config.subtitle}</p></header>
      <div className="service-tool-box">
        <div className="service-tool-fields">
          {config.fields.map((field) => <label key={field.key}><strong>{field.label}</strong><span><Icon name={field.icon} />{field.type === 'select'
            ? <select value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>{field.options.map((option) => <option key={option} value={option}>{option}%</option>)}</select>
            : <input min="0" inputMode="numeric" type="number" placeholder={field.placeholder} value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}/>}</span></label>)}
        </div>
        <div className="service-tool-results">
          {results.map(([label, value, note], index) => <article className={index === results.length - 1 ? 'primary' : ''} key={label}><i><Icon name={index === 0 ? 'fileCheck' : index === 1 ? 'returnArrow' : 'wallet'} /></i><div><small>{label}</small><strong>{formatMoney(value)}</strong>{note ? <b>{note}</b> : null}</div></article>)}
        </div>
        <p className="service-tool-note"><Icon name="shield" /> Indicative estimate only. Actual amount depends on applicable rules and eligibility — <strong>ask our experts for an exact computation.</strong></p>
      </div>
    </section>
  )
}

function ServiceProcess({ groupId }) {
  const steps = processConfigs[groupId]
  return (
    <section className="service-process-section">
      <header><span>How It Works</span><h2>A simple, <em>transparent</em> process</h2><i aria-hidden="true"/><p>We make compliance easy with a clear and hassle-free process.</p></header>
      <div className="service-process-grid">
        {steps.map(([title, description, icon], index) => <article key={title}>
          <i><Icon name={icon}/></i><b>{String(index + 1).padStart(2, '0')}</b><h3>{title}</h3><span/><p>{description}</p>
          {index < steps.length - 1 ? <strong aria-hidden="true"><Icon name="chevronDown" /></strong> : null}
        </article>)}
      </div>
      <div className="service-process-benefits">
        {[
          ['shield', '100% Secure', 'Your data is safe with us.'],
          ['clock', 'On-Time Delivery', 'Never miss a deadline.'],
          ['advisor', 'Expert Support', 'Experts by your side.'],
          ['fileCheck', 'End-to-End Service', 'We handle it all for you.'],
        ].map(([icon, title, text]) => <div key={title}><i><Icon name={icon}/></i><span><strong>{title}</strong><small>{text}</small></span></div>)}
      </div>
    </section>
  )
}

function Services() {
  const { requestService } = useServiceRequest()
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const requestedCategory = searchParams.get('category')
  const isKnownCategory = (category) => serviceGroups.some((group) => group.id === category)
  const [activeId, setActiveId] = useState(() => isKnownCategory(requestedCategory) ? requestedCategory : 'gst')
  const panelRef = useRef(null)
  const activeGroup = serviceGroups.find((group) => group.id === activeId) || serviceGroups[0]

  useEffect(() => {
    if (isKnownCategory(requestedCategory)) setActiveId(requestedCategory)
  }, [requestedCategory])

  useEffect(() => {
    const loaderTimer = window.setTimeout(() => setLoading(false), 250)
    return () => window.clearTimeout(loaderTimer)
  }, [])

  if (loading) {
    return <Loader fullScreen message="Loading services..." />
  }

  const selectCategory = (groupId) => {
    setActiveId(groupId)
    // Keep the category choices in view on phones. Scrolling the result panel to
    // the top pushed users past too much content in the compact mobile layout.
    if (window.matchMedia('(max-width: 700px)').matches) return
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const selectAdjacentCategory = (direction) => {
    const currentIndex = serviceGroups.findIndex((group) => group.id === activeId)
    const nextIndex = (currentIndex + direction + serviceGroups.length) % serviceGroups.length
    selectCategory(serviceGroups[nextIndex].id)
  }

  return (
    <div className="interactive-services-page">
      <header className="services-page-heading">
        <span>Our Services</span>
        <h1>Complete Tax &amp; Business Solutions</h1>
        <p>Expert solutions to keep your business compliant, efficient and growth-ready.</p>
      </header>

      <div className="service-category-carousel">
        <button aria-label="Previous service category" className="service-category-carousel-control previous" onClick={() => selectAdjacentCategory(-1)} type="button">
          <Icon name="chevronDown" />
        </button>
        <div aria-label="Service categories" className="service-category-tabs" role="tablist">
          {serviceGroups.map((group) => (
            <button aria-controls="service-category-panel" aria-selected={activeId === group.id}
              className={`service-category-tab service-category-tab-${group.tone}${activeId === group.id ? ' active' : ''}`}
              key={group.id} onClick={() => selectCategory(group.id)} role="tab" type="button">
              <i>{group.categoryIcon ? <img alt="" src={group.categoryIcon} /> : <Icon name={group.icon} />}</i>
              <span>{group.title}</span>
              <small aria-hidden="true" />
              <b aria-hidden="true">→</b>
            </button>
          ))}
        </div>
        <button aria-label="Next service category" className="service-category-carousel-control next" onClick={() => selectAdjacentCategory(1)} type="button">
          <Icon name="chevronDown" />
        </button>
        <div aria-label="Selected service category" className="service-category-pagination">
          {serviceGroups.map((group) => <button aria-label={`Show ${group.title}`} aria-pressed={activeId === group.id} className={activeId === group.id ? 'active' : ''} key={group.id} onClick={() => selectCategory(group.id)} type="button" />)}
        </div>
      </div>

      <section className={`service-category-panel service-category-panel-${activeGroup.tone}`} id="service-category-panel" ref={panelRef} role="tabpanel">
        <div className="service-category-title"><h2>{activeGroup.title}</h2><p>{activeGroup.subtitle}</p></div>
        <div className="service-detail-grid">
          {activeGroup.services.map(([title, description, icon], index) => (
            <article className={`service-detail-card service-detail-card-${(index % 8) + 1}`} key={title} onClick={() => requestService({ title, description, icon, price: activeGroup.price, flowId: serviceUploadFlowIds[activeGroup.id], documentType: activeGroup.id === 'registration' ? title : activeGroup.title === 'GST Services' ? 'GST Registration & Return' : activeGroup.id === 'income-tax' ? 'Income Tax Filing' : 'Accounting / Bookkeeping' })} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && requestService({ title, description, icon, price: activeGroup.price, flowId: serviceUploadFlowIds[activeGroup.id], documentType: activeGroup.id === 'registration' ? title : activeGroup.title === 'GST Services' ? 'GST Registration & Return' : activeGroup.id === 'income-tax' ? 'Income Tax Filing' : 'Accounting / Bookkeeping' })} role="button" tabIndex="0">
              <i><Icon name={icon} /></i>
              <div><h3>{title}</h3><p>{description}</p></div>
              <footer><strong>Learn More</strong><span aria-hidden="true">→</span></footer>
            </article>
          ))}
        </div>
      </section>

      <ServiceTool groupId={activeGroup.id} key={activeGroup.id} />
      <ServiceProcess groupId={activeGroup.id} />

      <aside className="services-confidence-strip">
        <i><Icon name="shield" /></i>
        <div><h2>Why Choose P.K Business Solutions?</h2><ul>
          <li><Icon name="advisor" /><span>Experienced<br />Professionals</span></li>
          <li><Icon name="clock" /><span>On-time<br />Delivery</span></li>
          <li><Icon name="fileCheck" /><span>100% Compliance<br />Assurance</span></li>
          <li><Icon name="headset" /><span>Dedicated Customer<br />Support</span></li>
        </ul></div>
      </aside>
    </div>
  )
}

export default Services
