import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Panel */}
      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="shrink-0 px-5 py-4 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug truncate">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-5 py-4 bg-gray-50 dark:bg-gray-800/70 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * DetailRow — horizontal label | value row for view drawers.
 * Pass `block` for full-width content (e.g. photo grids, long text).
 */
export function DetailRow({ label, value, children, block }) {
  if (block) {
    return (
      <div className="-mx-5 px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2.5">{label}</p>
        <div>{children ?? <span className="text-sm font-medium text-gray-900 dark:text-white">{value ?? '—'}</span>}</div>
      </div>
    )
  }

  return (
    <div className="-mx-5 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-start gap-4">
      <span className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 pt-0.5 leading-tight">{label}</span>
      <div className="flex-1 min-w-0">
        {children ?? <span className="text-sm font-medium text-gray-900 dark:text-white break-words">{value ?? '—'}</span>}
      </div>
    </div>
  )
}
