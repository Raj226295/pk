function EmptyState({ title, description, action = null, icon = null }) {
  return (
    <div className="empty-state">
      {icon ? <span className="empty-state-icon">{icon}</span> : null}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export default EmptyState
