import { AlertTriangle } from 'lucide-react'

export default function ConfirmModal({ isOpen, message, description, onConfirm, onCancel, danger = true }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-down">
        <div className="flex gap-4 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100 dark:bg-red-500/15' : 'bg-amber-100 dark:bg-amber-500/15'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{message}</h3>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{description}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
