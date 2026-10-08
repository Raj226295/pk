import logoImg from '../../assets/logo-optimized.png'

function Loader({ message = 'Loading...', fullScreen = false, variant = 'default' }) {
  return (
    <div
      aria-live="polite"
      aria-label={variant === 'upload' ? 'Preparing your upload' : message}
      className={`upload-loader${fullScreen ? ' upload-loader-fullscreen' : ''}`}
      role="status"
    >
      <div aria-hidden="true" className="upload-loader-spinner">
        <div className="upload-loader-logo">
          <img alt="" src={logoImg} />
        </div>
      </div>
      <div className="upload-loader-copy">
        <strong>{variant === 'upload' ? 'Preparing your upload' : message}</strong>
        <span>Please wait a moment...</span>
      </div>
    </div>
  )
}

export default Loader
