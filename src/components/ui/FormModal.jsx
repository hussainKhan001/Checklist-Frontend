import Modal from '../common/Modal'

export default function FormModal({ title, onClose, onSave, saving, saveLabel, error, children }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-sm shadow-orange-500/30 transition-colors"
          >
            {saving ? 'Saving…' : (saveLabel || 'Save')}
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </Modal>
  )
}
