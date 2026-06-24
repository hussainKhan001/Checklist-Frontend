import { Fragment, useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { adminGetInspections, adminDeleteInspection } from '../../services/api'
import StatusBadge from '../../components/ui/StatusBadge'
import Dropdown from '../../components/ui/Dropdown'
import DatePicker from '../../components/ui/DatePicker'
import { useConfirm } from '../../context/ConfirmContext'
import { useAuth } from '../../context/AuthContext'
import {
  Search, Trash2, ChevronDown, ChevronRight, ClipboardList,
  X, Building2, Layers, DoorOpen, Columns, LayoutGrid,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'

const EVENT_CONFIG = {
  DRAFT_CREATED:  { color: 'bg-blue-400',   label: 'Draft created',  textColor: 'text-blue-600 dark:text-blue-400' },
  PHOTO_UPLOADED: { color: 'bg-gray-400',    label: 'Photo uploaded', textColor: 'text-gray-500 dark:text-gray-400' },
  SUBMITTED:      { color: 'bg-emerald-500', label: 'Submitted',      textColor: 'text-emerald-600 dark:text-emerald-400' },
}

function InspectionTimeline({ inspection }) {
  const ok      = inspection.results?.filter(r => r.result === 'OK').length     || 0
  const notOk   = inspection.results?.filter(r => r.result === 'NOT_OK').length || 0
  const pending = inspection.results?.filter(r => r.result === 'PENDING').length || 0
  const tl      = inspection.timeline || []
  return (
    <div className="flex flex-col sm:flex-row gap-4 py-1">
      <div className="sm:w-40 flex sm:flex-col gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 w-full">Checkpoints</span>
        {ok > 0      && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{ok} OK</span>}
        {notOk > 0   && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400">{notOk} Not OK</span>}
        {pending > 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">{pending} Pending</span>}
        {inspection.workNotes && <p className="mt-1 text-xs text-gray-500 italic">"{inspection.workNotes}"</p>}
      </div>
      <div className="flex-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Timeline</span>
        {tl.length === 0 ? (
          <p className="text-xs text-gray-400">No events.</p>
        ) : (
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-1 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
            {tl.map((item, i) => {
              const cfg = EVENT_CONFIG[item.event]
              if (!cfg) return null
              return (
                <div key={i} className="relative mb-2.5 last:mb-0">
                  <div className={`absolute -left-2.5 top-1 w-2 h-2 rounded-full ${cfg.color}`} />
                  <p className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</p>
                  <p className="text-[10px] text-gray-400">{fmtDateTime(item.timestamp)}</p>
                  {item.details && <p className="text-[10px] text-gray-400 mt-0.5">{item.details}</p>}
                </div>
              )
            })}
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
          Last edited: {fmtDateTime(inspection.updatedAt)}
        </p>
      </div>
    </div>
  )
}

function SummaryPills({ items }) {
  const sub   = items.filter(i => i.status === 'SUBMITTED').length
  const draft = items.filter(i => i.status === 'DRAFT').length
  return (
    <div className="flex items-center gap-1.5 ml-1">
      <span className="text-[10px] text-gray-400">{items.length}</span>
      {sub   > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">{sub}✓</span>}
      {draft > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">{draft}●</span>}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Inspections() {
  const [inspections,  setInspections]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [treeOpen,     setTreeOpen]     = useState({ p: new Set(), f: new Set() })
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [treeSearch,   setTreeSearch]   = useState('')

  const [urlParams, setUrlParams] = useSearchParams()
  const navigate  = useNavigate()
  const confirm   = useConfirm()
  const { hasPermission } = useAuth()
  const canManage = hasPermission('manage_inspections')

  const statusFilter = urlParams.get('status')   || ''
  const search       = urlParams.get('q')        || ''
  const fTrade       = urlParams.get('trade')    || ''
  const fDateFrom    = urlParams.get('dateFrom') || ''
  const fDateTo      = urlParams.get('dateTo')   || ''

  const patch = (changes) => setUrlParams(prev => {
    const next = new URLSearchParams(prev)
    Object.entries(changes).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k) })
    return next
  }, { replace: true })

  const loadInspections = useCallback(() => {
    setLoading(true)
    adminGetInspections(statusFilter).then(r => setInspections(r.data)).finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { loadInspections() }, [loadInspections])

  useEffect(() => {
    let ch
    try {
      ch = new BroadcastChannel('nqc-inspections')
      ch.onmessage = () => loadInspections()
    } catch {}
    return () => { try { ch?.close() } catch {} }
  }, [loadInspections])

  // ── Left tree (all inspections, unfiltered) ────────────────────────────────
  const tree = useMemo(() => {
    const projects = {}
    inspections.forEach(i => {
      const pid = i.projectId?._id  || 'unknown'
      const fid = i.floorId?._id    || 'unknown'
      const rid = i.locationId?._id || 'unknown'
      if (!projects[pid]) projects[pid] = { id: pid, name: i.projectId?.name || '?', floors: {} }
      const p = projects[pid]
      if (!p.floors[fid]) p.floors[fid] = { id: fid, name: i.floorId?.label || '?', rooms: {} }
      const f = p.floors[fid]
      if (!f.rooms[rid]) f.rooms[rid] = { id: rid, name: i.locationId?.name || '?', count: 0, sub: 0, draft: 0 }
      f.rooms[rid].count++
      if (i.status === 'SUBMITTED') f.rooms[rid].sub++
      if (i.status === 'DRAFT')     f.rooms[rid].draft++
    })
    return Object.values(projects).sort((a, b) => a.name.localeCompare(b.name)).map(p => {
      const floors = Object.values(p.floors).sort((a, b) => a.name.localeCompare(b.name)).map(f => {
        const rooms = Object.values(f.rooms).sort((a, b) => a.name.localeCompare(b.name))
        return {
          ...f, rooms,
          count: rooms.reduce((s, r) => s + r.count, 0),
          sub:   rooms.reduce((s, r) => s + r.sub, 0),
          draft: rooms.reduce((s, r) => s + r.draft, 0),
        }
      })
      return {
        ...p, floors,
        count: floors.reduce((s, f) => s + f.count, 0),
        sub:   floors.reduce((s, f) => s + f.sub, 0),
        draft: floors.reduce((s, f) => s + f.draft, 0),
      }
    })
  }, [inspections])

  // ── Trade options for dropdown ─────────────────────────────────────────────
  const tradeOpts = useMemo(() => {
    const map = {}
    inspections.forEach(i => { if (i.tradeId) map[i.tradeId._id] = i.tradeId.name })
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [inspections])

  // ── Right panel items ──────────────────────────────────────────────────────
  const panelItems = useMemo(() => inspections.filter(i => {
    if (selectedNode?.type === 'project' && i.projectId?._id  !== selectedNode.id) return false
    if (selectedNode?.type === 'floor'   && i.floorId?._id    !== selectedNode.id) return false
    if (selectedNode?.type === 'room'    && i.locationId?._id !== selectedNode.id) return false
    if (fTrade && i.tradeId?._id !== fTrade) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(
        i.tradeId?.name?.toLowerCase().includes(q)    ||
        i.elementId?.name?.toLowerCase().includes(q)  ||
        i.checkedBy?.toLowerCase().includes(q)
      )) return false
    }
    if (fDateFrom || fDateTo) {
      const d = i.dateOfCheck ? new Date(i.dateOfCheck).toISOString().slice(0, 10) : ''
      if (fDateFrom && d < fDateFrom) return false
      if (fDateTo   && d > fDateTo)   return false
    }
    return true
  }), [inspections, selectedNode, fTrade, search, fDateFrom, fDateTo])

  // ── Group right panel based on selected level ──────────────────────────────
  const panelGrouped = useMemo(() => {
    if (!selectedNode || selectedNode.type === 'room') return { type: 'flat', items: panelItems }
    if (selectedNode.type === 'floor') {
      const rooms = {}
      panelItems.forEach(i => {
        const rid = i.locationId?._id || 'unknown'
        if (!rooms[rid]) rooms[rid] = { id: rid, name: i.locationId?.name || '—', items: [] }
        rooms[rid].items.push(i)
      })
      return { type: 'byRoom', rooms: Object.values(rooms) }
    }
    const floors = {}
    panelItems.forEach(i => {
      const fid = i.floorId?._id    || 'unknown'
      const rid = i.locationId?._id || 'unknown'
      if (!floors[fid]) floors[fid] = { id: fid, name: i.floorId?.label || '—', rooms: {} }
      if (!floors[fid].rooms[rid]) floors[fid].rooms[rid] = { id: rid, name: i.locationId?.name || '—', items: [] }
      floors[fid].rooms[rid].items.push(i)
    })
    return { type: 'byFloorRoom', floors: Object.values(floors).map(f => ({ ...f, rooms: Object.values(f.rooms) })) }
  }, [panelItems, selectedNode])

  const toggleTree = (level, id) => setTreeOpen(prev => {
    const s = new Set(prev[level])
    s.has(id) ? s.delete(id) : s.add(id)
    return { ...prev, [level]: s }
  })

  const selectNode = (node) =>
    setSelectedNode(prev => prev?.type === node.type && prev?.id === node.id ? null : node)

  const isSel = (type, id) => selectedNode?.type === type && selectedNode?.id === id

  const toggleRow = (id, e) => {
    e.stopPropagation()
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    const ok = await confirm('Delete this inspection?', 'This cannot be undone.')
    if (!ok) return
    await adminDeleteInspection(id)
    setInspections(prev => prev.filter(i => i._id !== id))
    toast.success('Inspection deleted')
  }

  const breadcrumb = selectedNode
    ? [selectedNode.projectName, selectedNode.floorName, selectedNode.roomName].filter(Boolean)
    : ['All Inspections']

  const hasFilters = !!(fTrade || fDateFrom || fDateTo || search)

  // ── Inspection row ─────────────────────────────────────────────────────────
  function InspRow({ ins }) {
    const ok    = ins.results?.filter(r => r.result === 'OK').length || 0
    const total = ins.results?.length || 0
    const pct   = total > 0 ? Math.round((ok / total) * 100) : 0
    const exp   = expandedRows.has(ins._id)
    return (
      <Fragment>
        <div
          onClick={() => navigate(`/inspections/${ins._id}`)}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/40 dark:hover:bg-orange-500/5 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/20 last:border-0"
        >
          <div className="flex items-center gap-1.5 w-20 flex-shrink-0">
            <Columns className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate">{ins.elementId?.name || '—'}</span>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate min-w-0">{ins.tradeId?.name || '—'}</span>
          <span className="text-xs text-gray-400 whitespace-nowrap w-14 text-center flex-shrink-0">{fmtDate(ins.dateOfCheck)}</span>
          <span className="text-xs text-gray-400 w-24 truncate hidden md:block flex-shrink-0">{ins.checkedBy || '—'}</span>
          <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap w-8 text-right">{ok}/{total}</span>
          </div>
          <div className="w-24 flex justify-center flex-shrink-0">
            <StatusBadge status={ins.status} />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={e => toggleRow(ins._id, e)}
              className={`p-1.5 rounded-lg transition-colors ${exp ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-500' : 'text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500'}`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
            </button>
            {canManage && (
              <button
                onClick={e => handleDelete(ins._id, e)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {exp && (
          <div className="px-4 pb-4 pt-2 bg-blue-50/40 dark:bg-blue-500/5 border-b border-blue-100 dark:border-blue-500/20">
            <InspectionTimeline inspection={ins} />
          </div>
        )}
      </Fragment>
    )
  }

  // ── Right panel content ────────────────────────────────────────────────────
  function RightContent() {
    if (loading) return <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>
    if (!panelItems.length) return (
      <div className="flex flex-col items-center justify-center h-40 text-sm text-gray-400 gap-2">
        <ClipboardList className="w-8 h-8 opacity-30" />
        {selectedNode ? 'No inspections for this selection.' : 'Select a location from the left panel.'}
      </div>
    )
    if (panelGrouped.type === 'flat') return <div>{panelGrouped.items.map(i => <InspRow key={i._id} ins={i} />)}</div>
    if (panelGrouped.type === 'byRoom') return (
      <div>
        {panelGrouped.rooms.map(room => (
          <div key={room.id}>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
              <DoorOpen className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{room.name}</span>
              <SummaryPills items={room.items} />
            </div>
            {room.items.map(i => <InspRow key={i._id} ins={i} />)}
          </div>
        ))}
      </div>
    )
    return (
      <div>
        {panelGrouped.floors.map(floor => (
          <div key={floor.id}>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{floor.name}</span>
            </div>
            {floor.rooms.map(room => (
              <div key={room.id}>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 sticky top-9 z-10">
                  <DoorOpen className="w-3 h-3 text-orange-400" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{room.name}</span>
                  <SummaryPills items={room.items} />
                </div>
                {room.items.map(i => <InspRow key={i._id} ins={i} />)}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div
        className="-m-4 sm:-m-6 lg:-m-8 flex overflow-hidden"
        style={{ height: 'calc(100vh - 64px)' }}
      >
        {/* ─── LEFT: Navigation tree ─────────────────────────────────────────── */}
        <div className="w-64 xl:w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50/80 dark:bg-gray-900/60 flex-shrink-0">
          {/* Tree search */}
          <div className="p-2.5 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
                placeholder="Filter locations…"
                value={treeSearch}
                onChange={e => setTreeSearch(e.target.value)}
              />
              {treeSearch && (
                <button onClick={() => setTreeSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* All */}
          <button
            onClick={() => setSelectedNode(null)}
            className={`flex items-center gap-2 px-3 py-2.5 text-xs font-bold transition-colors border-b border-gray-100 dark:border-gray-700/60 ${
              !selectedNode
                ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            All Inspections
            <span className="ml-auto text-[10px] font-normal text-gray-400">{inspections.length}</span>
          </button>

          {/* Tree body */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-8 text-xs text-gray-400 text-center">Loading…</div>
            ) : tree
              .filter(p => {
                if (!treeSearch) return true
                const q = treeSearch.toLowerCase()
                return (
                  p.name.toLowerCase().includes(q) ||
                  p.floors.some(f => f.name.toLowerCase().includes(q) || f.rooms.some(r => r.name.toLowerCase().includes(q)))
                )
              })
              .map(project => {
                const pOpen = !treeOpen.p.has(project.id)
                return (
                  <div key={project.id}>
                    {/* Project */}
                    <div className={`flex items-center transition-colors ${isSel('project', project.id) ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                      <button onClick={() => toggleTree('p', project.id)} className="p-1.5 pl-2 text-gray-400 hover:text-gray-600 flex-shrink-0">
                        {pOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => selectNode({ type: 'project', id: project.id, projectName: project.name })}
                        className="flex items-center gap-1.5 flex-1 min-w-0 pr-2 py-1.5 text-left"
                      >
                        <Building2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                        <span className={`text-xs font-bold truncate ${isSel('project', project.id) ? 'text-orange-500' : 'text-gray-700 dark:text-gray-200'}`}>{project.name}</span>
                        <span className="ml-auto text-[10px] text-gray-400 flex-shrink-0">{project.count}</span>
                      </button>
                    </div>

                    {pOpen && project.floors
                      .filter(f => {
                        if (!treeSearch) return true
                        const q = treeSearch.toLowerCase()
                        return f.name.toLowerCase().includes(q) || f.rooms.some(r => r.name.toLowerCase().includes(q))
                      })
                      .map(floor => {
                        const fKey  = `${project.id}:${floor.id}`
                        const fOpen = !treeOpen.f.has(fKey)
                        return (
                          <div key={floor.id}>
                            {/* Floor */}
                            <div className={`flex items-center transition-colors ${isSel('floor', floor.id) ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                              <button onClick={() => toggleTree('f', fKey)} className="p-1.5 pl-5 text-gray-300 hover:text-gray-500 flex-shrink-0">
                                {fOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => selectNode({ type: 'floor', id: floor.id, projectName: project.name, floorName: floor.name })}
                                className="flex items-center gap-1.5 flex-1 min-w-0 pr-2 py-1 text-left"
                              >
                                <Layers className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                <span className={`text-xs truncate ${isSel('floor', floor.id) ? 'text-orange-500 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>{floor.name}</span>
                                <span className="ml-auto text-[10px] text-gray-400 flex-shrink-0">{floor.count}</span>
                              </button>
                            </div>

                            {fOpen && floor.rooms
                              .filter(r => !treeSearch || r.name.toLowerCase().includes(treeSearch.toLowerCase()))
                              .map(room => (
                                <button
                                  key={room.id}
                                  onClick={() => selectNode({ type: 'room', id: room.id, projectName: project.name, floorName: floor.name, roomName: room.name })}
                                  className={`w-full flex items-center gap-1.5 pl-10 pr-2 py-1.5 transition-colors ${isSel('room', room.id) ? 'bg-orange-100 dark:bg-orange-500/15' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                >
                                  <DoorOpen className="w-3 h-3 text-orange-300 flex-shrink-0" />
                                  <span className={`text-xs truncate ${isSel('room', room.id) ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>{room.name}</span>
                                  <div className="ml-auto flex items-center gap-1 flex-shrink-0 text-[9px] font-bold">
                                    {room.sub   > 0 && <span className="text-emerald-500">{room.sub}✓</span>}
                                    {room.draft > 0 && <span className="text-amber-500">{room.draft}●</span>}
                                  </div>
                                </button>
                              ))
                            }
                          </div>
                        )
                      })
                    }
                  </div>
                )
              })
            }
          </div>
        </div>

        {/* ─── RIGHT: Content panel ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900">

          {/* Header row 1: breadcrumb + status tabs */}
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3 flex-shrink-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {breadcrumb.map((crumb, i) => (
                <Fragment key={i}>
                  {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                  <span className={`text-sm truncate ${i === breadcrumb.length - 1 ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-400'}`}>{crumb}</span>
                </Fragment>
              ))}
              <span className="text-xs text-gray-400 ml-1 flex-shrink-0">({panelItems.length})</span>
            </div>

            {/* Status tabs */}
            <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex-shrink-0">
              {[['', 'All'], ['SUBMITTED', 'Submitted'], ['DRAFT', 'Draft']].map(([s, label]) => (
                <button
                  key={s}
                  onClick={() => patch({ status: s })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === s
                      ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Header row 2: filters */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[140px] max-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="w-full pl-8 pr-7 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/15 focus:border-orange-400 transition-colors"
                placeholder="Search trade, wall…"
                value={search}
                onChange={e => patch({ q: e.target.value })}
              />
              {search && (
                <button onClick={() => patch({ q: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Trade dropdown (custom) */}
            <div className="w-44 flex-shrink-0">
              <Dropdown
                value={fTrade}
                onChange={v => patch({ trade: v })}
                options={tradeOpts}
                placeholder="All Trades"
                searchable={tradeOpts.length > 6}
              />
            </div>

            {/* Date range */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <DatePicker
                value={fDateFrom}
                onChange={v => patch({ dateFrom: v })}
                placeholder="From date"
                max={fDateTo || undefined}
              />
              <span className="text-xs text-gray-300 font-bold">—</span>
              <DatePicker
                value={fDateTo}
                onChange={v => patch({ dateTo: v })}
                placeholder="To date"
                min={fDateFrom || undefined}
                align="right"
              />
            </div>

            {/* Clear all filters */}
            {hasFilters && (
              <button
                onClick={() => patch({ q: '', trade: '', dateFrom: '', dateTo: '' })}
                className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-semibold transition-colors px-2 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Column headers */}
          {panelItems.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60 flex-shrink-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20 flex-shrink-0">Wall</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-1">Trade</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14 text-center flex-shrink-0">Date</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 hidden md:block flex-shrink-0">Engineer</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 flex-shrink-0">Progress</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 text-center flex-shrink-0">Status</span>
              <span className="w-16 flex-shrink-0" />
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <RightContent />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
