import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[99] flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative ml-auto z-10 h-full flex flex-col bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 animate-slide-in-right w-full sm:max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-700 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
