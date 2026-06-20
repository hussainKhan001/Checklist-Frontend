import { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { adminGetProjects, adminGetFloors, adminGetMatrix } from '../../api'
import { RefreshCw, ChevronDown, LayoutGrid, MoveHorizontal, Radio } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Cell status config ─────────────────────────────────────────────────────────
const CELL_CFG = {
  DONE:        { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', symbol: '✓', label: 'Done'        },
  CROSS:       { bg: 'bg-red-100    dark:bg-red-500/20',      text: 'text-red-500    dark:text-red-400',      symbol: '✗', label: 'Has Not OK'  },
  IN_PROGRESS: { bg: 'bg-amber-50   dark:bg-amber-500/15',    text: 'text-amber-500  dark:text-amber-400',    symbol: '◑', label: 'In Progress' },
}

const WALL_ICON = {
  done:        { symbol: '✓', color: 'text-emerald-500' },
  not_ok:      { symbol: '✗', color: 'text-red-500'     },
  incomplete:  { symbol: '●', color: 'text-amber-500'   },
  not_started: { symbol: '○', color: 'text-gray-400'    },
}

const STATUS_SUMMARY = {
  DONE:        { text: 'All walls complete — all OK',      color: 'text-emerald-600 dark:text-emerald-400' },
  CROSS:       { text: 'Has NOT OK results',               color: 'text-red-500 dark:text-red-400'         },
  IN_PROGRESS: (s, t) => ({ text: `${s} of ${t} walls submitted`, color: 'text-amber-500 dark:text-amber-400' }),
  NOT_STARTED: { text: 'Not started',                      color: 'text-gray-400'                          },
  NA:          { text: 'Not assigned to this room',        color: 'text-gray-400'                          },
}

const AUTO_REFRESH_MS = 10_000

function useRelativeTime(ts) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!ts) { setLabel(''); return }
    const update = () => {
      const sec = Math.floor((Date.now() - ts) / 1000)
      if (sec < 5)       setLabel('just now')
      else if (sec < 60) setLabel(`${sec}s ago`)
      else               setLabel(`${Math.floor(sec / 60)}m ago`)
    }
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [ts])
  return label
}

// ── Tooltip (fixed-position so it's never clipped by overflow container) ──────
function buildTooltipPos(x, y, cellY, wallCount) {
  const spaceAbove = y
  const estimatedHeight = 80 + wallCount * 22
  const showBelow = spaceAbove < estimatedHeight + 12
  return {
    showBelow,
    style: showBelow
      ? { left: x, top: cellY, transform: 'translateX(-50%) translateY(8px)' }
      : { left: x, top: y,    transform: 'translateX(-50%) translateY(calc(-100% - 8px))' },
  }
}

