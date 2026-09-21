import { Link } from 'react-router-dom'
import AdminIcon from '../admin/AdminIcon.jsx'

function StatCard({ label, value, hint, to = '', actionLabel = 'Open', icon = '' }) {
  if (to) {
    return (
      <Link className="stat-card stat-card-link" to={to}>
        {icon ? <span className="stat-card-icon"><AdminIcon name={icon} size={20} /></span> : null}
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
        <span className="stat-card-action">{actionLabel}</span>
      </Link>
    )
  }

  return (
    <article className="stat-card">
      {icon ? <span className="stat-card-icon"><AdminIcon name={icon} size={20} /></span> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}

export default StatCard
