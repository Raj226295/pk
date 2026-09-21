import { Icon } from '../../pages/public/Home.jsx'

/**
 * Shared catalogue card used wherever a service is presented.  The page supplies
 * its own data and action, so this component never owns or duplicates service data.
 */
function ServiceCatalogCard({ service, onClick, actionLabel = 'View all services', className = '', overlay = null }) {
  const tags = (service.tags || []).slice(0, 3)
  const priceLabel = service.priceLabel || `Starting ₹${Number(service.price || 0).toLocaleString('en-IN')} onwards`

  return (
    <article className={`service-catalog-card-shell ${className}`.trim()}>
      <button
        className={`service-selection-card service-tone-${service.tone || 'blue'}`}
        onClick={onClick}
        type="button"
      >
        <div className="service-card-compact-head">
          <span className="service-card-icon-badge">
            {service.image ? <img alt="" src={service.image} style={service.imageStyle} /> : <Icon name={service.icon || 'fileCheck'} />}
          </span>
          <span className="service-card-head-arrow"><Icon name="arrowRight" /></span>
        </div>
        <div className="service-card-body">
          <div className="service-card-topline"><strong>{service.name}</strong></div>
          <span className="status-badge neutral service-card-price">{priceLabel}</span>
          <p>{service.description || 'Professional support for this service.'}</p>
          {tags.length ? (
            <span className="service-card-tags">
              {tags.map((tag) => <small key={tag}>{tag}</small>)}
            </span>
          ) : null}
          <span className="service-card-link"><span>{actionLabel}</span><Icon name="arrowRight" /></span>
        </div>
      </button>
      {overlay}
    </article>
  )
}

export default ServiceCatalogCard
