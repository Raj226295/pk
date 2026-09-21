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
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    api.get('/api/documents')
      .then(({ data }) => setDocuments(data.documents || []))
      .catch((error) => setStatus({ type: 'error', message: extractApiError(error) }))
      .finally(() => setLoading(false))
  }, [])

  const preparedDocuments = useMemo(
    () => documents.filter((document) => document.inputType !== 'text' && document.uploadedBy?.role === 'admin'),
    [documents],
  )

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

  return (
    <div className="page-stack">
      <PageHeader
        description="Files prepared and shared by the admin team appear here after payment verification."
        eyebrow="Prepared Documents"
        title="Prepared Documents"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {preparedDocuments.length ? (
        <section className="panel prepared-documents-table-wrap">

          {/* ── Desktop table ── */}
          <table className="prepared-documents-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Service</th>
                <th>Status</th>
                <th>Shared</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {preparedDocuments.map((document) => (
                <tr key={document._id}>
                  <td>
                    <strong>{document.title || document.originalName || document.filename}</strong>
                    <span>{document.originalName || document.filename}</span>
                    {document.notes ? <small>{document.notes}</small> : null}
                  </td>
                  <td>{document.serviceType || 'General'}</td>
                  <td><StatusBadge status={document.status} /></td>
                  <td>{formatDateTime(document.createdAt)}</td>
                  <td>
                    <div className="prepared-table-actions">
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

          {/* ── Mobile cards ── */}
          <div className="prepared-documents-cards">
            {preparedDocuments.map((document) => (
              <div className="prepared-document-card" key={document._id}>

                <div className="prepared-document-card-header">
                  <div className="prepared-document-card-info">
                    <strong>{document.title || document.originalName || document.filename}</strong>
                    <span>{document.originalName || document.filename}</span>
                    {document.notes ? <small>{document.notes}</small> : null}
                  </div>
                  <StatusBadge status={document.status} />
                </div>

                <div className="prepared-document-card-meta">
                  <div className="prepared-document-card-meta-item">
                    <p>Service</p>
                    <span>{document.serviceType || 'General'}</span>
                  </div>
                  <div className="prepared-document-card-meta-item">
                    <p>Shared</p>
                    <span>{formatDateTime(document.createdAt)}</span>
                  </div>
                </div>

                <div className="prepared-table-actions">
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

              </div>
            ))}
          </div>

        </section>
      ) : (
        <EmptyState description="Prepared files shared by admin will appear here." title="No prepared documents yet" />
      )}
    </div>
  )
}

export default PreparedDocuments