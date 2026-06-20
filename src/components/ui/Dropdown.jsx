import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X, Search } from 'lucide-react'

export default function Dropdown({
  value,
  onChange,
  options = [],
  placeholder = 'All',
  label,
  disabled = false,
  searchable = false,
  className = '',
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const ref    = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (open && searchable) setTimeout(() => inputRef.current?.focus(), 50)
    if (!open) setQuery('')
  }, [open, searchable])

  const selected = options.find(o => o.id === value)
  const visible  = searchable
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
    : options

  const handleSelect = (id) => { onChange(id); setOpen(false) }
  const handleClear  = (e) => { e.stopPropagation(); onChange('') }

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && (
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`
          flex items-center gap-2 w-full pl-3 pr-2 py-2 text-xs rounded-lg border transition-all
          ${disabled ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' : ''}
          ${!disabled && open
            ? 'border-orange-400 ring-2 ring-orange-500/15 bg-white dark:bg-gray-800 shadow-sm'
            : !disabled ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-400 hover:shadow-sm'
            : ''
          }
        `}
      >
        <span className={`flex-1 text-left truncate ${selected ? 'text-gray-800 dark:text-gray-100 font-medium' : 'text-gray-400'}`}>
          {selected ? selected.name : placeholder}
        </span>

        {value && !disabled && (
          <span
            onClick={handleClear}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 min-w-full w-max max-w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-6 pr-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 rounded-lg border-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="py-1 max-h-52 overflow-y-auto">
            <button
              onClick={() => handleSelect('')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                !value
                  ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className="w-3.5 flex-shrink-0">{!value && <Check className="w-3 h-3" />}</span>
              {placeholder}
            </button>

            {visible.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">No options</div>
            ) : (
              visible.map(o => (
                <button
                  key={o.id}
                  onClick={() => handleSelect(o.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                    value === o.id
                      ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500 font-semibold'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="w-3.5 flex-shrink-0">{value === o.id && <Check className="w-3 h-3" />}</span>
                  <span className="truncate">{o.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
