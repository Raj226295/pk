function RouteSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading page" className="route-skeleton">
      <div className="route-skeleton-bar" />
      <div className="route-skeleton-hero">
        <i />
        <i />
      </div>
      <div className="route-skeleton-cards"><i /><i /><i /></div>
    </main>
  )
}

export default RouteSkeleton
