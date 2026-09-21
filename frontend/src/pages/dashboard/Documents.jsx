import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatDateTime } from '../../lib/formatters.js'
import { getServicePaymentEligibility } from '../../lib/paymentEligibility.js'
import { Icon } from '../public/Home.jsx'

function getGroupStatus(documents) {
  if (documents.some((document) => document.status === 'rejected')) {
    return 'rejected'
  }

  if (documents.some((document) => document.status === 'pending')) {
    return 'pending'
  }

  if (documents.some((document) => document.status === 'approved')) {
    return 'approved'
  }

  return documents[0]?.status || 'pending'
}

function getDocumentSessionKey(document) {
  const createdAt = document.createdAt ? new Date(document.createdAt) : null
  const timestamp = createdAt && !Number.isNaN(createdAt.getTime())
    ? createdAt.toISOString().slice(0, 16)
    : 'unknown-time'

  return `${document.serviceType || 'General'}-${timestamp}`
}

function groupDocumentsByServiceSession(documents) {
  const groups = []
  const lookup = new Map()

  for (const document of documents) {
    const key = getDocumentSessionKey(document)

    if (!lookup.has(key)) {
      const nextGroup = {
        key,
        serviceType: document.serviceType || 'General',
        createdAt: document.createdAt,
        documents: [],
      }
      lookup.set(key, nextGroup)
      groups.push(nextGroup)
    }

    lookup.get(key).documents.push(document)
  }

  return groups
    .map((group) => ({
      ...group,
      status: getGroupStatus(group.documents),
    }))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
}

