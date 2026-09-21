import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        title: options.title || 'Confirm action',
        message: options.message || 'Do you want to continue?',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        danger: Boolean(options.danger),
        resolve,
      })
    })
  }, [])

  const close = (value) => {
    if (dialog?.resolve) {
      dialog.resolve(value)
    }
    setDialog(null)
  }

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog ? (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h3 id="confirm-title">{dialog.title}</h3>
            <p>{dialog.message}</p>
            <div className="confirm-dialog-actions">
              <button className="button button-ghost button-compact" onClick={() => close(false)} type="button">
                {dialog.cancelLabel}
              </button>
              <button
                className={dialog.danger ? 'button button-danger button-compact' : 'button button-primary button-compact'}
                onClick={() => close(true)}
                type="button"
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)

  if (!context) {
    return { confirm: async () => false }
  }

  return context
}
