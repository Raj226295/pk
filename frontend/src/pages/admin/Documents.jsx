import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import AdminIcon from '../../components/admin/AdminIcon.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatDate, formatDateTime } from '../../lib/formatters.js'

function Documents() {
  const navigate = useNavigate()
  const { userId: routeUserId = '' } = useParams()
  const [documents, setDocuments] = useState([])
  const [influencerSubmissions, setInfluencerSubmissions] = useState([])
  const [folders, setFolders] = useState([])
  const [users, setUsers] = useState([])
  const [activeUserId, setActiveUserId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [folderSearch, setFolderSearch] = useState('')
  const [downloadingId, setDownloadingId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [approvingId, setApprovingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const filterLabels = {
    all: 'All Documents',
    pending: 'Needs Review',
    approved: 'Reviewed',
    rejected: 'Rejected',
  }

  const isFolderDetailPage = Boolean(routeUserId)

  const loadData = useCallback(async () => {
    const [{ data: documentsData }, { data: usersData }] = await Promise.all([
      api.get('/api/admin/documents'),
      api.get('/api/admin/users'),
    ])

    const clientUsers = (usersData.users || []).filter((user) => user.role !== 'admin')
    setDocuments(documentsData.documents || [])
    setInfluencerSubmissions(documentsData.influencerSubmissions || [])
    setFolders(documentsData.folders || [])
    setUsers(clientUsers)
    setActiveUserId((current) => {
      if (routeUserId && clientUsers.some((user) => user._id === routeUserId)) {
        return routeUserId
      }

      if (clientUsers.some((user) => user._id === current)) {
        return current
      }

      return clientUsers[0]?._id || ''
    })
  }, [routeUserId])

  useEffect(() => {
    loadData()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [loadData])

  const folderCards = useMemo(() => {
    const userLookup = new Map(users.map((user) => [user._id, user]))

    return folders
      .map((folder) => {
        const user = userLookup.get(folder.userId)

        if (!user) {
          return null
        }

        return {
          userId: folder.userId,
          user,
          totalFiles: folder.documentCount || 0,
          pendingCount: folder.pendingCount || 0,
          approvedCount: folder.approvedCount || 0,
          rejectedCount: folder.rejectedCount || 0,
          lastUploadDate: folder.lastSubmittedAt || '',
        }
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (!left.lastUploadDate && !right.lastUploadDate) return left.user.name.localeCompare(right.user.name)
        if (!left.lastUploadDate) return 1
        if (!right.lastUploadDate) return -1
        return new Date(right.lastUploadDate) - new Date(left.lastUploadDate)
      })
  }, [folders, users])

  const activeFolder = useMemo(
    () => folderCards.find((folder) => folder.userId === activeUserId) || null,
    [activeUserId, folderCards],
  )

  const visibleFolderCards = useMemo(() => {
    const query = folderSearch.trim().toLowerCase()
    if (!query) return folderCards
    return folderCards.filter((folder) => folder.user.name.toLowerCase().includes(query) || folder.user.email.toLowerCase().includes(query))
  }, [folderCards, folderSearch])

  useEffect(() => {
    if (!routeUserId) {
      return
    }

    if (folderCards.some((folder) => folder.userId === routeUserId)) {
      setActiveUserId(routeUserId)
    }
  }, [folderCards, routeUserId])

  const activeDocuments = useMemo(() => {
    return documents.filter((document) => {
      const matchesUser = document.user?._id === activeFolder?.userId
      const matchesStatus = statusFilter === 'all' || document.status === statusFilter
      return matchesUser && matchesStatus
    })
  }, [activeFolder, documents, statusFilter])

  const activeInfluencerSubmissions = useMemo(
    () => influencerSubmissions.filter((submission) => submission.userId === activeFolder?.userId),
    [activeFolder, influencerSubmissions],
  )

  const documentsById = useMemo(
    () => new Map(documents.map((document) => [document._id, document])),
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

  const handleDelete = async (document) => {
    if (!window.confirm(`Delete ${document.originalName || document.filename}? This action cannot be undone.`)) {
      return
    }

    setDeletingId(document._id)

    try {
      await api.delete(`/api/admin/documents/${document._id}`)
      await loadData()
      setStatus({
        type: 'success',
        message: `${document.originalName || document.filename} deleted successfully.`,
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setDeletingId('')
    }
  }

  const handleApprove = async (document) => {
    setApprovingId(document._id)

    try {
      await api.patch(`/api/admin/documents/${document._id}`, {
        status: 'approved',
        remarks: document.remarks || 'Approved by admin.',
      })
      await loadData()
      setStatus({
        type: 'success',
        message: `${document.title || document.originalName || 'Document'} approved. Payment will open when all service documents are approved.`,
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setApprovingId('')
    }
  }

  if (loading) {
    return <Loader message="Loading client folders..." />
  }

  if (isFolderDetailPage && !activeFolder) {
    return (
      <div className="page-stack">
        <PageHeader
          description="The selected folder could not be found."
          eyebrow="My Folder"
          title="Folder Not Found"
        />
        <button className="button button-ghost button-compact" onClick={() => navigate('/admin/folders')} type="button">
          Back To Folders
        </button>
        <EmptyState
          description="Please go back to the folder list and choose a valid client folder."
          title="Folder not available"
        />
      </div>
    )
  }

  return (
    <div className={`page-stack${isFolderDetailPage ? '' : ' admin-folders-page'}`}>
      {isFolderDetailPage ? (
        <PageHeader description="Preview, share, download, and delete files from this dedicated client folder." eyebrow="My Folder" title={`${activeFolder.user.name} Folder`} />
      ) : (
        <>
          <nav aria-label="Breadcrumb" className="admin-overview-breadcrumb admin-folders-breadcrumb">
            <AdminIcon name="overview" size={17}/><span>Admin Workspace</span><b>›</b><strong>My Folder</strong>
          </nav>
          <section className="admin-folders-hero">
            <div><span className="admin-surface-eyebrow">Admin Workspace</span><h1>My Folder</h1><p>Access and manage client folders. Click on any folder to open and view its details.</p></div>
            <div aria-hidden="true" className="admin-folders-art"><span className="admin-folders-paper"><i/><i/><i/></span><span className="admin-folders-icon"><AdminIcon name="folder" size={58} strokeWidth={1.5}/></span><div><strong>Organized Access</strong><span>Keep all client documents<br/>well organized and easily<br/>accessible.</span></div></div>
          </section>
        </>
      )}

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {!isFolderDetailPage ? (
        <>
          <section className="panel admin-folders-browser">
            <div className="admin-folders-toolbar">
              <label className="admin-search-field"><AdminIcon name="search" size={18}/><input onChange={(event) => setFolderSearch(event.target.value)} placeholder="Search folders by client name..." type="search" value={folderSearch}/></label>
              <select defaultValue="all"><option value="all">All Clients</option></select>
              <button className="admin-new-folder-button" onClick={() => navigate('/admin/users')} type="button"><b>＋</b> New Folder</button>
            </div>
          {visibleFolderCards.length ? (
          <section className="admin-folder-grid admin-folders-grid-refined">
            {visibleFolderCards.map((folder) => (
              <button
                className="admin-folder-card"
                key={folder.userId}
                onClick={() => navigate(`/admin/folders/${folder.userId}`)}
                type="button"
              >
                <div className="admin-folder-card-head">
                  <UserAvatar alt={`${folder.user.name} profile`} className="admin-folder-avatar" user={folder.user} />
                  <div>
                    <strong>{folder.user.name}</strong>
                    <span>{folder.user.name} Folder</span>
                    <span>{folder.user.email}</span>
                  </div>
                </div>
                <div className="admin-folder-card-stats">
                  <span>{folder.totalFiles} files</span>
                  <span>{folder.pendingCount} updates</span>
                </div>
                <small>
                  {folder.lastUploadDate ? `Last upload ${formatDate(folder.lastUploadDate)}` : 'Folder ready for first file'}
                </small>
              </button>
            ))}
          </section>
          ) : (
            <div className="admin-folders-empty"><i><AdminIcon name="folder" size={35} strokeWidth={1.8}/></i><h3>No folders yet</h3><p>Client folders will appear here once client accounts are added.</p><button onClick={() => navigate('/admin/users')} type="button"><AdminIcon name="check" size={18}/> Add Client Folder</button></div>
          )}
          </section>
          <aside className="admin-folders-tip"><i>💡</i><div><strong>Tip</strong><span>Folders help you keep client documents, communications, and history organized in one place.</span></div></aside>
        </>
      ) : (
        <>
          <button className="button button-ghost button-compact" onClick={() => navigate('/admin/folders')} type="button">
            Back To Folders
          </button>

          <section className="panel admin-folder-detail">
            <div className="admin-folder-detail-head">
              <div>
                <span className="admin-surface-eyebrow">Selected Folder</span>
                <h3>{activeFolder.user.name}</h3>
                <p>{activeFolder.user.email}</p>
              </div>

              <div className="admin-folder-filter-row">
                <div className="admin-folder-summary-pill">{activeFolder.totalFiles} total files</div>
                <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="all">{filterLabels.all}</option>
                  <option value="pending">{filterLabels.pending}</option>
                  <option value="approved">{filterLabels.approved}</option>
                  <option value="rejected">{filterLabels.rejected}</option>
                </select>
              </div>
            </div>

            <div className="admin-preview-metric-grid">
              <article className="admin-preview-metric">
                <span>Total Files</span>
                <strong>{activeFolder.totalFiles}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Needs Review</span>
                <strong>{activeFolder.pendingCount}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Reviewed</span>
                <strong>{activeFolder.approvedCount}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Last Upload</span>
                <strong>{activeFolder.lastUploadDate ? formatDate(activeFolder.lastUploadDate) : 'N/A'}</strong>
              </article>
            </div>

            {activeDocuments.length ? (
              <div className="admin-folder-file-list">
                {activeDocuments.map((document) => (
                  <article className="admin-folder-file-row" key={document._id}>
                    <div>
                      <div className="admin-record-title-row">
                        <strong>{document.documentType || document.title}</strong>
                        <StatusBadge status={document.status} />
                      </div>
                      <p>
                        {document.inputType === 'text'
                          ? document.textValue || 'Text details submitted'
                          : document.originalName || document.filename}
                      </p>
                      <div className="admin-meta-row">
                        <span>Service: {document.serviceType}</span>
                        <span>Uploaded: {formatDateTime(document.createdAt)}</span>
                      </div>
                      <div className="admin-meta-row">
                        <span>
                          {document.uploadedBy?.role === 'admin'
                            ? `Shared by ${document.uploadedBy.name}`
                            : 'Submitted by user'}
                        </span>
                        <span>{document.reviewedAt ? `Reviewed ${formatDateTime(document.reviewedAt)}` : 'Not reviewed yet'}</span>
                      </div>
                      {document.notes ? <p className="admin-client-note">Note: {document.notes}</p> : null}
                    </div>

                    <div className="admin-record-actions">
                      {document.status !== 'approved' ? (
                        <button
                          className="button button-primary button-compact"
                          disabled={approvingId === document._id}
                          onClick={() => handleApprove(document)}
                          type="button"
                        >
                          {approvingId === document._id ? 'Approving...' : 'Approve'}
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
                      <a className="button button-ghost button-compact" href={document.fileUrl} rel="noreferrer" target="_blank">
                        Preview
                      </a>
                      ) : null}
                      </>
                      )}
                      <button
                        className="button button-danger button-compact"
                        disabled={deletingId === document._id}
                        onClick={() => handleDelete(document)}
                        type="button"
                      >
                        {deletingId === document._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                description={
                  statusFilter === 'all'
                    ? 'This folder is ready. Add the first file from the form above.'
                    : `No ${filterLabels[statusFilter] || 'matching'} documents were found in this folder.`
                }
                title="No files to show"
              />
            )}

            {activeInfluencerSubmissions.length ? (
              <section className="admin-folder-submissions">
                <div className="admin-folder-submissions-head">
                  <div>
                    <span className="admin-surface-eyebrow">Booking details</span>
                    <h4>Influencer booking submissions</h4>
                  </div>
                  <span>{activeInfluencerSubmissions.length} submission{activeInfluencerSubmissions.length === 1 ? '' : 's'}</span>
                </div>
                {activeInfluencerSubmissions.map((submission) => (
                  <article className="admin-folder-submission" key={submission._id}>
                    <div className="admin-record-title-row">
                      <strong>{submission.type}</strong>
                      <StatusBadge status={submission.status} />
                    </div>
                    <p className="admin-folder-submission-date">Submitted: {formatDateTime(submission.createdAt)}</p>
                    <dl className="admin-submission-fields">
                      {submission.submittedFields.map((field, index) => {
                        const document = field.documentId ? documentsById.get(field.documentId) : null
                        return (
                          <div key={`${submission._id}-${field.label}-${index}`}>
                            <dt>{field.label}</dt>
                            <dd>
                              {document ? (
                                document.fileUrl ? <a href={document.fileUrl} rel="noreferrer" target="_blank">{document.originalName || document.filename || 'View uploaded file'}</a> : (document.originalName || document.filename || 'Uploaded file')
                              ) : (field.valueText || '—')}
                            </dd>
                          </div>
                        )
                      })}
                    </dl>
                    {submission.notes ? <p className="admin-client-note">Note: {submission.notes}</p> : null}
                    {submission.adminRemarks ? <p className="admin-client-note">Admin remark: {submission.adminRemarks}</p> : null}
                  </article>
                ))}
              </section>
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}

export default Documents
