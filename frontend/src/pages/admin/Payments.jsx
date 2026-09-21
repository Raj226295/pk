import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Skeleton from '../../components/common/Skeleton.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import AdminIcon from '../../components/admin/AdminIcon.jsx'
import { useConfirm } from '../../context/ConfirmContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { openFileFromApi } from '../../lib/downloads.js'
import { formatCurrency, formatDateTime } from '../../lib/formatters.js'
import { exportCsv } from '../../lib/exportCsv.js'

const allowedFilters = new Set(['all', 'pending', 'verified', 'rejected', 'paid', 'manual', 'online'])

const initialSummary = {
  total: 0,
  totalEarnings: 0,
  pendingAmount: 0,
  rejectedAmount: 0,
  pending: 0,
  verified: 0,
  rejected: 0,
  manual: 0,
  online: 0,
}

function createPaymentDraft(payment = null) {
  return {
    status: payment?.status || 'pending',
    verificationStatus: payment?.verificationStatus || 'pending',
    amount: String(payment?.amount ?? 0),
    paymentMethod: payment?.paymentMethod || 'manual',
    transactionId: payment?.transactionId || '',
    description: payment?.description || '',
    reviewRemarks: payment?.reviewRemarks || '',
  }
}

function matchesFilter(payment, filter) {
  if (filter === 'all') {
    return true
  }

  if (filter === 'manual' || filter === 'online') {
    return payment.paymentMethod === filter
  }

  return payment.status === filter || payment.verificationStatus === filter
}

