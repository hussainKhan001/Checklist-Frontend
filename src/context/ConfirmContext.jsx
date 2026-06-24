import { createContext, useContext, useState, useCallback } from 'react'
import ConfirmModal from '../components/common/ConfirmModal'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', description: '', danger: true, resolve: null })

  const confirm = useCallback((message, description = '', danger = true) =>
    new Promise(resolve => setState({ open: true, message, description, danger, resolve }))
  , [])

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
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
