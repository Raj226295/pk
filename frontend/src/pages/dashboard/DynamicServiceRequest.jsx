import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { Icon } from '../public/Home.jsx'

function flatten(nodes, result = []) { nodes.forEach((node) => { result.push(node); flatten(node.children || [], result) }); return result }

function InfluencerBookingRequest({ influencerId }) {
  const [influencer, setInfluencer] = useState(null)
  const [requirements, setRequirements] = useState([])
  const [values, setValues] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/api/public/influencers/${influencerId}/requirements`)
      .then(({ data }) => { setInfluencer(data.influencer); setRequirements(data.requirements || []) })
      .catch((error) => setMessage(extractApiError(error)))
      .finally(() => setLoading(false))
  }, [influencerId])

  const submit = async (event) => {
    event.preventDefault()
    const payload = new FormData()
    Object.entries(values).forEach(([key, value]) => payload.append(key, value instanceof File ? value : value || ''))
    setSaving(true); setMessage('')
    try { await api.post(`/api/influencers/${influencerId}/book`, payload); setMessage('Your influencer booking has been submitted.'); setValues({}) }
    catch (error) { setMessage(extractApiError(error)) }
    finally { setSaving(false) }
  }

  if (loading) return <Loader message="Loading booking requirements..." />
  if (!influencer) return <div className="page-stack"><PageHeader eyebrow="Influencer booking" title="Booking unavailable" />{message ? <p className="form-message">{message}</p> : null}</div>

  return <div className="page-stack influencer-booking-page">
    <PageHeader eyebrow="Client Workspace" title={`Book ${influencer.name}`} description="Provide the requested campaign details and files to submit your booking." />
    <section className="upload-documents-workspace influencer-booking-workspace">
      <form className="panel form-panel multi-document-form" onSubmit={submit}>
        <h3>Complete Booking Details</h3>
        <div className="document-checklist-grid">
          {requirements.map((field) => {
            const key = `field_${field.id}`
            const value = values[key]
            const isFile = field.field_type === 'file'
            const icon = isFile ? 'documentStack' : field.field_type === 'number' ? 'phone' : 'users'
            const hint = isFile ? `${field.accepted_file_types ? `Allowed: ${field.accepted_file_types.toUpperCase()} · ` : ''}Maximum ${field.max_file_size_mb} MB` : value ? 'Ready to submit' : 'Enter the requested information'
            return <article className={`document-checklist-row${value ? ' ready' : ''}`} key={field.id}>
              <span aria-hidden="true" className="document-type-icon"><Icon name={icon} /></span>
              <div className="document-checklist-head">
                <strong className="document-checklist-checkbox">{field.label}</strong>
                {field.is_required ? <em className="document-required-badge">Required</em> : null}
              </div>
              <div className="document-checklist-copy"><small>{isFile && value instanceof File ? `Selected: ${value.name}` : hint}</small>{isFile && value instanceof File ? <small className="influencer-upload-confirmation">✓ File selected and ready to submit</small> : null}</div>
              <div className="document-upload-field">
                {isFile ? <label className="document-file-picker"><Icon name="upload" /><span>{value instanceof File ? 'Change File' : 'Choose File'}</span><input accept={field.accepted_file_types ? field.accepted_file_types.split(',').map((type) => `.${type.trim()}`).join(',') : undefined} required={field.is_required} type="file" onChange={(event) => setValues({ ...values, [key]: event.target.files?.[0] || null })} /></label> : <input required={field.is_required} type={field.field_type} value={value || ''} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />}
              </div>
            </article>
          })}
        </div>
        <label className="upload-notes-field"><span><Icon name="documentStack" /> Notes <em>(Optional)</em></span><textarea placeholder="Optional message for the administrator" rows="4" value={values.notes || ''} onChange={(event) => setValues({ ...values, notes: event.target.value })} /></label>
        {message ? <p className="form-message">{message}</p> : null}
        <button className="button button-primary" disabled={saving} type="submit">{saving ? 'Submitting...' : 'Submit Booking'} {!saving ? <Icon name="arrowRight" /> : null}</button>
      </form>
    </section>
  </div>
}

export default function DynamicServiceRequest() {
  const [params] = useSearchParams(); const influencerId = params.get('influencer'); const [tree, setTree] = useState([]); const [selectedId, setSelectedId] = useState(params.get('service') || ''); const [values, setValues] = useState({}); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)
  useEffect(() => { api.get('/api/public/service-tree').then(({ data }) => setTree(data.services || []) ).catch((error) => setMessage(extractApiError(error))).finally(() => setLoading(false)) }, [])
  const all = useMemo(() => flatten(tree), [tree]); const selected = all.find((node) => node.id === selectedId); const bookable = all.filter((node) => !node.children?.length)
  const submit = async (event) => { event.preventDefault(); if (!selected) return setMessage('Choose a service first.'); const payload = new FormData(); payload.append('service_id', selected.id); Object.entries(values).forEach(([key, value]) => { if (value instanceof File) payload.append(key, value); else if (typeof value === 'boolean') payload.append(key, value ? '1' : ''); else payload.append(key, value || '') }); setSaving(true); setMessage(''); try { await api.post('/api/services/dynamic-request', payload); setMessage('Your service request has been submitted.'); setValues({}) } catch (error) { setMessage(extractApiError(error)) } finally { setSaving(false) } }
  if (influencerId) return <InfluencerBookingRequest influencerId={influencerId} />
  if (loading) return <Loader message="Loading services..." />
  return <div className="page-stack"><PageHeader eyebrow="Request service" title="Tell us what you need" description="Choose an available service and complete the requirements set by our team." />{message ? <p className="form-message">{message}</p> : null}<section className="panel"><form className="admin-inline-editor admin-inline-editor-wrap" onSubmit={submit}><label>Service<select required value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setValues({}) }}><option value="">Choose a service</option>{bookable.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>{selected?.description ? <p className="admin-muted-text">{selected.description}</p> : null}{selected?.requirements?.map((field) => <label key={field.id}>{field.label}{field.is_required ? ' *' : ''}{field.help_text ? <small>{field.help_text}</small> : null}{field.field_type === 'select' ? <select required={field.is_required} value={values[`field_${field.id}`] || ''} onChange={(e) => setValues({ ...values, [`field_${field.id}`]: e.target.value })}><option value="">Select</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.field_type === 'checkbox' ? <input checked={Boolean(values[`field_${field.id}`])} type="checkbox" onChange={(e) => setValues({ ...values, [`field_${field.id}`]: e.target.checked })} /> : ['file','multiple_file'].includes(field.field_type) ? <input accept={field.accepted_file_types ? field.accepted_file_types.split(',').map((type) => `.${type.trim()}`).join(',') : undefined} required={field.is_required} type="file" onChange={(e) => setValues({ ...values, [`field_${field.id}`]: e.target.files?.[0] || null })} /> : <input required={field.is_required} type={field.field_type} value={values[`field_${field.id}`] || ''} onChange={(e) => setValues({ ...values, [`field_${field.id}`]: e.target.value })} />}</label>)}<label>Notes<textarea rows="3" value={values.notes || ''} onChange={(e) => setValues({ ...values, notes: e.target.value })} /></label><button className="button button-primary" disabled={saving || !selected} type="submit">{saving ? 'Submitting...' : 'Submit service request'}</button></form></section></div>
}
