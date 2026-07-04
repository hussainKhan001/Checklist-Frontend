import { createContext, useContext, useState, useCallback } from 'react'
import ConfirmModal from '../components/common/ConfirmModal'

const ConfirmContext = createContext(null)

const INITIAL_STATE = { open: false, message: '', description: '', danger: true, confirmLabel: 'Delete', resolve: null }

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE)

  // Accepts either confirm(message, description, danger) or confirm({ title, message, confirmLabel, variant })
  const confirm = useCallback((arg, description = '', danger = true) => {
    const opts = typeof arg === 'object' && arg !== null
      ? {
          message: arg.title || arg.message,
          description: arg.title ? arg.message : (arg.description || ''),
          danger: arg.variant ? arg.variant === 'danger' : (arg.danger ?? true),
          confirmLabel: arg.confirmLabel || 'Delete',
        }
      : { message: arg, description, danger, confirmLabel: 'Delete' }

    return new Promise(resolve => setState({ open: true, ...opts, resolve }))
  }, [])

  const handleConfirm = () => { state.resolve(true); setState(s => ({ ...s, open: false })) }
  const handleCancel = () => { state.resolve(false); setState(s => ({ ...s, open: false })) }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        isOpen={state.open}
        message={state.message}
        description={state.description}
        danger={state.danger}
        confirmLabel={state.confirmLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
