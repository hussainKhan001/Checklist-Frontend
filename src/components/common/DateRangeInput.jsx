import { useState, useRef, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

export default function DateRangeInput({ from, to, onChange }) {
  const [open, setOpen]   = useState(false)
  const [hover, setHover] = useState(null)
  const [view, setView]   = useState(() => new Date())
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const toggleOpen = () => {
    if (!open) setView(from ? new Date(from + 'T00:00:00') : new Date())
    setOpen(o => !o)
  }

  const yr = view.getFullYear()
  const mo = view.getMonth()

  const cells = [
    ...Array(new Date(yr, mo, 1).getDay()).fill(null),
    ...Array.from({ length: new Date(yr, mo + 1, 0).getDate() }, (_, i) => i + 1),
  ]

  const isoOf = (d) =>
    `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const todayISO = new Date().toISOString().slice(0, 10)

  const handleDay = (d) => {
    const iso = isoOf(d)
    if (!from || (from && to)) {
      onChange('from', iso)
      onChange('to', '')
    } else {
      if (iso < from) { onChange('to', from); onChange('from', iso) }
      else             { onChange('to', iso) }
    }
  }

  const inRange = (d) => {
    const iso = isoOf(d)
    const end = to || hover
    if (!from || !end) return false
    const [lo, hi] = from <= end ? [from, end] : [end, from]
    return iso > lo && iso < hi
  }

  const clearAll = (e) => {
    if (e) e.stopPropagation()
    onChange('from', ''); onChange('to', '')
  }

  const hasRange = from || to
  const btnLabel = hasRange
    ? `${from ? fmtShort(from) : '…'} – ${to ? fmtShort(to) : '…'}`
    : 'Select Date Range'

  const hint = !from ? 'Pick start date' : !to ? 'Pick end date'
    : `${fmtShort(from)} – ${fmtShort(to)}`

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger button */}
      <button
        type="button"
        onClick={toggleOpen}
        className={`flex items-center gap-2 px-3 py-2 h-[38px] rounded-lg border text-sm transition-all whitespace-nowrap
          ${open || hasRange
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
      >
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span>{btnLabel}</span>
        {hasRange && (
          <span onClick={clearAll}
            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-orange-200 dark:hover:bg-orange-400/20 transition-colors">
            <X className="w-2.5 h-2.5" />
          </span>
        )}
      </button>

      {/* Calendar popup */}
      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[302px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setView(new Date(yr, mo - 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide">
              {MONTHS[mo]} {yr}
            </span>
            <button
              onClick={() => setView(new Date(yr, mo + 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 px-2 pt-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-2 pb-3 gap-y-0.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />

              const iso    = isoOf(d)
              const isFrom = iso === from
              const isTo   = iso === to
              const sel    = isFrom || isTo
              const range  = inRange(d)
              const today  = iso === todayISO

              return (
                <button
                  key={d}
                  onClick={() => handleDay(d)}
                  onMouseEnter={() => from && !to && setHover(iso)}
                  onMouseLeave={() => setHover(null)}
                  className={[
                    'relative h-8 w-full text-sm font-medium transition-all',
                    sel   ? 'bg-orange-500 text-white rounded-lg' : '',
                    range ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300' : '',
                    !sel && !range
                      ? `rounded-lg ${today ? 'text-orange-500 dark:text-orange-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`
                      : '',
                  ].filter(Boolean).join(' ')}
                >
                  {today && !sel ? (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500 dark:bg-orange-400" />
                  ) : null}
                  {d}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
            <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtShort(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