function Documents() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [services, setServices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState('')
  const [openGroupKey, setOpenGroupKey] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadDocuments = async () => {
    const [{ data: documentsData }, { data: servicesData }, { data: paymentsData }] = await Promise.all([
      api.get('/api/documents'),
      api.get('/api/services'),
      api.get('/api/payments'),
    ])

    setDocuments(documentsData.documents || [])
    setServices(servicesData.services || [])
    setPayments(paymentsData.payments || [])
  }

  useEffect(() => {
    loadDocuments()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const userSubmittedDocuments = useMemo(
    () => documents.filter((document) => document.uploadedBy?.role !== 'admin'),
    [documents],
  )

  const summary = useMemo(() => {
    const nextSummary = {
      total: userSubmittedDocuments.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    }

    for (const document of userSubmittedDocuments) {
      if (document.status === 'pending') nextSummary.pending += 1
      if (document.status === 'approved') nextSummary.approved += 1
      if (document.status === 'rejected') nextSummary.rejected += 1
    }

    return nextSummary
  }, [userSubmittedDocuments])

  const historyGroups = useMemo(() => groupDocumentsByServiceSession(userSubmittedDocuments), [userSubmittedDocuments])

  const filteredHistoryGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return historyGroups
    return historyGroups.filter((group) =>
      [group.serviceType, ...group.documents.flatMap((document) => [document.title, document.originalName, document.documentType])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [historyGroups, searchQuery])

  const readyServiceByType = useMemo(() => {
    const lookup = new Map()

    for (const service of services) {
      const eligibility = getServicePaymentEligibility({ service, documents: userSubmittedDocuments, payments })

      if (eligibility.isReadyForPayment) {
        lookup.set(service.type, service)
      }
    }

    return lookup
  }, [payments, services, userSubmittedDocuments])

  const openPaymentForDocument = (document) => {
    const service = readyServiceByType.get(document.serviceType)

    if (!service) {
      return
    }

    navigate('/dashboard/payments', {
      state: {
        serviceId: service._id,
      },
    })
  }

  const handleDownload = async (document) => {
    setDownloadingId(document._id)

    try {
      await downloadFileFromApi(document.downloadUrl, document.originalName || document.filename)
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setDownloadingId('')
    }
  }

  if (loading) {
    return <Loader message="Loading documents..." />
  }

  return (
    <div className="page-stack documents-workspace-page">
      <PageHeader
        actions={(
          <div aria-hidden="true" className="document-center-hero-art">
            <span><Icon name="documentStack" /></span>
            <i><Icon name="download" /></i>
          </div>
        )}
        description="View all your uploaded documents, their status, and download them anytime."
        eyebrow="My Documents"
        title="Document Center"
      />

      <section className="document-summary-panel document-center-summary">
        <div className="document-summary-grid">
          <div className="document-stat-tile blue"><i><Icon name="taxFile" /></i>
            <strong>{summary.total}</strong>
            <span>Total files</span>
          </div>
          <div className="document-stat-tile gold"><i><Icon name="clock" /></i>
            <strong>{summary.pending}</strong>
            <span>Pending review</span>
          </div>
          <div className="document-stat-tile green"><i><Icon name="fileCheck" /></i>
            <strong>{summary.approved}</strong>
            <span>Approved</span>
          </div>
          <div className="document-stat-tile red"><i><Icon name="closeCircle" /></i>
            <strong>{summary.rejected}</strong>
            <span>Rejected</span>
          </div>
        </div>
      </section>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="panel document-center-list-panel">
        <div className="document-center-list-head">
          <div><h3>Your Documents</h3><p>All files you have uploaded or received from admin will appear here.</p></div>
          <label><Icon name="search" /><input aria-label="Search documents" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search documents..." type="search" value={searchQuery} /></label>
        </div>
      {filteredHistoryGroups.length ? (
        <section className="document-history-group">
          <div className="document-history-head document-history-meta-head">
            <div>
              <span className="eyebrow">History Group</span>
              <h3>Service-wise document history</h3>
            </div>
            <span className="list-meta">{filteredHistoryGroups.length} group(s)</span>
          </div>

          <div className="list-stack">
            {filteredHistoryGroups.map((group) => {
              const isOpen = openGroupKey === group.key

              return (
                <article className="document-record" key={group.key}>
                  <button
                    className="list-item stretch document-history-card-button"
                    onClick={() => setOpenGroupKey((current) => (current === group.key ? '' : group.key))}
                    type="button"
                  >
                    <div className="document-record-copy">
                      <div className="document-record-title">
                        <strong>{group.serviceType}</strong>
                        <StatusBadge status={group.status} />
                      </div>
                      <p>{formatDateTime(group.createdAt)}</p>
                    </div>
                    <div className="list-meta-group">
                      <span>{group.documents.length} document(s)</span>
                      <span>{isOpen ? 'Hide details' : 'View details'}</span>
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="list-stack">
                      {group.documents.map((document) => (
                        <div className="document-record" key={document._id}>
                  {(() => {
                    const readyService = readyServiceByType.get(document.serviceType)

                    return (
                      <>
                  <div className="list-item stretch">
                    <div className="document-record-copy">
                      <div className="document-record-title">
                        <strong>
                          {document.inputType === 'text'
                            ? document.title
                            : document.originalName || document.filename}
                        </strong>
                        <StatusBadge status={document.status} />
                      </div>
                      <p>{document.documentType || document.title}</p>
                    </div>

                    <div className="document-actions">
                      {document.status === 'approved' && readyService ? (
                        <button
                          className="button button-primary button-compact"
                          onClick={() => openPaymentForDocument(document)}
                          type="button"
                        >
                          Ready to Pay
                        </button>
                      ) : null}
                      {document.inputType === 'text' ? null : (
                      <>
                      <button
                        className="button button-primary button-compact"
                        disabled={downloadingId === document._id}
                        onClick={() => handleDownload(document)}
                        type="button"
                      >
                        {downloadingId === document._id ? 'Downloading...' : 'Download'}
                      </button>
                      {document.fileUrl ? (
                      <a
                        className="button button-ghost button-compact"
                        href={document.fileUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Preview
                      </a>
                      ) : null}
                      </>
                      )}
                    </div>
                  </div>

                  {document.inputType === 'text' && document.textValue ? (
                    <p className="document-remarks">Submitted detail: {document.textValue}</p>
                  ) : null}

                  <div className="detail-row document-meta-row">
                    <span>Upload date: {formatDateTime(document.createdAt)}</span>
                    <span>Service: {document.serviceType || 'General'}</span>
                    <span>
                      {document.uploadedBy?.role === 'admin'
                        ? `Shared by ${document.uploadedBy.name}`
                        : 'Submitted by you'}
                    </span>
                  </div>

                  <div className="detail-row document-meta-row">
                    <span>{document.reviewedAt ? `Reviewed ${formatDateTime(document.reviewedAt)}` : 'Not reviewed yet'}</span>
                    <span>{document.reviewedBy?.name ? `Reviewed by ${document.reviewedBy.name}` : 'Awaiting admin action'}</span>
                  </div>

                  {document.notes ? <p className="document-remarks muted">Your note: {document.notes}</p> : null}

                  {document.remarks ? (
                    <p className="document-remarks">Admin remarks: {document.remarks}</p>
                  ) : (
                    <p className="document-remarks muted">No review remarks added yet.</p>
                  )}
                      </>
                    )
                  })()}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <EmptyState description={searchQuery ? 'Try a different document name or service.' : 'Uploaded files will appear here with their status, upload date, and download options.'} icon={<Icon name="taxFile" />} title={searchQuery ? 'No matching documents' : 'No documents yet'} />
      )}
      </section>

      <section className="document-support-strip">
        <span><Icon name="headset" /></span>
        <div><strong>Need Help?</strong><p>If you face any issue while uploading or accessing documents, feel free to contact our support team.</p></div>
        <a href="/contact">Contact Support <Icon name="arrowRight" /></a>
      </section>
    </div>
  )
}

export default Documents