function TooltipContent({ tooltip, pinned, onClose }) {
  const { x, y, cellY, roomName, tradeName, cellData } = tooltip
  const { status, walls = [], submittedWalls, totalWalls } = cellData

  const summary = typeof STATUS_SUMMARY[status] === 'function'
    ? STATUS_SUMMARY[status](submittedWalls, totalWalls)
    : STATUS_SUMMARY[status] || { text: status, color: 'text-gray-400' }

  const { showBelow, style } = buildTooltipPos(x, y, cellY, walls.length)

  return (
    <div
      className={`fixed z-[9999] bg-white dark:bg-gray-900 rounded-xl shadow-2xl
        border dark:border-gray-700 px-3 py-2.5 w-max min-w-[200px] max-w-[280px]
        ${pinned
          ? 'border-orange-400 ring-1 ring-orange-300 dark:ring-orange-500/50'
          : 'border-gray-200 pointer-events-none'
        }`}
      style={style}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <p className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">
          {roomName} — {tradeName}
        </p>
        {pinned && (
          <button
            onClick={onClose}
            className="flex-shrink-0 -mt-0.5 -mr-1 w-5 h-5 flex items-center justify-center
              rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100
              dark:hover:text-white dark:hover:bg-gray-700 text-xs font-bold transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <p className={`text-[11px] font-medium ${summary.color} ${walls.length ? 'mb-2' : 'mb-0'}`}>
        {summary.text}
      </p>

      {/* Per-wall breakdown — scrollable */}
      {walls.length > 0 && (
        <div
          className="border-t border-gray-100 dark:border-gray-700 pt-2 space-y-1.5 overflow-y-auto"
          style={{ maxHeight: 260 }}
        >
          {walls.map((wall, i) => {
            const icon = WALL_ICON[wall.wallStatus] || WALL_ICON.not_started
            const issues = []
            if (wall.notOkCount > 0)       issues.push(`${wall.notOkCount} not ok`)
            if (wall.pendingCount > 0)      issues.push(`${wall.pendingCount} pending`)
            if (wall.photoMissingCount > 0) issues.push(`${wall.photoMissingCount} photo missing`)

            return (
              <div key={i} className="flex items-start gap-2">
                <span className={`text-xs font-bold flex-shrink-0 mt-px ${icon.color}`}>
                  {icon.symbol}
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] text-gray-700 dark:text-gray-300">{wall.name}</span>
                  {issues.length > 0 && (
                    <span className="text-[11px] text-red-500 ml-1">— {issues.join(', ')}</span>
                  )}
                  {wall.wallStatus === 'done' && (
                    <span className="text-[11px] text-emerald-500 ml-1">— all OK</span>
                  )}
                  {!wall.submitted && (
                    <span className="text-[11px] text-gray-400 ml-1">— not submitted</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pin hint */}
      {!pinned && walls.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-100 dark:border-gray-700 pt-1.5">
          Click to pin
        </p>
      )}

      {/* Arrow */}
      {showBelow
        ? <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-white dark:border-b-gray-900" />
        : <div className="absolute top-full  left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-white dark:border-t-gray-900" />
      }
    </div>
  )
}

// ── Matrix table ───────────────────────────────────────────────────────────────
function MatrixTable({ data, projectName, floorLabel }) {
  const { trades, rooms } = data
  const scrollRef = useRef(null)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [hoverTip, setHoverTip]   = useState(null) // shown on mouse-enter
  const [pinnedTip, setPinnedTip] = useState(null) // locked on click

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [data])

  // Close pinned tooltip when clicking anywhere outside it
  useEffect(() => {
    if (!pinnedTip) return
    const handler = (e) => {
      if (!e.target.closest('[data-tooltip-pinned]')) setPinnedTip(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pinnedTip])

  const makeTipData = (e, room, trade, cellData) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top,
      cellY: rect.bottom,
      cellKey: `${room._id}-${trade._id}`,
      roomName: room.name,
      tradeName: trade.name,
      cellData,
    }
  }

  const showTooltip = (e, room, trade, cellData) => {
    if (!cellData || cellData.status === 'NA') return
    if (pinnedTip) return // don't override pinned with hover
    setHoverTip(makeTipData(e, room, trade, cellData))
  }

  const handleCellClick = (e, room, trade, cellData) => {
    if (!cellData || cellData.status === 'NA' || cellData.status === 'NOT_STARTED') return
    const key = `${room._id}-${trade._id}`
    if (pinnedTip?.cellKey === key) {
      setPinnedTip(null) // toggle off same cell
    } else {
      setPinnedTip(makeTipData(e, room, trade, cellData))
      setHoverTip(null)
    }
  }

  // Summary counts
  const counts = { DONE: 0, CROSS: 0, IN_PROGRESS: 0, NOT_STARTED: 0, NA: 0 }
  rooms.forEach(r => trades.forEach(t => {
    const s = r.tradeStatuses?.[String(t._id)]?.status || 'NOT_STARTED'
    counts[s] = (counts[s] || 0) + 1
  }))

  if (!rooms.length) return (
    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400">
      No rooms found for this floor.
    </div>
  )
  if (!trades.length) return (
    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400">
      No trades configured for walls on this floor.
    </div>
  )

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">

        {/* Info bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2.5 bg-blue-600 dark:bg-blue-700 gap-2">
          <div className="flex items-center gap-2 text-white min-w-0">
            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-semibold truncate">{projectName} › {floorLabel}</span>
            <span className="text-[11px] opacity-70 whitespace-nowrap">
              {rooms.length} rooms · {trades.length} trades
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {counts.DONE > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/20 text-emerald-200">✓ {counts.DONE}</span>
            )}
            {counts.CROSS > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100/20 text-red-200">✗ {counts.CROSS}</span>
            )}
            {counts.IN_PROGRESS > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/20 text-amber-200">◑ {counts.IN_PROGRESS}</span>
            )}
            {counts.NOT_STARTED > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-blue-100">— {counts.NOT_STARTED}</span>
            )}
          </div>
        </div>

        {canScrollRight && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 border-b border-orange-100 dark:border-orange-500/20 sm:hidden">
            <MoveHorizontal className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
            <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">Swipe left to see more trades</span>
          </div>
        )}

        <div ref={scrollRef} className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="text-xs border-collapse" style={{ minWidth: '100%' }}>
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700/70">
                <th
                  className="sticky left-0 z-20 px-2 sm:px-3 py-2.5 text-left font-bold text-gray-600 dark:text-gray-300
                    border-r border-b border-gray-200 dark:border-gray-600 whitespace-nowrap bg-gray-100 dark:bg-gray-700/70"
                  style={{ minWidth: 110 }}
                >
                  Room No.
                </th>
                {trades.map(trade => (
                  <th
                    key={String(trade._id)}
                    title={trade.name}
                    className={`px-1.5 py-2 text-center font-bold border-r border-b border-gray-200 dark:border-gray-600
                      ${trade.isRecurring
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-200'
                      }`}
                    style={{ minWidth: 64, maxWidth: 110, width: 80 }}
                  >
                    <span className="block text-[10px] leading-tight" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                      {trade.name}
                    </span>
                    {trade.isRecurring && (
                      <span className="mt-0.5 inline-block text-[8px] font-medium text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 px-1 py-px rounded">
                        recurring
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rooms.map((room, ri) => (
                <tr
                  key={String(room._id)}
                  className={`hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors ${
                    ri % 2 === 0 ? 'bg-white dark:bg-gray-800/10' : 'bg-gray-50/60 dark:bg-gray-800/30'
                  }`}
                >
                  <td
                    className={`sticky left-0 z-10 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-300
                      border-r border-gray-200 dark:border-gray-600 whitespace-nowrap truncate text-xs ${
                      ri % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/80'
                    }`}
                    style={{ minWidth: 110, maxWidth: 160, height: 36 }}
                    title={room.name}
                  >
                    {room.name}
                  </td>

                  {trades.map(trade => {
                    const tid = String(trade._id)
                    const cellData = room.tradeStatuses?.[tid]
                    const status = cellData?.status || 'NOT_STARTED'
                    const cfg = CELL_CFG[status]

                    return (
                      <td
                        key={tid}
                        className="p-0 border-b border-r border-gray-100 dark:border-gray-700/40"
                        style={{ height: 36, width: 80, minWidth: 64 }}
                      >
                        <div
                          className={`w-full h-full flex items-center justify-center
                            ${cfg ? cfg.bg : 'bg-gray-50 dark:bg-gray-700/20'}
                            ${status !== 'NA' && status !== 'NOT_STARTED' ? 'cursor-pointer' : 'cursor-default'}
                            ${pinnedTip?.cellKey === `${room._id}-${trade._id}` ? 'ring-2 ring-orange-400 ring-inset' : ''}`}
                          onMouseEnter={status !== 'NA' ? (e) => showTooltip(e, room, trade, cellData) : undefined}
                          onMouseLeave={() => setHoverTip(null)}
                          onClick={(e) => handleCellClick(e, room, trade, cellData)}
                        >
                          {cfg
                            ? <span className={`text-sm font-bold leading-none ${cfg.text}`}>{cfg.symbol}</span>
                            : status === 'NA'
                              ? <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>
                              : <span className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
                          }
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hover tooltip — shown only when nothing is pinned */}
      {!pinnedTip && hoverTip && (
        <TooltipContent tooltip={hoverTip} pinned={false} onClose={() => {}} />
      )}

      {/* Pinned tooltip — stays until dismissed */}
      {pinnedTip && (
        <div data-tooltip-pinned>
          <TooltipContent tooltip={pinnedTip} pinned={true} onClose={() => setPinnedTip(null)} />
        </div>
      )}
    </>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ChecklistMatrix() {
  const [projects,    setProjects]    = useState([])
  const [floors,      setFloors]      = useState([])
  const [selProject,  setSelProject]  = useState(() => sessionStorage.getItem('mxProject') || '')
  const [selFloor,    setSelFloor]    = useState(() => sessionStorage.getItem('mxFloor')   || '')
  const [loading,     setLoading]     = useState(false)
  const [matrixData,  setMatrixData]  = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const selProjectRef = useRef(selProject)
  const selFloorRef   = useRef(selFloor)
  const isMountRef    = useRef(true)
  selProjectRef.current = selProject
  selFloorRef.current   = selFloor

  const updatedLabel = useRelativeTime(lastUpdated)

  useEffect(() => {
    selProject ? sessionStorage.setItem('mxProject', selProject) : sessionStorage.removeItem('mxProject')
  }, [selProject])

  useEffect(() => {
    selFloor ? sessionStorage.setItem('mxFloor', selFloor) : sessionStorage.removeItem('mxFloor')
  }, [selFloor])

  useEffect(() => {
    adminGetProjects().then(r => setProjects(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (isMountRef.current) {
      isMountRef.current = false
      if (!selProject) return
      adminGetFloors(selProject).then(r => setFloors(r.data)).catch(() => {})
      return
    }
    setFloors([]); setSelFloor(''); setMatrixData(null); setLastUpdated(null)
    if (!selProject) return
    adminGetFloors(selProject).then(r => setFloors(r.data)).catch(() => {})
  }, [selProject])

  useEffect(() => {
    if (selProject && selFloor) loadMatrix(selProject, selFloor)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMatrix = useCallback(async (projectId, floorId, silent = false) => {
    const pid = projectId ?? selProjectRef.current
    const fid = floorId  ?? selFloorRef.current
    if (!pid || !fid) return
    if (!silent) setLoading(true)
    try {
      const res = await adminGetMatrix({ projectId: pid, floorId: fid })
      setMatrixData(res.data)
      setLastUpdated(Date.now())
    } catch (e) {
      console.error(e)
      if (!silent) toast.error('Failed to load matrix.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selProject && selFloor) loadMatrix(selProject, selFloor)
  }, [selFloor]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selProject || !selFloor) return
    const id = setInterval(() => loadMatrix(undefined, undefined, true), AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [selProject, selFloor, loadMatrix])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && selProjectRef.current && selFloorRef.current) {
        loadMatrix(undefined, undefined, true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadMatrix])

  const projectName = projects.find(p => p._id === selProject)?.name || ''
  const floorLabel  = floors.find(f => f._id === selFloor)?.label   || ''

  const selectCls = 'w-full appearance-none pl-3 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <AdminLayout>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Checklist Matrix</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Wall-level completion status per room and trade
            </p>
          </div>
          {selProject && selFloor && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => loadMatrix(selProject, selFloor)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-orange-400 hover:text-orange-500 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {updatedLabel && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                  <Radio className="w-2.5 h-2.5 text-emerald-400" />
                  {updatedLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:max-w-xl">
          <div className="relative">
            <select value={selProject} onChange={e => setSelProject(e.target.value)} className={selectCls}>
              <option value="">Select Project…</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={selFloor}
              onChange={e => setSelFloor(e.target.value)}
              disabled={!selProject || floors.length === 0}
              className={selectCls}
            >
              <option value="">Select Floor…</option>
              {floors.map(f => <option key={f._id} value={f._id}>{f.label} ({f.code})</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Content */}
        {!selProject || !selFloor ? (
          <div className="flex flex-col items-center justify-center h-40 sm:h-52 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 gap-3 text-gray-400 px-4 text-center">
            <LayoutGrid className="w-8 h-8 sm:w-10 sm:h-10 opacity-20" />
            <p className="text-xs sm:text-sm">Select a project and floor to view the checklist matrix</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-40 sm:h-52 text-gray-400 text-sm gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Building matrix…
          </div>
        ) : matrixData ? (
          <MatrixTable data={matrixData} projectName={projectName} floorLabel={floorLabel} />
        ) : null}

        {/* Legend */}
        {matrixData && (
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap pt-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400 dark:text-gray-500">Legend:</span>
            {Object.entries(CELL_CFG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <span className={`text-xs font-bold leading-none ${cfg.text}`}>{cfg.symbol}</span>
                </div>
                {cfg.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-50 dark:bg-gray-700/30">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
              </div>
              Not started
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-50 dark:bg-gray-700/30">
                <span className="text-[10px] text-gray-400">—</span>
              </div>
              Not assigned
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