function Payments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [summary, setSummary] = useState(initialSummary)
  const [selectedPaymentId, setSelectedPaymentId] = useState('')
  const [updates, setUpdates] = useState({})
  const [preparedFileDrafts, setPreparedFileDrafts] = useState({})
  const [preparedFileInputKeys, setPreparedFileInputKeys] = useState({})
  const [workingKey, setWorkingKey] = useState('')
  const [query, setQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [paymentQuery, setPaymentQuery] = useState('')
  const [selectedUserFilter, setSelectedUserFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filter, setFilter] = useState(() => {
    const requestedFilter = searchParams.get('filter') || 'all'
    return allowedFilters.has(requestedFilter) ? requestedFilter : 'all'
  })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })
  const { confirm } = useConfirm()
  const { showToast } = useToast()

  useEffect(() => {
    const requestedFilter = searchParams.get('filter') || 'all'
    const nextFilter = allowedFilters.has(requestedFilter) ? requestedFilter : 'all'

    setFilter((current) => (current === nextFilter ? current : nextFilter))
  }, [searchParams])

  const loadPayments = async () => {
    const { data } = await api.get('/api/admin/payments')
    const nextPayments = data.payments || []

    setPayments(nextPayments)
    setSummary({ ...initialSummary, ...(data.summary || {}) })
    setSelectedPaymentId((current) =>
      nextPayments.some((payment) => payment._id === current) ? current : nextPayments[0]?._id || '',
    )
  }

  useEffect(() => {
    loadPayments()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredPayments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const normalizedUserQuery = userQuery.trim().toLowerCase()
    const normalizedPaymentQuery = paymentQuery.trim().toLowerCase()
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null

    return payments.filter((payment) => {
      if (!matchesFilter(payment, filter)) {
        return false
      }

      if (selectedUserFilter !== 'all' && payment.user?._id !== selectedUserFilter) {
        return false
      }

      if (serviceFilter !== 'all' && payment.serviceType !== serviceFilter) {
        return false
      }

      if (methodFilter !== 'all' && payment.paymentMethod !== methodFilter) {
        return false
      }

      if (verificationFilter !== 'all' && payment.verificationStatus !== verificationFilter) {
        return false
      }

      if (fromTime !== null || toTime !== null) {
        const createdTime = payment.createdAt ? new Date(payment.createdAt).getTime() : Number.NaN

        if (Number.isNaN(createdTime)) {
          return false
        }

        if (fromTime !== null && createdTime < fromTime) {
          return false
        }

        if (toTime !== null && createdTime > toTime) {
          return false
        }
      }

      if (!normalizedQuery) {
        if (normalizedUserQuery) {
          const userMatched = [
            payment.user?._id,
            payment.user?.name,
            payment.user?.email,
            payment.user?.phone,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedUserQuery))

          if (!userMatched) {
            return false
          }
        }

        if (normalizedPaymentQuery) {
          return [
            payment._id,
            payment.invoiceNumber,
            payment.transactionId,
            payment.razorpayOrderId,
            payment.razorpayPaymentId,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedPaymentQuery))
        }

        return true
      }

      const broadMatched = [
        payment._id,
        payment.invoiceNumber,
        payment.serviceType,
        payment.transactionId,
        payment.razorpayOrderId,
        payment.razorpayPaymentId,
        payment.user?._id,
        payment.user?.name,
        payment.user?.email,
        payment.user?.phone,
        payment.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))

      if (!broadMatched) {
        return false
      }

      if (normalizedUserQuery) {
        const userMatched = [
          payment.user?._id,
          payment.user?.name,
          payment.user?.email,
          payment.user?.phone,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedUserQuery))

        if (!userMatched) {
          return false
        }
      }

      if (normalizedPaymentQuery) {
        return [
          payment._id,
          payment.invoiceNumber,
          payment.transactionId,
          payment.razorpayOrderId,
          payment.razorpayPaymentId,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedPaymentQuery))
      }

      return true
    })
  }, [
    dateFrom,
    dateTo,
    filter,
    methodFilter,
    paymentQuery,
    payments,
    query,
    selectedUserFilter,
    serviceFilter,
    userQuery,
    verificationFilter,
  ])

  const userFilterOptions = useMemo(() => {
    const usersById = new Map()

    payments.forEach((payment) => {
      if (payment.user?._id) {
        usersById.set(payment.user._id, payment.user)
      }
    })

    return Array.from(usersById.values()).sort((left, right) =>
      String(left.name || '').localeCompare(String(right.name || '')),
    )
  }, [payments])

  const serviceFilterOptions = useMemo(
    () => Array.from(new Set(payments.map((payment) => payment.serviceType).filter(Boolean))).sort(),
    [payments],
  )

  const selectedPayment = useMemo(
    () => payments.find((payment) => payment._id === selectedPaymentId) || filteredPayments[0] || null,
    [filteredPayments, payments, selectedPaymentId],
  )

  const selectedDraft = selectedPayment
    ? updates[selectedPayment._id] || createPaymentDraft(selectedPayment)
    : createPaymentDraft()

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter)
    setSearchParams(nextFilter === 'all' ? {} : { filter: nextFilter })
  }

  const resetAdvancedFilters = () => {
    setQuery('')
    setUserQuery('')
    setPaymentQuery('')
    setSelectedUserFilter('all')
    setServiceFilter('all')
    setMethodFilter('all')
    setVerificationFilter('all')
    setDateFrom('')
    setDateTo('')
    handleFilterChange('all')
  }

  const updateField = (payment, field, value) => {
    setUpdates((current) => ({
      ...current,
      [payment._id]: {
        ...createPaymentDraft(payment),
        ...(current[payment._id] || {}),
        [field]: value,
      },
    }))
  }

  const savePayment = async (payment, patch = {}) => {
    setWorkingKey(`payment-${payment._id}`)

    try {
      await api.patch(`/api/admin/payments/${payment._id}`, {
        ...(updates[payment._id] || createPaymentDraft(payment)),
        ...patch,
      })
      await loadPayments()
      setStatus({ type: 'success', message: 'Payment updated successfully.' })
      showToast('Payment updated successfully.')
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
      showToast(extractApiError(error), 'error')
    } finally {
      setWorkingKey('')
    }
  }

  const verifyPayment = (payment) =>
    savePayment(payment, {
      status: 'paid',
      verificationStatus: 'verified',
      reviewRemarks:
        updates[payment._id]?.reviewRemarks || payment.reviewRemarks || 'Payment proof verified by admin.',
    })

  const rejectPayment = (payment) =>
    savePayment(payment, {
      status: 'rejected',
      verificationStatus: 'rejected',
      reviewRemarks:
        updates[payment._id]?.reviewRemarks || payment.reviewRemarks || 'Payment proof could not be verified.',
    })

  const markPending = (payment) =>
    savePayment(payment, {
      status: 'pending',
      verificationStatus: 'pending',
    })

  const deletePayment = async (payment) => {
    const confirmed = await confirm({
      title: 'Delete payment?',
      message: `Delete ${payment.invoiceNumber}? This cannot be undone.`,
      confirmLabel: 'Delete payment',
      danger: true,
    })

    if (!confirmed) {
      return
    }

    setWorkingKey(`delete-${payment._id}`)

    try {
      await api.delete(`/api/admin/payments/${payment._id}`)
      await loadPayments()
      setStatus({ type: 'success', message: 'Payment deleted successfully.' })
      showToast('Payment deleted successfully.')
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
      showToast(extractApiError(error), 'error')
    } finally {
      setWorkingKey('')
    }
  }

  const updatePreparedFileDraft = (paymentId, patch) => {
    setPreparedFileDrafts((current) => ({
      ...current,
      [paymentId]: {
        title: current[paymentId]?.title || '',
        notes: current[paymentId]?.notes || '',
        file: current[paymentId]?.file || null,
        ...patch,
      },
    }))
  }

  const sendPreparedFile = async (payment) => {
    const draft = preparedFileDrafts[payment._id] || {}

    if (!draft.file) {
      setStatus({ type: 'error', message: 'Please choose the prepared file before sending it.' })
      return
    }

    setWorkingKey(`prepared-${payment._id}`)

    try {
      const payload = new FormData()
      payload.append('userId', payment.user?._id || '')
      payload.append('title', draft.title || `Prepared file - ${payment.serviceType}`)
      payload.append('serviceType', payment.serviceType)
      payload.append('paymentId', payment._id)
      payload.append('serviceId', payment.service?._id || '')
      payload.append('notes', draft.notes || 'Prepared work file shared by admin.')
      payload.append('preparedFile', draft.file)

      await api.post('/api/admin/prepared-documents', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      await loadPayments()
      setPreparedFileDrafts((current) => ({ ...current, [payment._id]: { title: '', notes: '', file: null } }))
      setPreparedFileInputKeys((current) => ({ ...current, [payment._id]: (current[payment._id] || 0) + 1 }))
      setStatus({ type: 'success', message: 'Prepared file saved in the client Prepared Documents page.' })
      showToast('Prepared file saved for the client.')
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
      showToast(extractApiError(error), 'error')
    } finally {
      setWorkingKey('')
    }
  }

  if (loading) {
    return <Skeleton title="Loading payment control center" rows={8} />
  }

  const exportPayments = () => {
    exportCsv('payments.csv', filteredPayments, [
      { label: 'Invoice', value: (payment) => payment.invoiceNumber },
      { label: 'Payment ID', value: (payment) => payment._id },
      { label: 'User ID', value: (payment) => payment.user?._id },
      { label: 'Client', value: (payment) => payment.user?.name },
      { label: 'Email', value: (payment) => payment.user?.email },
      { label: 'Phone', value: (payment) => payment.user?.phone },
      { label: 'Service', value: (payment) => payment.serviceType },
      { label: 'Amount', value: (payment) => payment.amount },
      { label: 'Status', value: (payment) => payment.status },
      { label: 'Verification', value: (payment) => payment.verificationStatus },
      { label: 'Transaction ID', value: (payment) => payment.transactionId },
      { label: 'Created', value: (payment) => formatDateTime(payment.createdAt) },
    ])
    showToast('Payments exported.')
  }

  const openReceipt = async (payment) => {
    try {
      await openFileFromApi(`/api/admin/payments/${payment._id}/receipt`)
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
      showToast(extractApiError(error), 'error')
    }
  }

  const escapePdfText = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

  const exportPaymentsPdf = () => {
    const rows = filteredPayments
      .map(
        (payment, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapePdfText(payment.invoiceNumber)}</td>
            <td>${escapePdfText(payment._id)}</td>
            <td>
              <strong>${escapePdfText(payment.user?.name || 'Unknown client')}</strong><br />
              ${escapePdfText(payment.user?._id || '')}<br />
              ${escapePdfText(payment.user?.email || '')}<br />
              ${escapePdfText(payment.user?.phone || '')}
            </td>
            <td>${escapePdfText(payment.serviceType)}</td>
            <td>${escapePdfText(formatCurrency(payment.amount))}</td>
            <td>${escapePdfText(payment.paymentMethod === 'manual' ? 'Manual / UPI' : 'Online checkout')}</td>
            <td>${escapePdfText(payment.status)} / ${escapePdfText(payment.verificationStatus || 'pending')}</td>
            <td>${escapePdfText(payment.transactionId || payment.razorpayPaymentId || 'Pending')}</td>
            <td>${escapePdfText(formatDateTime(payment.createdAt))}</td>
          </tr>
        `,
      )
      .join('')

    const printable = window.open('', '_blank', 'width=1200,height=800')

    if (!printable) {
      showToast('Popup blocked. Please allow popups to export PDF.', 'error')
      return
    }

    printable.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Payments PDF Export</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2933; margin: 24px; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            .meta { color: #5f6f7a; margin: 0 0 18px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #d7e2e4; padding: 7px; vertical-align: top; text-align: left; }
            th { background: #244c5a; color: #fff; font-size: 9px; text-transform: uppercase; }
            tr:nth-child(even) td { background: #f7faf9; }
            @media print {
              body { margin: 10mm; }
              button { display: none; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <h1>P.K Business - Payments Report</h1>
          <p class="meta">
            Exported ${escapePdfText(formatDateTime(new Date().toISOString()))}
            | ${filteredPayments.length} payment${filteredPayments.length === 1 ? '' : 's'}
          </p>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Invoice</th>
                <th>Payment ID</th>
                <th>User</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Transaction</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="10">No payments found for selected filters.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    printable.document.close()
    showToast('PDF export opened. Choose Save as PDF.')
  }

  return (
    <div className="page-stack admin-payment-center-page">
      <nav aria-label="Breadcrumb" className="admin-overview-breadcrumb admin-payment-breadcrumb"><AdminIcon name="overview" size={17}/><span>Admin Workspace</span><b>›</b><strong>Payments</strong></nav>
      <section className="admin-payment-hero">
        <div>
          <span className="admin-surface-eyebrow">Admin Workspace</span>
          <h1>Payments</h1>
          <p>Review client invoices, confirm payment proofs, and manage payment status from one clean workspace.</p>
        </div>
        <span aria-hidden="true" className="admin-payment-hero-icon"><AdminIcon name="payment" size={34} strokeWidth={1.8} /></span>
      </section>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="admin-payment-metric-grid">
        {[
          ['document', 'blue', summary.total, 'Total invoices'],
          ['clock', 'gold', summary.pending, 'Under review'],
          ['check', 'green', summary.verified, 'Verified / paid'],
          ['payment', 'violet', formatCurrency(summary.pendingAmount), 'Pending amount'],
        ].map(([icon, tone, value, label]) => (
          <article className={`admin-payment-metric ${tone}`} key={label}>
            <i><AdminIcon name={icon} size={27} strokeWidth={1.9} /></i>
            <div><strong>{value}</strong><span>{label}</span></div>
          </article>
        ))}
      </section>

      <section className="panel admin-payment-filter-panel">
        <div className="admin-payment-filter-head"><i><AdminIcon name="filter" size={22}/></i><div><h3>Filter Payments</h3><p>Search and filter payments by user, date, service, method, and status.</p></div><button onClick={resetAdvancedFilters} type="button">↻&nbsp; Reset All</button></div>

        <div className="admin-payment-toolbar">
          <label className="admin-payment-filter-wide">
            Search
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Invoice, payment ID, user name, email, phone..."
              type="search"
              value={query}
            />
          </label>
          <label>
            User
            <select onChange={(event) => setSelectedUserFilter(event.target.value)} value={selectedUserFilter}>
              <option value="all">All users</option>
              {userFilterOptions.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name || 'Unnamed user'} - {user.phone || user.email || user._id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service
            <select onChange={(event) => setServiceFilter(event.target.value)} value={serviceFilter}>
              <option value="all">All services</option>
              {serviceFilterOptions.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </label>
          <label>
            Payment status
            <select onChange={(event) => handleFilterChange(event.target.value)} value={filter}>
              <option value="all">All payments</option>
              <option value="pending">Under review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
              <option value="manual">Manual / UPI</option>
              <option value="online">Online checkout</option>
            </select>
          </label>
          <label>
            Method
            <select onChange={(event) => setMethodFilter(event.target.value)} value={methodFilter}>
              <option value="all">All methods</option>
              <option value="manual">Manual / UPI</option>
              <option value="online">Online checkout</option>
            </select>
          </label>
          <label>
            From date
            <input onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
          </label>
          <label>
            To date
            <input onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
          </label>
          <div className="admin-payment-filter-actions">
            <button className="button button-ghost button-compact" onClick={resetAdvancedFilters} type="button">
              ↻ Reset Filters
            </button>
            <button className="button button-primary button-compact" onClick={exportPaymentsPdf} type="button">
              <AdminIcon name="document" size={17} strokeWidth={2} />
              Export PDF
            </button>
          </div>
        </div>
      </section>

      {filteredPayments.length ? (
        selectedPayment ? (
            <article className="panel admin-payment-detail">
              <div className="admin-folder-detail-head">
                <div>
                  <span className="admin-surface-eyebrow">Selected Invoice</span>
                  <h3>{selectedPayment.invoiceNumber}</h3>
                  <p>
                    {selectedPayment.user?.name || 'Unknown client'} | {selectedPayment.serviceType}
                  </p>
                </div>
                <div className="admin-service-summary">
                  <StatusBadge status={selectedPayment.status} />
                  <StatusBadge status={selectedPayment.verificationStatus || 'pending'} />
                  <span>{formatCurrency(selectedPayment.amount)}</span>
                </div>
              </div>

              <div className="admin-payment-info-grid">
                <div>
                  <span>Client</span>
                  <strong>{selectedPayment.user?.name || 'Unknown'}</strong>
                  <small>User ID: {selectedPayment.user?._id || 'Not available'}</small>
                  <small>{selectedPayment.user?.email || 'No email'}</small>
                  <small>{selectedPayment.user?.phone || 'No phone'}</small>
                </div>
                <div>
                  <span>Service</span>
                  <strong>{selectedPayment.serviceType}</strong>
                  <small>Service status: {selectedPayment.service?.status || 'Not linked'}</small>
                  <small>Service price: {formatCurrency(selectedPayment.service?.price || 0)}</small>
                </div>
                <div>
                  <span>Transaction</span>
                  <strong>{selectedPayment.transactionId || 'Reference pending'}</strong>
                  <small>Payment ID: {selectedPayment._id}</small>
                  <small>Invoice: {selectedPayment.invoiceNumber}</small>
                  <small>Method: {selectedPayment.paymentMethod === 'manual' ? 'Manual / UPI' : 'Online checkout'}</small>
                </div>
                <div>
                  <span>Verification</span>
                  <strong>{selectedPayment.verifiedBy?.name || 'Not verified yet'}</strong>
                  <small>Paid: {formatDateTime(selectedPayment.paidAt)}</small>
                  <small>Verified: {formatDateTime(selectedPayment.verifiedAt)}</small>
                </div>
              </div>

              {selectedPayment.screenshotUrl ? (
                <div className="payment-proof-card admin-payment-proof-card">
                  <img
                    alt={`${selectedPayment.invoiceNumber} payment proof`}
                    className="payment-proof-image"
                    src={selectedPayment.screenshotUrl}
                  />
                  <div>
                    <strong>{selectedPayment.screenshotName || 'Payment proof'}</strong>
                    <span>{selectedPayment.screenshotType || 'Uploaded proof'}</span>
                    <a className="button button-ghost button-compact" href={selectedPayment.screenshotUrl} rel="noreferrer" target="_blank">
                      Open proof
                    </a>
                  </div>
                </div>
              ) : (
                <p className="admin-muted-text">No screenshot was uploaded for this payment.</p>
              )}

              <div className="admin-payment-actions">
                <button
                  className="button button-primary button-compact"
                  disabled={workingKey === `payment-${selectedPayment._id}`}
                  onClick={() => verifyPayment(selectedPayment)}
                  type="button"
                >
                  Verify Payment
                </button>
                <button
                  className="button button-secondary button-compact"
                  disabled={workingKey === `payment-${selectedPayment._id}`}
                  onClick={() => markPending(selectedPayment)}
                  type="button"
                >
                  Mark Pending
                </button>
                <button
                  className="admin-grid-button delete"
                  disabled={workingKey === `payment-${selectedPayment._id}`}
                  onClick={() => rejectPayment(selectedPayment)}
                  type="button"
                >
                  Reject
                </button>
                {selectedPayment.status === 'paid' || selectedPayment.verificationStatus === 'verified' ? (
                  <button
                    className="button button-ghost button-compact"
                    onClick={() => openReceipt(selectedPayment)}
                    type="button"
                  >
                    Receipt
                  </button>
                ) : null}
              </div>

              <section className="admin-subpanel">
                <div className="admin-subpanel-head">
                  <h4>Edit payment data</h4>
                  <span className="admin-muted-text">Use this for corrections after reviewing proof and client details.</span>
                </div>

                <div className="admin-inline-editor admin-inline-editor-wrap">
                  <label>
                    Payment status
                    <select
                      onChange={(event) => updateField(selectedPayment, 'status', event.target.value)}
                      value={selectedDraft.status}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                  <label>
                    Verification
                    <select
                      onChange={(event) => updateField(selectedPayment, 'verificationStatus', event.target.value)}
                      value={selectedDraft.verificationStatus}
                    >
                      <option value="pending">Under review</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                  <label>
                    Amount
                    <input
                      min="0"
                      onChange={(event) => updateField(selectedPayment, 'amount', event.target.value)}
                      type="number"
                      value={selectedDraft.amount}
                    />
                  </label>
                  <label>
                    Method
                    <select
                      onChange={(event) => updateField(selectedPayment, 'paymentMethod', event.target.value)}
                      value={selectedDraft.paymentMethod}
                    >
                      <option value="manual">Manual / UPI</option>
                      <option value="online">Online checkout</option>
                    </select>
                  </label>
                  <label>
                    Transaction ID
                    <input
                      onChange={(event) => updateField(selectedPayment, 'transactionId', event.target.value)}
                      placeholder="Transaction reference"
                      type="text"
                      value={selectedDraft.transactionId}
                    />
                  </label>
                </div>

                <label>
                  Client/payment note
                  <textarea
                    onChange={(event) => updateField(selectedPayment, 'description', event.target.value)}
                    rows="3"
                    value={selectedDraft.description}
                  />
                </label>

                <label>
                  Admin review remarks
                  <textarea
                    onChange={(event) => updateField(selectedPayment, 'reviewRemarks', event.target.value)}
                    rows="3"
                    value={selectedDraft.reviewRemarks}
                  />
                </label>

                <div className="admin-record-actions">
                  <button
                    className="button button-primary button-compact"
                    disabled={workingKey === `payment-${selectedPayment._id}`}
                    onClick={() => savePayment(selectedPayment)}
                    type="button"
                  >
                    {workingKey === `payment-${selectedPayment._id}` ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    className="admin-grid-button delete"
                    disabled={workingKey === `delete-${selectedPayment._id}`}
                    onClick={() => deletePayment(selectedPayment)}
                    type="button"
                  >
                    {workingKey === `delete-${selectedPayment._id}` ? 'Deleting...' : 'Delete Payment'}
                  </button>
                </div>
              </section>

              {selectedPayment.verificationStatus === 'verified' || selectedPayment.status === 'paid' ? (
                <section className="admin-subpanel">
                  <div className="admin-subpanel-head">
                    <h4>Send prepared work</h4>
                    <span className="admin-muted-text">Share final documents with the client after payment verification.</span>
                  </div>
                  <div className="admin-inline-editor admin-inline-editor-wrap">
                    <label>
                      File title
                      <input
                        onChange={(event) => updatePreparedFileDraft(selectedPayment._id, { title: event.target.value })}
                        placeholder={`Prepared file - ${selectedPayment.serviceType}`}
                        type="text"
                        value={preparedFileDrafts[selectedPayment._id]?.title || ''}
                      />
                    </label>
                    <label>
                      Prepared file
                      <input
                        accept=".pdf,image/*"
                        key={preparedFileInputKeys[selectedPayment._id] || 0}
                        onChange={(event) => updatePreparedFileDraft(selectedPayment._id, { file: event.target.files?.[0] || null })}
                        type="file"
                      />
                    </label>
                    <label>
                      Note to client
                      <input
                        onChange={(event) => updatePreparedFileDraft(selectedPayment._id, { notes: event.target.value })}
                        placeholder="Prepared work file shared by admin."
                        type="text"
                        value={preparedFileDrafts[selectedPayment._id]?.notes || ''}
                      />
                    </label>
                    <button
                      className="button button-primary button-compact"
                      disabled={workingKey === `prepared-${selectedPayment._id}`}
                      onClick={() => sendPreparedFile(selectedPayment)}
                      type="button"
                    >
                      {workingKey === `prepared-${selectedPayment._id}` ? 'Sending...' : 'Send Prepared File'}
                    </button>
                  </div>
                </section>
              ) : null}
            </article>
          ) : null
      ) : (
        <div className="admin-payment-empty"><i><AdminIcon name="document" size={32}/><b>₹</b></i><h3>No payment records found</h3><p>Try adjusting your filter criteria or check back later.</p><button onClick={resetAdvancedFilters} type="button">↻ &nbsp; Reset Filters</button></div>
      )}
      <aside className="admin-payment-tip"><i>💡</i><div><strong>Tip</strong><span>Regularly review and verify payments to ensure smooth service delivery and better client satisfaction.</span></div><b>×</b></aside>
    </div>
  )
}

export default Payments
