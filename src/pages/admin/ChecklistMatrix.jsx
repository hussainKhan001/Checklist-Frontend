import { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import {
  adminGetProjects, adminGetFloors, adminGetLocations, adminGetElements,
  adminGetTrades, adminGetCheckPoints, adminGetInspections,
} from '../../api'
import { RefreshCw, ChevronDown, LayoutGrid, MoveHorizontal, Radio, Building2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const CELL_CFG = {
  OK:      { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', symbol: '✓', label: 'OK'       },
  NOT_OK:  { bg: 'bg-red-100    dark:bg-red-500/20',      text: 'text-red-500    dark:text-red-400',      symbol: '✗', label: 'Not OK'   },
  PENDING: { bg: 'bg-amber-50   dark:bg-amber-500/15',    text: 'text-amber-500  dark:text-amber-400',    symbol: '·', label: 'Pending'  },
  DRAFT:   { bg: 'bg-blue-50    dark:bg-blue-500/15',     text: 'text-blue-400   dark:text-blue-400',     symbol: '✎', label: 'Draft'    },
}

function Cell({ status }) {
  if (!status) return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700/20">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
    </div>
  )
  const cfg = CELL_CFG[status]
  return (
    <div className={`w-full h-full flex items-center justify-center ${cfg.bg}`}>
      <span className={`text-sm font-bold leading-none ${cfg.text}`}>{cfg.symbol}</span>
    </div>
  )
}

function GridTable({ gridData, projectName, floorLabel }) {
  const { locations, tradeColumns, cellMap } = gridData
  const scrollRef = useRef(null)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [gridData])

  if (locations.length === 0) return (
    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400">
      No locations found for this floor.
    </div>
  )
  if (tradeColumns.length === 0) return (
    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400">
      No trades / checkpoints configured.
    </div>
  )

  const totalCp = tradeColumns.reduce((s, t) => s + t.checkpoints.length, 0)
  const counts  = Object.fromEntries(
    Object.keys(CELL_CFG).map(k => [k, Object.values(cellMap).filter(v => v === k).length])
  )

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">

      {/* Info bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2.5 bg-blue-600 dark:bg-blue-700 gap-2">
        <div className="flex items-center gap-2 text-white min-w-0">
          <LayoutGrid className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-semibold truncate">{projectName} › {floorLabel}</span>
          <span className="text-[11px] opacity-70 whitespace-nowrap">{locations.length} rooms · {totalCp} checkpoints</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(counts).map(([key, count]) => {
            if (!count) return null
            const cfg = CELL_CFG[key]
            return (
              <span key={key} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                {cfg.symbol} {count}
              </span>
            )
          })}
        </div>
      </div>

      {/* Scroll hint on mobile */}
      {canScrollRight && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 border-b border-orange-100 dark:border-orange-500/20 sm:hidden">
          <MoveHorizontal className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
          <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">Swipe left to see more checkpoints</span>
        </div>
      )}

      {/* Scrollable table */}
      <div ref={scrollRef} className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="text-xs border-collapse" style={{ minWidth: '100%' }}>
          <thead>
            {/* Row 1 — Trade group headers */}
            <tr className="bg-gray-100 dark:bg-gray-700/70">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 px-2 sm:px-3 py-2.5 text-left font-bold text-gray-600 dark:text-gray-300 border-r border-b border-gray-200 dark:border-gray-600 whitespace-nowrap bg-gray-100 dark:bg-gray-700/70"
                style={{ minWidth: 100 }}
              >
                Room No.
              </th>
              {tradeColumns.map(trade => (
                <th
                  key={trade._id}
                  colSpan={trade.checkpoints.length}
                  className="px-2 py-2 text-center font-bold text-gray-700 dark:text-gray-200 border-r border-b border-gray-200 dark:border-gray-600 whitespace-nowrap"
                >
                  {trade.name}
                </th>
              ))}
            </tr>

            {/* Row 2 — Checkpoint names */}
            <tr className="bg-gray-50 dark:bg-gray-800/80">
              {tradeColumns.map(trade =>
                trade.checkpoints.map((cp, ci) => (
                  <th
                    key={cp._id}
                    title={cp.title}
                    className={`py-2 px-1 text-center font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 ${
                      ci === trade.checkpoints.length - 1 ? 'border-r border-gray-300 dark:border-gray-600' : ''
                    }`}
                    style={{ minWidth: 40, maxWidth: 72, width: 52 }}
                  >
                    <span className="block text-[10px] leading-tight line-clamp-2" style={{ maxWidth: 72 }}>
                      {cp.title}
                    </span>
                  </th>
                ))
              )}
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
                  className={`sticky left-0 z-10 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 whitespace-nowrap truncate text-xs ${
                    li % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/80'
                  }`}
                  style={{ minWidth: 100, maxWidth: 160, height: 34 }}
                  title={loc.name}
                >
                  {loc.name}
                </td>

                {tradeColumns.map(trade =>
                  trade.checkpoints.map((cp, ci) => {
                    const status = cellMap[`${loc._id}:${cp._id}`] || null
                    return (
                      <td
                        key={cp._id}
                        className={`p-0 border-b border-gray-100 dark:border-gray-700/40 ${
                          ci === trade.checkpoints.length - 1
                            ? 'border-r border-gray-200 dark:border-gray-600'
                            : 'border-r border-gray-100 dark:border-gray-700/40'
                        }`}
                        style={{ height: 34, width: 52, minWidth: 40 }}
                        title={`${loc.name} — ${cp.title}: ${status || 'Not started'}`}
                      >
                        <Cell status={status} />
                      </td>
                    )
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FlatCards({ gridData }) {
  const { locations, tradeColumns, cellMap, wallCounts = {} } = gridData
  const [expanded, setExpanded] = useState({})

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const allCpCount = tradeColumns.reduce((s, t) => s + t.checkpoints.length, 0)

  return (
    <div className="space-y-3">
      {locations.map(loc => {
        const locId  = String(loc._id)
        const walls  = wallCounts[locId] || 0
        const cpIds  = tradeColumns.flatMap(t => t.checkpoints.map(cp => cp._id))
        const stats  = { OK: 0, NOT_OK: 0, PENDING: 0, empty: 0 }
        cpIds.forEach(cpId => {
          const v = cellMap[`${locId}:${cpId}`]
          if (!v) stats.empty++
          else stats[v] = (stats[v] || 0) + 1
        })
        const done   = stats.OK + stats.NOT_OK + stats.PENDING
        const pct    = allCpCount ? Math.round((stats.OK / allCpCount) * 100) : 0
        const isOpen = expanded[locId]

        return (
          <div key={locId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">

            {/* Header row */}
            <button
              onClick={() => toggle(locId)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{loc.name}</span>
                {walls > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
                    {walls} walls
                  </span>
                )}
              </div>

              {/* Status chips */}
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                {stats.OK > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    ✓ {stats.OK}
                  </span>
                )}
                {stats.NOT_OK > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400">
                    ✗ {stats.NOT_OK}
                  </span>
                )}
                {stats.PENDING > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-500 dark:text-amber-400">
                    · {stats.PENDING}
                  </span>
                )}
                {stats.empty > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-400">
                    — {stats.empty}
                  </span>
                )}
              </div>

              {/* Progress bar + % */}
              <div className="flex items-center gap-2 flex-shrink-0 w-28 sm:w-36">
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : pct > 0 ? 'bg-orange-400' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-9 text-right">{done}/{allCpCount}</span>
              </div>

              <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Trade breakdown (expanded) */}
            {isOpen && (
              <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/50">
                {tradeColumns.map(trade => {
                  const ts = { OK: 0, NOT_OK: 0, PENDING: 0, empty: 0 }
                  trade.checkpoints.forEach(cp => {
                    const v = cellMap[`${locId}:${cp._id}`]
                    if (!v) ts.empty++; else ts[v] = (ts[v] || 0) + 1
                  })
                  const tDone = ts.OK + ts.NOT_OK + ts.PENDING
                  const tPct  = trade.checkpoints.length ? Math.round((ts.OK / trade.checkpoints.length) * 100) : 0

                  // How many walls covered for this trade?
                  // A wall is "covered" when it has no dash cells for this trade
                  const covered = tDone > 0 ? `${tDone}/${trade.checkpoints.length} cp` : null

                  return (
                    <div key={trade._id} className="flex items-center gap-3 px-5 py-2.5 bg-gray-50/50 dark:bg-gray-800/50">
                      <span className="text-xs text-gray-600 dark:text-gray-400 min-w-0 flex-1 truncate" title={trade.name}>{trade.name}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {ts.OK > 0      && <span className="text-[10px] font-bold text-emerald-500">✓{ts.OK}</span>}
                        {ts.NOT_OK > 0  && <span className="text-[10px] font-bold text-red-500">✗{ts.NOT_OK}</span>}
                        {ts.PENDING > 0 && <span className="text-[10px] font-bold text-amber-500">·{ts.PENDING}</span>}
                        {ts.empty > 0   && <span className="text-[10px] text-gray-400">—{ts.empty}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${tPct === 100 ? 'bg-emerald-500' : tPct > 0 ? 'bg-blue-400' : ''}`}
                            style={{ width: `${tPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 w-8 text-right">{tDone}/{trade.checkpoints.length}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const AUTO_REFRESH_MS = 30_000

function useRelativeTime(ts) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!ts) { setLabel(''); return }
    const update = () => {
      const sec = Math.floor((Date.now() - ts) / 1000)
      if (sec < 5)  setLabel('just now')
      else if (sec < 60) setLabel(`${sec}s ago`)
      else setLabel(`${Math.floor(sec / 60)}m ago`)
    }
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [ts])
  return label
}

export default function ChecklistMatrix() {
  const [projects,   setProjects]   = useState([])
  const [floors,     setFloors]     = useState([])
  const [selProject, setSelProject] = useState(() => sessionStorage.getItem('mxProject') || '')
  const [selFloor,   setSelFloor]   = useState(() => sessionStorage.getItem('mxFloor')   || '')
  const [loading,    setLoading]    = useState(false)
  const [gridData,   setGridData]   = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [view,        setView]       = useState('grid') // 'grid' | 'flats'
  const selProjectRef = useRef(selProject)
  const selFloorRef   = useRef(selFloor)
  const isMountRef    = useRef(true)
  selProjectRef.current = selProject
  selFloorRef.current   = selFloor

  const updatedLabel = useRelativeTime(lastUpdated)

  // Persist selection to sessionStorage so navigating away and back restores it
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
    // On initial mount with a restored project, load floors without wiping the floor selection
    if (isMountRef.current) {
      isMountRef.current = false
      if (!selProject) return
      adminGetFloors(selProject).then(r => setFloors(r.data)).catch(() => {})
      return
    }
    // On subsequent project changes, reset floor and grid
    setFloors([]); setSelFloor(''); setGridData(null); setLastUpdated(null)
    if (!selProject) return
    adminGetFloors(selProject).then(r => setFloors(r.data)).catch(() => {})
  }, [selProject])

  // On mount with both project+floor restored, load grid immediately (get fresh data)
  useEffect(() => {
    if (selProject && selFloor) loadGrid(selProject, selFloor)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadGrid = useCallback(async (projectId, floorId, silent = false) => {
    const pid = projectId ?? selProjectRef.current
    const fid = floorId  ?? selFloorRef.current
    if (!pid || !fid) return
    if (!silent) setLoading(true)
    try {
      // Phase 1 — locations + trades + inspections in parallel
      const [locRes, tradeRes, insRes] = await Promise.all([
        adminGetLocations(fid),
        adminGetTrades(),
        adminGetInspections({ projectId: pid, floorId: fid, includeResults: true }),
      ])

      const locations = locRes.data.filter(l => !l.isHidden)
      const trades    = tradeRes.data.filter(t => !t.isHidden).sort((a, b) => (a.order || 0) - (b.order || 0))

      // Phase 2 — checkpoints per trade + elements per location, fully parallel
      const [cpBatch, elemBatch] = await Promise.all([
        Promise.all(trades.map(t => adminGetCheckPoints(t._id).catch(() => ({ data: [] })))),
        Promise.all(locations.map(loc => adminGetElements(loc._id).catch(() => ({ data: [] })))),
      ])

      const tradeColumns = trades
        .map((t, i) => ({
          ...t,
          checkpoints: (cpBatch[i]?.data || []).filter(c => !c.isHidden).sort((a, b) => (a.order || 0) - (b.order || 0)),
        }))
        .filter(t => t.checkpoints.length > 0)

      // locElements: locId → [elemId, ...] (all walls of each flat)
      const locElements = {}
      locations.forEach((loc, i) => {
        locElements[String(loc._id)] = (elemBatch[i]?.data || []).map(e => String(e._id))
      })

      // Submitted inspections only — newest first (API guarantees createdAt: -1)
      const submitted = insRes.data.filter(i => i.status !== 'DRAFT')

      // rawMap: `locId:cpId:elemId` → result (newest submitted wins per wall)
      // elemId is 'null' when inspection was submitted without selecting a wall
      const rawMap = {}
      submitted.forEach(insp => {
        const locId  = String(insp.locationId?._id ?? insp.locationId)
        const elemId = insp.elementId
          ? String(insp.elementId?._id ?? insp.elementId)
          : 'null'
        ;(insp.results || []).forEach(r => {
          const cpId = String(r.checkPointId?._id ?? r.checkPointId)
          if (!locId || !cpId) return
          const key = `${locId}:${cpId}:${elemId}`
          if (!(key in rawMap)) rawMap[key] = r.result
        })
      })

      // tradeInspected: `locId:tradeId` → Set<elemId> that have been inspected
      const tradeInspected = {}
      submitted.forEach(insp => {
        const locId   = String(insp.locationId?._id ?? insp.locationId)
        const elemId  = insp.elementId ? String(insp.elementId?._id ?? insp.elementId) : 'null'
        const tradeId = String(insp.tradeId?._id ?? insp.tradeId)
        const k = `${locId}:${tradeId}`
        if (!tradeInspected[k]) tradeInspected[k] = new Set()
        tradeInspected[k].add(elemId)
      })

      const cellMap = {}
      locations.forEach(loc => {
        const locId    = String(loc._id)
        const allElems = locElements[locId] || []

        tradeColumns.forEach(trade => {
          const tradeId      = String(trade._id)
          const coveredElems = tradeInspected[`${locId}:${tradeId}`] || new Set()

          trade.checkpoints.forEach(cp => {
            const cpId    = String(cp._id)
            const cellKey = `${locId}:${cpId}`

            // ── Case A: location has NO elements configured ──────────────────────
            // Fall back to direct inspection result (old behaviour)
            if (allElems.length === 0) {
              // Use any result found for this loc+cp (across all elemIds in rawMap)
              const directKey = `${locId}:${cpId}:null`
              if (rawMap[directKey]) { cellMap[cellKey] = rawMap[directKey]; return }
              // Also check element-specific inspections submitted for this room
              const anyResult = [...coveredElems]
                .map(eId => rawMap[`${locId}:${cpId}:${eId}`])
                .find(v => v)
              cellMap[cellKey] = anyResult || null
              return
            }

            // ── Case B: location HAS elements — require ALL walls covered ────────
            const allWallsCovered = allElems.every(eId => coveredElems.has(eId))

            if (!allWallsCovered) {
              // Not all walls inspected yet — show partial aggregate of what exists
              const partialResults = allElems
                .map(eId => rawMap[`${locId}:${cpId}:${eId}`])
                .filter(Boolean)
              if (partialResults.length === 0) { cellMap[cellKey] = null; return }
              // Show what we have — user can see progress even if incomplete
              if (partialResults.every(r => r === 'OK'))    { cellMap[cellKey] = 'OK';      return }
              if (partialResults.some(r => r === 'NOT_OK')) { cellMap[cellKey] = 'NOT_OK';  return }
              cellMap[cellKey] = 'PENDING'
              return
            }

            // All walls covered — strict aggregate
            const results = allElems.map(eId => rawMap[`${locId}:${cpId}:${eId}`])
            if (results.some(r => r == null))         { cellMap[cellKey] = null;     return }
            if (results.every(r => r === 'OK'))        { cellMap[cellKey] = 'OK';     return }
            if (results.some(r => r === 'NOT_OK'))     { cellMap[cellKey] = 'NOT_OK'; return }
            cellMap[cellKey] = 'PENDING'
          })
        })
      })

      // Also store wall counts for FlatCards component
      const wallCounts = {}
      locations.forEach(loc => {
        wallCounts[String(loc._id)] = locElements[String(loc._id)]?.length || 0
      })

      setGridData({ locations, tradeColumns, cellMap, locElements, wallCounts })
      setLastUpdated(Date.now())
    } catch (e) {
      console.error(e)
      if (!silent) toast.error('Failed to load matrix data.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Load on floor selection
  useEffect(() => {
    if (selProject && selFloor) loadGrid(selProject, selFloor)
  }, [selFloor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30s (silent — no spinner)
  useEffect(() => {
    if (!selProject || !selFloor) return
    const id = setInterval(() => {
      loadGrid(undefined, undefined, true)
    }, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [selProject, selFloor, loadGrid])

  // Refresh when tab regains focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && selProjectRef.current && selFloorRef.current) {
        loadGrid(undefined, undefined, true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadGrid])

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
              {view === 'flats' ? 'Flat-wise progress tracking' : 'Per-room inspection responses across all checkpoints'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {/* View toggle */}
            {gridData && (
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setView('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${view === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Matrix</span>
                </button>
                <button
                  onClick={() => setView('flats')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${view === 'flats' ? 'bg-orange-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flats</span>
                </button>
              </div>
            )}
            {selProject && selFloor && (
              <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => loadGrid(selProject, selFloor)}
                disabled={loading}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-orange-400 hover:text-orange-500 transition-colors disabled:opacity-50"
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
        </div>

        {/* Selectors — stack on mobile, row on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:max-w-xl">
          <div className="relative">
            <select
              value={selProject}
              onChange={e => setSelProject(e.target.value)}
              className={selectCls}
            >
              <option value="">Select Project…</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
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
              {floors.map(f => (
                <option key={f._id} value={f._id}>{f.label} ({f.code})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Content area */}
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
        ) : gridData ? (
          view === 'flats'
            ? <FlatCards gridData={gridData} />
            : <GridTable gridData={gridData} projectName={projectName} floorLabel={floorLabel} />
        ) : null}

        {/* Legend */}
        {gridData && (
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
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
