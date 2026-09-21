import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatDateTime } from '../../lib/formatters.js'

function PreparedDocuments() {
  const [documents, setDocuments] = useState([])
  const [downloadingId, setDownloadingId] = useState('')
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    api.get('/api/admin/documents')
      .then(({ data }) => setDocuments(data.documents || []))
      .catch((error) => setStatus({ type: 'error', message: extractApiError(error) }))
      .finally(() => setLoading(false))
  }, [])

  const preparedDocuments = useMemo(
    () => documents.filter((document) => document.inputType !== 'text' && document.uploadedBy?.role === 'admin'),
    [documents],
  )

  const clientOptions = useMemo(() => {
    const users = new Map()

    preparedDocuments.forEach((document) => {
      if (document.user?._id) {
        users.set(document.user._id, document.user)
      }
    })

    return Array.from(users.values()).sort((left, right) =>
      String(left.name || '').localeCompare(String(right.name || '')),
    )
  }, [preparedDocuments])

  const serviceOptions = useMemo(
    () => Array.from(new Set(preparedDocuments.map((document) => document.serviceType).filter(Boolean))).sort(),
    [preparedDocuments],
  )

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return preparedDocuments.filter((document) => {
      if (clientFilter !== 'all' && document.user?._id !== clientFilter) {
        return false
      }

      if (serviceFilter !== 'all' && document.serviceType !== serviceFilter) {
        return false
      }

      if (statusFilter !== 'all' && document.status !== statusFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return [
        document.title,
        document.originalName,
        document.filename,
        document.serviceType,
        document.status,
        document.notes,
        document.user?._id,
        document.user?.name,
        document.user?.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [clientFilter, preparedDocuments, query, serviceFilter, statusFilter])

  const resetFilters = () => {
    setQuery('')
    setClientFilter('all')
    setServiceFilter('all')
    setStatusFilter('all')
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
    return <Loader message="Loading prepared documents..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Review files prepared by admin and shared with individual clients."
        eyebrow="Prepared Docs"
        title="Prepared Documents"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {preparedDocuments.length ? (
        <>
          <section className="panel admin-payment-filter-panel">
            <div className="admin-subpanel-head">
              <div>
                <span className="admin-surface-eyebrow">Filters</span>
                <h4>Find prepared files by client, service, status, or filename</h4>
              </div>
              <span className="admin-muted-text">{filteredDocuments.length} matching files</span>
            </div>

            <div className="admin-payment-toolbar prepared-documents-filter-toolbar">
              <label className="admin-payment-filter-wide">
                Search
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="File, client, email, service, note"
                  type="search"
                  value={query}
                />
              </label>
              <label>
                Client
                <select onChange={(event) => setClientFilter(event.target.value)} value={clientFilter}>
                  <option value="all">All clients</option>
                  {clientOptions.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name || user.email || user._id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Service
                <select onChange={(event) => setServiceFilter(event.target.value)} value={serviceFilter}>
                  <option value="all">All services</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="all">All statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <div className="admin-payment-filter-actions prepared-documents-filter-actions">
                <button className="button button-ghost button-compact" onClick={resetFilters} type="button">
                  Reset Filters
                </button>
              </div>
            </div>
          </section>

          {filteredDocuments.length ? (
            <section className="panel prepared-documents-table-wrap">
              <table className="prepared-documents-table">
                <colgroup>
                  <col className="prepared-col-file" />
                  <col className="prepared-col-client" />
                  <col className="prepared-col-service" />
                  <col className="prepared-col-status" />
                  <col className="prepared-col-shared" />
                  <col className="prepared-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Shared</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((document) => (
                    <tr key={document._id}>
                      <td>
                        <strong>{document.title || document.originalName || document.filename}</strong>
                        <span>{document.originalName || document.filename}</span>
                        {document.notes ? <small>{document.notes}</small> : null}
                      </td>
                      <td>
                        <strong>{document.user?.name || 'Unknown client'}</strong>
                        <span>{document.user?.email || document.user?._id || ''}</span>
                      </td>
                      <td>{document.serviceType || 'General'}</td>
                      <td><StatusBadge status={document.status} /></td>
                      <td>{formatDateTime(document.createdAt)}</td>
                      <td>
                        <div className="prepared-table-actions prepared-table-actions-stacked">
                          <button
                            className="button button-primary button-compact"
                            disabled={downloadingId === document._id}
                            onClick={() => handleDownload(document)}
                            type="button"
                          >
                            {downloadingId === document._id ? 'Downloading...' : 'Download'}
                          </button>
                          {document.fileUrl ? (
                            <a className="button button-ghost button-compact" href={document.fileUrl} rel="noreferrer" target="_blank">
                              Preview
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : (
            <EmptyState description="Try changing or resetting the filters." title="No matching prepared documents" />
          )}
        </>
      ) : (
        <EmptyState description="Prepared files sent from the payments page will appear here." title="No prepared documents yet" />
      )}
    </div>
  )
}

export default PreparedDocuments
