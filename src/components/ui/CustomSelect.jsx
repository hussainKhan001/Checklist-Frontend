import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * CustomSelect — styled dropdown replacing native <select>
 *
 * Props:
 *   value        current value (string)
 *   onChange     (value: string) => void
 *   options      string[] | { value: string, label: string }[]
 *   placeholder  text shown when nothing selected  (default "Choose…")
 *   emptyLabel   if provided, adds a reset option at top (e.g. "All statuses", "— None —")
 *   error        truthy = red border
 *   disabled     grayed-out, non-interactive
 *   accent       'violet' | 'orange'  (default 'violet')
 *   size         'md' | 'sm'          (default 'md')
 *   className    extra classes on the wrapper div
 */
export default function CustomSelect({
  value = '',
  onChange,
  options = [],
  placeholder = 'Choose…',
  emptyLabel,
  error,
  disabled = false,
  accent = 'violet',
  size = 'md',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  const selectedLabel = normalized.find(o => o.value === value)?.label

  const isSm = size === 'sm'
  const py   = isSm ? 'py-2'   : 'py-2.5'
  const px   = isSm ? 'px-3'   : 'px-3.5'
  const ht   = isSm ? 'h-[38px]' : ''
  const txt  = isSm ? 'text-sm' : 'text-sm'

  const accentBorder  = accent === 'orange'  ? 'border-orange-400 dark:border-orange-500'
                      : accent === 'emerald' ? 'border-emerald-500 dark:border-emerald-500'
                      :                        'border-violet-500 dark:border-violet-500'
  const accentHover   = accent === 'orange'  ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      : accent === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      :                        'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
  const checkColor    = accent === 'orange'  ? 'text-orange-500'
                      : accent === 'emerald' ? 'text-emerald-500'
                      :                        'text-violet-500'

  const btnBorder = disabled
    ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
    : error
      ? 'border-red-400'
      : value
        ? accentBorder
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center justify-between ${px} ${py} ${ht} rounded-lg border ${txt} bg-white dark:bg-gray-800 transition-colors text-left ${btnBorder}`}
      >
        <span className={value && !disabled ? 'text-gray-900 dark:text-white font-medium truncate' : 'text-gray-400 dark:text-gray-500 truncate'}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            {emptyLabel !== undefined && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                  !value ? accentHover + ' font-medium' : 'text-gray-500 dark:text-gray-400 italic hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span>{emptyLabel}</span>
                {!value && <Tick className={`w-4 h-4 flex-shrink-0 ${checkColor}`} />}
              </button>
            )}
            {normalized.map(o => (
              <button
                key={o.value}
                type="button"
                disabled={o.disabled}
                onMouseDown={e => { e.preventDefault(); if (!o.disabled) { onChange(o.value); setOpen(false) } }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                  o.disabled
                    ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-500'
                    : value === o.value
                      ? accentHover + ' font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="truncate">{o.label}</span>
                {value === o.value && <Tick className={`w-4 h-4 flex-shrink-0 ${checkColor}`} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Tick({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
