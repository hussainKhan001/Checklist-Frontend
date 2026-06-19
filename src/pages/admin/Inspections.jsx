import { Fragment, useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { adminGetInspections, adminDeleteInspection } from '../../api'
import StatusBadge from '../../components/ui/StatusBadge'
import { useConfirm } from '../../context/ConfirmContext'
import { useAuth } from '../../context/AuthContext'
import { Search, Trash2, ChevronUp, ClipboardList, X, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const fmtTime     = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
const fmtDateTime = (d) => d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—'

const EVENT_CONFIG = {
  DRAFT_CREATED:  { color: 'bg-blue-400',   label: 'Draft created',  textColor: 'text-blue-600 dark:text-blue-400' },
  PHOTO_UPLOADED: { color: 'bg-gray-400',    label: 'Photo uploaded', textColor: 'text-gray-500 dark:text-gray-400' },
  SUBMITTED:      { color: 'bg-emerald-500', label: 'Submitted',      textColor: 'text-emerald-600 dark:text-emerald-400' },
}

function InspectionTimeline({ inspection }) {
  const okCount      = inspection.results?.filter(r => r.result === 'OK').length     || 0
  const notOkCount   = inspection.results?.filter(r => r.result === 'NOT_OK').length || 0
  const pendingCount = inspection.results?.filter(r => r.result === 'PENDING').length || 0
  const timeline     = inspection.timeline || []

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="sm:w-40 flex sm:flex-col gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 w-full">Checkpoints</span>
        {okCount > 0      && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{okCount} OK</span>}
        {notOkCount > 0   && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400">{notOkCount} Not OK</span>}
        {pendingCount > 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">{pendingCount} Pending</span>}
        {inspection.workNotes && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic">"{inspection.workNotes}"</div>
        )}
      </div>
      <div className="flex-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Timeline</span>
        {timeline.length === 0 ? (
          <p className="text-xs text-gray-400">No timeline events.</p>
        ) : (
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-1 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
            {timeline.map((item, idx) => {
              const cfg = EVENT_CONFIG[item.event]
              if (!cfg) return null
              return (
                <div key={idx} className="relative mb-2.5 last:mb-0">
                  <div className={`absolute -left-2.5 top-1 w-2 h-2 rounded-full ${cfg.color}`} />
                  <p className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{fmtDateTime(item.timestamp)}</p>
                  {item.details && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{item.details}</p>}
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Last edited: {fmtDateTime(inspection.updatedAt)}</p>
        </div>
      </div>
    </div>
  )
}

const selCls = 'w-full appearance-none pl-3 pr-7 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed'

export default function Inspections() {
  const [inspections,  setInspections]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [expandedRows, setExpandedRows] = useState(new Set())

  // All filter state lives in the URL — survives navigation + back button
  const [urlParams, setUrlParams] = useSearchParams()
  const navigate    = useNavigate()
  const confirm     = useConfirm()
  const { hasPermission } = useAuth()
  const canManage   = hasPermission('manage_inspections')

  const statusFilter = urlParams.get('status')   || ''
  const search       = urlParams.get('q')        || ''
  const fProject     = urlParams.get('project')  || ''
  const fFloor       = urlParams.get('floor')    || ''
  const fRoom        = urlParams.get('room')     || ''
  const fWall        = urlParams.get('wall')     || ''
  const fTrade       = urlParams.get('trade')    || ''
  const fDateFrom    = urlParams.get('dateFrom') || ''
  const fDateTo      = urlParams.get('dateTo')   || ''
  const showFilters  = urlParams.get('filters') === '1'

  const patch = (changes) => setUrlParams(prev => {
    const next = new URLSearchParams(prev)
    Object.entries(changes).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k) })
    return next
  }, { replace: true })

  useEffect(() => {
    setLoading(true)
    adminGetInspections(statusFilter).then(r => setInspections(r.data)).finally(() => setLoading(false))
  }, [statusFilter])

  const handleProject = (v) => patch({ project: v, floor: '', room: '', wall: '' })
  const handleFloor   = (v) => patch({ floor: v, room: '', wall: '' })
  const handleRoom    = (v) => patch({ room: v, wall: '' })

  const activeCount = [fProject, fFloor, fRoom, fWall, fTrade, fDateFrom, fDateTo].filter(Boolean).length
  const clearAll    = () => patch({ project: '', floor: '', room: '', wall: '', trade: '', q: '', dateFrom: '', dateTo: '' })

  // ── Derive unique options from loaded data ───────────────────────────────────
  const projectOpts = useMemo(() => {
    const map = {}
    inspections.forEach(i => { if (i.projectId) map[i.projectId._id] = i.projectId.name })
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [inspections])

  const floorOpts = useMemo(() => {
    const map = {}
    inspections
      .filter(i => !fProject || i.projectId?._id === fProject)
      .forEach(i => { if (i.floorId) map[i.floorId._id] = i.floorId.label })
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [inspections, fProject])

  const roomOpts = useMemo(() => {
    const map = {}
    inspections
      .filter(i => (!fProject || i.projectId?._id === fProject) && (!fFloor || i.floorId?._id === fFloor))
      .forEach(i => { if (i.locationId) map[i.locationId._id] = i.locationId.name })
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [inspections, fProject, fFloor])

  const wallOpts = useMemo(() => {
    const map = {}
    inspections
      .filter(i =>
        (!fProject || i.projectId?._id === fProject) &&
        (!fFloor   || i.floorId?._id   === fFloor)   &&
        (!fRoom    || i.locationId?._id === fRoom)
      )
      .forEach(i => { if (i.elementId) map[i.elementId._id] = i.elementId.name })
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [inspections, fProject, fFloor, fRoom])

  const tradeOpts = useMemo(() => {
    const map = {}
    inspections.forEach(i => { if (i.tradeId) map[i.tradeId._id] = i.tradeId.name })
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [inspections])

  // ── Apply filters ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => inspections.filter(i => {
    const q = search.toLowerCase()
    if (q && !(
      i.projectId?.name?.toLowerCase().includes(q)  ||
      i.tradeId?.name?.toLowerCase().includes(q)    ||
      i.locationId?.name?.toLowerCase().includes(q) ||
      i.elementId?.name?.toLowerCase().includes(q)  ||
      i.checkedBy?.toLowerCase().includes(q)
    )) return false
    if (fProject && i.projectId?._id !== fProject)  return false
    if (fFloor   && i.floorId?._id   !== fFloor)    return false
    if (fRoom    && i.locationId?._id !== fRoom)     return false
    if (fWall    && i.elementId?._id  !== fWall)     return false
    if (fTrade   && i.tradeId?._id    !== fTrade)    return false
    if (fDateFrom || fDateTo) {
      const d = i.dateOfCheck ? new Date(i.dateOfCheck).toISOString().slice(0, 10) : ''
      if (fDateFrom && d < fDateFrom) return false
      if (fDateTo   && d > fDateTo)   return false
    }
    return true
  }), [inspections, search, fProject, fFloor, fRoom, fWall, fTrade, fDateFrom, fDateTo])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    const ok = await confirm('Delete this inspection?', 'This cannot be undone.')
    if (!ok) return
    await adminDeleteInspection(id)
    setInspections(prev => prev.filter(i => i._id !== id))
    toast.success('Inspection deleted')
  }

  const toggleRow = (id, e) => {
    e.stopPropagation()
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inspections</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {filtered.length} of {inspections.length} records
            </p>
          </div>
          {activeCount > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors">
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        {/* Row 1: Search + Status toggle + Filter toggle */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
              placeholder="Search project, trade, room, wall, engineer…"
              value={search}
              onChange={e => patch({ q: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            {/* Status toggle */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {['', 'SUBMITTED', 'DRAFT'].map(s => (
                <button
                  key={s}
                  onClick={() => patch({ status: s })}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    statusFilter === s
                      ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>

            {/* Filter toggle button */}
            <button
              onClick={() => patch({ filters: showFilters ? '' : '1' })}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                showFilters || activeCount > 0
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-500/10 text-orange-500'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-orange-400 hover:text-orange-500'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Cascading filters (collapsible) */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Project */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-0.5">Project</label>
              <select value={fProject} onChange={e => handleProject(e.target.value)} className={selCls}>
                <option value="">All</option>
                {projectOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Floor */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-0.5">Floor</label>
              <select value={fFloor} onChange={e => handleFloor(e.target.value)} disabled={!fProject} className={selCls}>
                <option value="">All</option>
                {floorOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Room */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-0.5">Room</label>
              <select value={fRoom} onChange={e => handleRoom(e.target.value)} disabled={!fFloor} className={selCls}>
                <option value="">All</option>
                {roomOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Wall */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-0.5">Wall</label>
              <select value={fWall} onChange={e => patch({ wall: e.target.value })} disabled={!fRoom} className={selCls}>
                <option value="">All</option>
                {wallOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Trade */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-0.5">Trade</label>
              <select value={fTrade} onChange={e => patch({ trade: e.target.value })} className={selCls}>
                <option value="">All</option>
                {tradeOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Date From */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-0.5">From</label>
              <input
                type="date"
                value={fDateFrom}
                max={fDateTo || undefined}
                onChange={e => patch({ dateFrom: e.target.value })}
                className={selCls}
              />
            </div>

            {/* Date To */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-0.5">To</label>
              <input
                type="date"
                value={fDateTo}
                min={fDateFrom || undefined}
                onChange={e => patch({ dateTo: e.target.value })}
                className={selCls}
              />
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {['Project', 'Floor › Location', 'Trade', 'Date', 'Engineer', 'Progress', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map(ins => {
                    const ok       = ins.results?.filter(r => r.result === 'OK').length || 0
                    const total    = ins.results?.length || 0
                    const pct      = total > 0 ? Math.round((ok / total) * 100) : 0
                    const expanded = expandedRows.has(ins._id)

                    return (
                      <Fragment key={ins._id}>
                        <tr
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/inspections/${ins._id}`)}
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{ins.projectId?.name}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {ins.floorId?.label} › {ins.locationId?.name}
                            {ins.elementId && (
                              <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">› {ins.elementId?.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{ins.tradeId?.name}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(ins.dateOfCheck)}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{ins.checkedBy || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-[80px]">
                              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap">{ok}/{total}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={ins.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={e => toggleRow(ins._id, e)}
                                title="Timeline"
                                className={`p-1.5 rounded-lg transition-colors ${
                                  expanded
                                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-500'
                                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500'
                                }`}
                              >
                                {expanded ? <ChevronUp className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                              </button>
                              {canManage && (
                                <button
                                  onClick={e => handleDelete(ins._id, e)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {expanded && (
                          <tr key={`tl-${ins._id}`} className="bg-gray-50/70 dark:bg-gray-700/20">
                            <td colSpan={8} className="px-5 py-4">
                              <InspectionTimeline inspection={ins} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                        No inspections match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
