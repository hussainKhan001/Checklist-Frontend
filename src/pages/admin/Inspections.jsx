import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { adminGetInspections, adminDeleteInspection, adminGetProjects } from '../../api'
import StatusBadge from '../../components/ui/StatusBadge'
import { useConfirm } from '../../context/ConfirmContext'
import { Search, Trash2, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
const fmtDateTime = (d) => d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—'

const EVENT_CONFIG = {
  DRAFT_CREATED:  { color: 'bg-blue-400',   label: 'Draft created',   textColor: 'text-blue-600 dark:text-blue-400' },
  PHOTO_UPLOADED: { color: 'bg-gray-400',    label: 'Photo uploaded',  textColor: 'text-gray-500 dark:text-gray-400' },
  SUBMITTED:      { color: 'bg-emerald-500', label: 'Submitted',       textColor: 'text-emerald-600 dark:text-emerald-400' },
}

function InspectionTimeline({ inspection }) {
  const okCount      = inspection.results?.filter(r => r.result === 'OK').length     || 0
  const notOkCount   = inspection.results?.filter(r => r.result === 'NOT_OK').length || 0
  const pendingCount = inspection.results?.filter(r => r.result === 'PENDING').length || 0
  const timeline     = inspection.timeline || []

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Checkpoint summary pills */}
      <div className="sm:w-40 flex sm:flex-col gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 w-full">Checkpoints</span>
        {okCount > 0      && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{okCount} OK</span>}
        {notOkCount > 0   && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400">{notOkCount} Not OK</span>}
        {pendingCount > 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">{pendingCount} Pending</span>}
        {inspection.workNotes && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic">
            "{inspection.workNotes}"
          </div>
        )}
      </div>

      {/* Timeline events */}
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

export default function Inspections() {
  const [inspections, setInspections]   = useState([])
  const [projects, setProjects]         = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(true)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const navigate = useNavigate()
  const confirm  = useConfirm()

  const load = (status) => {
    setLoading(true)
    adminGetInspections(status).then(r => setInspections(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])
  useEffect(() => { adminGetProjects().then(r => setProjects(r.data)) }, [])

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

  const filtered = inspections.filter(i => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      i.projectId?.name?.toLowerCase().includes(q)   ||
      i.tradeId?.name?.toLowerCase().includes(q)     ||
      i.locationId?.name?.toLowerCase().includes(q)  ||
      i.checkedBy?.toLowerCase().includes(q)         ||
      i.contractorAgency?.toLowerCase().includes(q)
    const matchProject = !projectFilter || i.projectId?._id === projectFilter
    return matchSearch && matchProject
  })

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inspections</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{inspections.length} total records</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
              placeholder="Search project, trade, room, engineer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
          >
            <option value="">All projects</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 self-start">
            {['', 'SUBMITTED', 'DRAFT'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
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
        </div>

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
                          onClick={() => navigate(`/admin/inspections/${ins._id}`)}
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
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
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
                                {expanded
                                  ? <ChevronUp className="w-4 h-4" />
                                  : <ClipboardList className="w-4 h-4" />
                                }
                              </button>
                              <button
                                onClick={e => handleDelete(ins._id, e)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
                        No inspections found.
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
