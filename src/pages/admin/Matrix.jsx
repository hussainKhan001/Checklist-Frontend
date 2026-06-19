import { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { adminGetProjects, adminGetFloors, adminGetMatrix } from '../../api'
import { RefreshCw, ChevronDown, Grid3X3, Radio, MoveHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  DONE:    { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', symbol: '✓', label: 'All Done' },
  PARTIAL: { bg: 'bg-amber-50 dark:bg-amber-500/15',      text: 'text-amber-500 dark:text-amber-400',    symbol: '◑', label: 'Partial'  },
}

const AUTO_REFRESH_MS = 30_000

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

function MatrixTable({ data, projectName, floorLabel }) {
  const { locations, trades, cells, cellDetails } = data
  const scrollRef = useRef(null)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [data])

  const showTooltip = (e, cellKey, tradeName, locName) => {
    const details = cellDetails[cellKey]
    if (!details || details.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, details, tradeName, locName })
  }
  const hideTooltip = () => setTooltip(null)

  if (!locations.length) return (
    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400">
      No rooms found for this floor.
    </div>
  )
  if (!trades.length) return (
    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400">
      No trades configured for walls on this floor.
    </div>
  )

  const totalCells = locations.length * trades.length
  const doneCells  = Object.values(cells).filter(v => v === 'DONE').length
  const partCells  = Object.values(cells).filter(v => v === 'PARTIAL').length

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">

        {/* Info bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2.5 bg-blue-600 dark:bg-blue-700 gap-2">
          <div className="flex items-center gap-2 text-white min-w-0">
            <Grid3X3 className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-semibold truncate">{projectName} › {floorLabel}</span>
            <span className="text-[11px] opacity-70 whitespace-nowrap">
              {locations.length} rooms · {trades.length} trades
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {doneCells > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/20 text-emerald-200">
                ✓ {doneCells}
              </span>
            )}
            {partCells > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/20 text-amber-200">
                ◑ {partCells}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-blue-100">
              — {totalCells - doneCells - partCells} pending
            </span>
          </div>
        </div>

        {/* Mobile scroll hint */}
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
                  Room
                </th>
                {trades.map(trade => (
                  <th
                    key={trade._id}
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
              {locations.map((loc, li) => (
                <tr
                  key={loc._id}
                  className={`hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors ${
                    li % 2 === 0 ? 'bg-white dark:bg-gray-800/10' : 'bg-gray-50/60 dark:bg-gray-800/30'
                  }`}
                >
                  <td
                    className={`sticky left-0 z-10 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-300
                      border-r border-gray-200 dark:border-gray-600 whitespace-nowrap truncate text-xs ${
                      li % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/80'
                    }`}
                    style={{ minWidth: 110, maxWidth: 160, height: 36 }}
                    title={loc.name}
                  >
                    {loc.name}
                  </td>

                  {trades.map(trade => {
                    const cellKey = `${loc._id}:${trade._id}`
                    const status = cells[cellKey] || null
                    const cfg = status ? STATUS_CFG[status] : null
                    const hasDetails = (cellDetails[cellKey] || []).length > 0

                    return (
                      <td
                        key={trade._id}
                        className="p-0 border-b border-r border-gray-100 dark:border-gray-700/40"
                        style={{ height: 36, width: 80, minWidth: 64 }}
                      >
                        <div
                          className={`w-full h-full flex items-center justify-center cursor-default
                            ${cfg ? cfg.bg : 'bg-gray-50 dark:bg-gray-700/20'}
                            ${hasDetails ? 'cursor-pointer' : ''}`}
                          onMouseEnter={hasDetails ? (e) => showTooltip(e, cellKey, trade.name, loc.name) : undefined}
                          onMouseLeave={hasDetails ? hideTooltip : undefined}
                        >
                          {cfg
                            ? <span className={`text-sm font-bold leading-none ${cfg.text}`}>{cfg.symbol}</span>
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

      {/* Fixed-position tooltip — rendered outside overflow container so it's never clipped */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none
            bg-gray-900 dark:bg-gray-800 text-white rounded-xl px-3 py-2.5 shadow-2xl
            border border-gray-700 dark:border-gray-600
            w-max min-w-[150px] max-w-[220px]"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%) translateY(calc(-100% - 8px))',
          }}
        >
          <div className="text-[10px] font-bold mb-1.5 leading-tight">
            <span className="block text-gray-300 truncate">{tooltip.locName}</span>
            <span className="block text-orange-400 truncate">{tooltip.tradeName}</span>
            <span className="text-gray-500">
              {tooltip.details.filter(d => d.submitted).length}/{tooltip.details.length} walls done
            </span>
          </div>
          <div className="space-y-1">
            {tooltip.details.map(d => (
              <div key={d.elementId} className="flex items-center gap-2">
                <span className={`flex-shrink-0 w-[18px] h-[18px] rounded flex items-center justify-center text-[9px] font-bold
                  ${d.submitted ? 'bg-emerald-500/80 text-white' : 'bg-gray-600/60 text-gray-400'}`}>
                  {d.submitted ? '✓' : '—'}
                </span>
                <span className="text-[11px] truncate text-gray-200">{d.name}</span>
              </div>
            ))}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900 dark:border-t-gray-800" />
        </div>
      )}
    </>
  )
}

export default function Matrix() {
  const [projects,    setProjects]    = useState([])
  const [floors,      setFloors]      = useState([])
  const [selProject,  setSelProject]  = useState(() => sessionStorage.getItem('wxProject') || '')
  const [selFloor,    setSelFloor]    = useState(() => sessionStorage.getItem('wxFloor')   || '')
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
    selProject ? sessionStorage.setItem('wxProject', selProject) : sessionStorage.removeItem('wxProject')
  }, [selProject])

  useEffect(() => {
    selFloor ? sessionStorage.setItem('wxFloor', selFloor) : sessionStorage.removeItem('wxFloor')
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
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Wall Matrix</h1>
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
            <Grid3X3 className="w-8 h-8 sm:w-10 sm:h-10 opacity-20" />
            <p className="text-xs sm:text-sm">Select a project and floor to view the wall matrix</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-40 sm:h-52 text-gray-400 text-sm gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading matrix…
          </div>
        ) : matrixData ? (
          <MatrixTable data={matrixData} projectName={projectName} floorLabel={floorLabel} />
        ) : null}

        {/* Legend */}
        {matrixData && (
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap pt-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400 dark:text-gray-500">Legend:</span>
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
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
              <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-50 dark:bg-blue-500/10">
                <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400">R</span>
              </div>
              Recurring trade
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
