function Skeleton({ rows = 4, title = 'Loading workspace...' }) {
  return (
    <div className="page-stack">
      <section className="panel skeleton-panel" aria-busy="true" aria-label={title}>
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-grid">
          {Array.from({ length: rows }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
              <div className="skeleton-line tiny" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Skeleton
