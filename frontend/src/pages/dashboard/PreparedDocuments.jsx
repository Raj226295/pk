import { useCallback, useEffect, useMemo, useState } from 'react'
import Loader from '../../components/common/Loader.jsx'
import { Icon } from '../public/Home.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'

const documentName = (document) => document.title || document.originalName || document.filename || 'Prepared document'

function documentType(document) {
  const name = document.originalName || document.filename || ''
  const extension = name.split('.').pop()?.toUpperCase()
  return extension && extension !== name.toUpperCase() ? extension : document.mimeType === 'application/pdf' ? 'PDF' : 'FILE'
}

function serviceTone(service = '') {
  const name = service.toLowerCase()
  if (name.includes('income')) return 'income'
  if (name.includes('account')) return 'accounting'
  if (name.includes('registration') || name.includes('company')) return 'registration'
  return 'tax'
}

function dateParts(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return { date: '—', time: '' }
  return {
    date: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(date),
  }
}

function PreparedDocuments() {
  const [documents, setDocuments] = useState([])
  const [downloadingId, setDownloadingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [query, setQuery] = useState('')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setStatus({ type: '', message: '' })
    try {
      const { data } = await api.get('/api/documents')
      setDocuments(data.documents || [])
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const preparedDocuments = useMemo(
    () => documents.filter((document) => document.inputType !== 'text' && document.uploadedBy?.role === 'admin'),
    [documents],
  )
  const serviceOptions = useMemo(
    () => Array.from(new Set(preparedDocuments.map((document) => document.serviceType).filter(Boolean))).sort(),
    [preparedDocuments],
  )
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return preparedDocuments.filter((document) => {
      const matchesSearch = !normalizedQuery || [documentName(document), document.originalName, document.filename, document.serviceType, document.createdAt].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery))
      return matchesSearch && (serviceFilter === 'all' || document.serviceType === serviceFilter) && (statusFilter === 'all' || document.status === statusFilter)
    }).sort((left, right) => {
      const delta = new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
      return sortOrder === 'oldest' ? -delta : delta
    })
  }, [preparedDocuments, query, serviceFilter, statusFilter, sortOrder])

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

  if (loading) return <Loader message="Loading prepared documents..." />

  return <div className="page-stack prepared-documents-page">
    <section className="prepared-documents-hero">
      <div><span className="eyebrow">Client Workspace</span><h1>Prepared <em>Documents</em></h1><p>Access and download your prepared documents shared by our team.</p></div>
    </section>

    {status.message ? <div className={`prepared-documents-notice ${status.type}`}><span><Icon name="closeCircle" /></span><p>{status.message}</p><button onClick={loadDocuments} type="button">Retry</button></div> : null}

    <section className="prepared-documents-filter-card" aria-label="Prepared document filters">
      <label className="prepared-search"><Icon name="search" /><input onChange={(event) => setQuery(event.target.value)} placeholder="Search documents by name, service or date..." type="search" value={query} /></label>
      <label><span className="sr-only">Service</span><select onChange={(event) => setServiceFilter(event.target.value)} value={serviceFilter}><option value="all">All Services</option>{serviceOptions.map((service) => <option key={service} value={service}>{service}</option>)}</select></label>
      <label><span className="sr-only">Status</span><select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="all">All Status</option><option value="approved">Ready</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></label>
      <label className="prepared-sort"><Icon name="calendar" /><select onChange={(event) => setSortOrder(event.target.value)} value={sortOrder}><option value="newest">Date (Newest)</option><option value="oldest">Date (Oldest)</option></select></label>
    </section>

    <section className="prepared-documents-table-card">
      {filteredDocuments.length ? <>
        <table className="prepared-documents-table prepared-documents-premium-table"><thead><tr><th>#</th><th>Document Name</th><th>Service</th><th>Prepared On</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredDocuments.map((document, index) => {
          const date = dateParts(document.createdAt)
          const state = document.status === 'rejected' ? 'Rejected' : document.status === 'pending' ? 'Pending' : 'Ready'
          return <tr key={document._id}><td className="prepared-index">{index + 1}</td><td><div className="prepared-document-name"><span className="prepared-file-icon"><Icon name="fileCheck" /></span><div><strong>{documentName(document)}</strong><small>{documentType(document)} · Shared file</small></div></div></td><td><span className={`prepared-service-badge ${serviceTone(document.serviceType)}`}>{document.serviceType || 'General'}</span></td><td><div className="prepared-date"><strong>{date.date}</strong><small>{date.time}</small></div></td><td><span className={`prepared-ready-pill ${state.toLowerCase()}`}><i />{state}</span></td><td><div className="prepared-table-actions"><button className="prepared-download-button" disabled={downloadingId === document._id} onClick={() => handleDownload(document)} type="button"><Icon name="download" />{downloadingId === document._id ? 'Downloading...' : 'Download'}</button>{document.fileUrl ? <a aria-label={`Preview ${documentName(document)}`} className="prepared-more-button" href={document.fileUrl} rel="noreferrer" target="_blank">⋮</a> : null}</div></td></tr>
        })}</tbody></table>
        <div className="prepared-documents-cards">{filteredDocuments.map((document) => {
          const date = dateParts(document.createdAt)
          const state = document.status === 'pending' ? 'Pending' : document.status === 'rejected' ? 'Rejected' : 'Ready'
          return <article className="prepared-document-card" key={document._id}><header><span className="prepared-file-icon"><Icon name="fileCheck" /></span><div><strong>{documentName(document)}</strong><small>{documentType(document)} · Shared file</small></div></header><div className="prepared-mobile-meta"><span className={`prepared-service-badge ${serviceTone(document.serviceType)}`}>{document.serviceType || 'General'}</span><span><Icon name="calendar" />{date.date}</span><span className={`prepared-ready-pill ${state.toLowerCase()}`}><i />{state}</span></div><button className="prepared-download-button" disabled={downloadingId === document._id} onClick={() => handleDownload(document)} type="button"><Icon name="download" />{downloadingId === document._id ? 'Downloading...' : 'Download'}</button></article>
        })}</div>
        <footer className="prepared-table-footer"><span>Showing 1–{filteredDocuments.length} of {filteredDocuments.length} documents</span><div><button disabled type="button">‹</button><b>1</b><button disabled type="button">›</button></div></footer>
      </> : <div className="prepared-empty-state"><Icon name="documentStack" /><strong>{preparedDocuments.length ? 'No matching prepared documents' : 'No prepared documents yet'}</strong><span>{preparedDocuments.length ? 'Try changing a filter or search phrase.' : 'Documents shared by our team will appear here.'}</span></div>}
    </section>
  </div>
}

export default PreparedDocuments
