import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

function toStr(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseYMD(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return { y, m, d }
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pick date',
  min,
  max,
  align = 'left',
}) {
  const today  = new Date()
  const parsed = parseYMD(value)

  const [open, setOpen] = useState(false)
  const [view, setView] = useState({
    y: parsed?.y || today.getFullYear(),
    m: parsed?.m || today.getMonth() + 1,
  })
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const p = parseYMD(value)
      if (p) setView({ y: p.y, m: p.m })
    }
  }, [value])

  const daysInMonth = new Date(view.y, view.m, 0).getDate()
  const firstDay    = new Date(view.y, view.m - 1, 1).getDay()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => setView(v => v.m === 1  ? { y: v.y - 1, m: 12 }   : { ...v, m: v.m - 1 })
  const nextMonth = () => setView(v => v.m === 12 ? { y: v.y + 1, m: 1  }   : { ...v, m: v.m + 1 })
  const prevYear  = () => setView(v => ({ ...v, y: v.y - 1 }))
  const nextYear  = () => setView(v => ({ ...v, y: v.y + 1 }))

  const dayStr    = (d) => toStr(view.y, view.m, d)
  const isSelected = (d) => !!value && value === dayStr(d)
  const isToday    = (d) => dayStr(d) === toStr(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const isDisabled = (d) => {
    const s = dayStr(d)
    return (min && s < min) || (max && s > max)
  }

  const handleDay = (d) => {
    if (isDisabled(d)) return
    onChange(dayStr(d))
    setOpen(false)
  }

  const handleClear = (e) => { e.stopPropagation(); onChange('') }

  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  const popupAlign = align === 'right' ? 'right-0' : 'left-0'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`
          flex items-center gap-2 pl-3 pr-2 py-2 text-xs rounded-lg border transition-all whitespace-nowrap
          ${open
            ? 'border-orange-400 ring-2 ring-orange-500/15 bg-white dark:bg-gray-800 shadow-sm'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-400 hover:shadow-sm'
          }
        `}
      >
        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className={display ? 'text-gray-800 dark:text-gray-100 font-medium' : 'text-gray-400'}>
          {display || placeholder}
        </span>
        {value && (
          <span
            onClick={handleClear}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute z-50 top-full mt-1.5 ${popupAlign} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-3 w-60 select-none`}>
          {/* Month + Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-0.5">
              <button onClick={prevYear} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors" title="Prev year">
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors" title="Prev month">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-xs font-bold text-gray-800 dark:text-white tracking-wide">
              {MONTHS[view.m - 1]} {view.y}
            </span>

            <div className="flex items-center gap-0.5">
              <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors" title="Next month">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={nextYear} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors" title="Next year">
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-[10px] font-bold text-gray-400 text-center py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => (
              <div key={i} className="flex justify-center">
                {d ? (
                  <button
                    onClick={() => handleDay(d)}
                    disabled={isDisabled(d)}
                    className={`w-7 h-7 rounded-full text-[11px] transition-all font-medium
                      ${isSelected(d)
                        ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-200 dark:shadow-orange-500/20'
                        : isToday(d) && !isDisabled(d)
                        ? 'border-2 border-orange-400 text-orange-500 font-bold'
                        : isDisabled(d)
                        ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-500 cursor-pointer'
                      }
                    `}
                  >
                    {d}
                  </button>
                ) : (
                  <div className="w-7 h-7" />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => {
                const t = toStr(today.getFullYear(), today.getMonth() + 1, today.getDate())
                if (!isDisabled(today.getDate()) || true) {
                  onChange(t); setOpen(false)
                }
              }}
              className="text-[11px] text-orange-500 font-semibold hover:text-orange-600 transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-[11px] text-gray-400 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
