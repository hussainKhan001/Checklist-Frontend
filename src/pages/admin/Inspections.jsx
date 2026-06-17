import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { adminGetInspections, adminDeleteInspection } from '../../api'
import StatusBadge from '../../components/ui/StatusBadge'
import { useConfirm } from '../../context/ConfirmContext'
import { Search, Trash2, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'
const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const EVENT_CONFIG = {
  DRAFT_CREATED:  { dot: 'bg-blue-400',  label: 'Draft created' },
  PHOTO_UPLOADED: { dot: 'bg-amber-400', label: 'Photo' },
  SUBMITTED:      { dot: 'bg-green-500', label: 'Submitted' },
}

const InspectionTimeline = ({ inspection }) => {
  const timeline   = inspection.timeline || []
  const photoCount = timeline.filter(e => e.event === 'PHOTO_UPLOADED').length

  // Dedupe: keep first PHOTO_UPLOADED, drop the rest
  const events = timeline.filter((e, i, arr) => {
    if (e.event !== 'PHOTO_UPLOADED') return true
    return arr.findIndex(x => x.event === 'PHOTO_UPLOADED') === i
  })

  const okCount      = inspection.results?.filter(r => r.result === 'OK').length      || 0
  const notOkCount   = inspection.results?.filter(r => r.result === 'NOT_OK').length  || 0
  const pendingCount = inspection.results?.filter(r => r.result === 'PENDING').length || 0

  return (
    <div className="py-1 flex flex-wrap gap-6 items-start">
      {/* Checkpoint pills */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Checkpoints</p>
        <div className="flex gap-1.5 flex-wrap">
          {okCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{okCount} OK</span>
          )}
          {notOkCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400">{notOkCount} Not OK</span>
          )}
          {pendingCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">{pendingCount} Pending</span>
          )}
          {okCount === 0 && notOkCount === 0 && pendingCount === 0 && (
            <span className="text-xs text-gray-400">No results yet</span>
          )}
        </div>
      </div>

      {/* Timeline */}
      {events.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Timeline</p>
          <div className="flex items-start gap-4 flex-wrap">
            {events.map((item, idx) => {
              const cfg = EVENT_CONFIG[item.event]
              if (!cfg) return null
              const label = item.event === 'PHOTO_UPLOADED' && photoCount > 1
                ? `${photoCount} photos` : cfg.label
              return (
                <div key={idx} className="flex items-center gap-1.5">
                  {idx > 0 && <div className="w-4 h-px bg-gray-200 dark:bg-gray-700 -ml-2.5 mr-0.5" />}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div>
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{label}</p>
                    <p className="text-[10px] text-gray-400">{fmtDateTime(item.timestamp)}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Last edited: {fmtDateTime(inspection.updatedAt)}</p>
        </div>
      )}

      {/* Work notes */}
      {inspection.workNotes && (
        <div className="flex-1 min-w-[180px]">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Work Notes</p>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{inspection.workNotes}</p>
        </div>
      )}
    </div>
  )
}

export default function Inspections() {
  const [inspections, setInspections]     = useState([])
  const [filter, setFilter]               = useState('')
  const [search, setSearch]               = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [sortKey, setSortKey]             = useState('dateOfCheck')
  const [sortDir, setSortDir]             = useState('desc')
  const [expandedRows, setExpandedRows]   = useState(new Set())
  const [loading, setLoading]             = useState(true)
  const navigate = useNavigate()
  const confirm  = useConfirm()

  const load = (status) => {
    setLoading(true)
    adminGetInspections(status).then(r => setInspections(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load(filter) }, [filter])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    const ok = await confirm('Delete this inspection?', 'This cannot be undone.')
    if (!ok) return
    await adminDeleteInspection(id)
    setInspections(prev => prev.filter(i => i._id !== id))
    toast.success('Inspection deleted')
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const toggleRow = (id, e) => {
    e.stopPropagation()
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Unique projects from loaded inspections for the filter dropdown
  const projects = [...new Map(
    inspections.map(i => [i.projectId?._id, i.projectId]).filter(([k]) => k)
  ).values()]

  const getSortVal = (insp, key) => {
    switch (key) {
      case 'location': return insp.locationId?.name || ''
      case 'trade':    return insp.tradeId?.name    || ''
      case 'project':  return insp.projectId?.name  || ''
      case 'status':   return insp.status           || ''
      default:         return insp[key]             || ''
    }
  }

  const filtered = inspections
    .filter(i => {
      const q = search.toLowerCase()
      const matchSearch = !q || [i.projectId?.name, i.tradeId?.name, i.locationId?.name, i.contractorAgency, i.checkedBy]
        .some(v => v?.toLowerCase().includes(q))
      const matchProject = !projectFilter || i.projectId?._id === projectFilter
      return matchSearch && matchProject
    })
    .sort((a, b) => {
      const av = getSortVal(a, sortKey)
      const bv = getSortVal(b, sortKey)
      if (!av && !bv) return 0
      if (!av) return 1
      if (!bv) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  const SortIcon = ({ field }) => {
    if (sortKey !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-300 ml-0.5 inline-block" />
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3 text-orange-500 ml-0.5 inline-block" />
      : <ChevronDown className="w-3 h-3 text-orange-500 ml-0.5 inline-block" />
  }

  const Th = ({ label, field, right }) => (
    <th
      onClick={field ? () => handleSort(field) : undefined}
      className={`px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap
        ${right ? 'text-right' : 'text-left'}
        ${field ? 'cursor-pointer select-none hover:text-orange-500 transition-colors' : ''}`}
    >
      {label}{field && <SortIcon field={field} />}
    </th>
  )

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inspections</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{inspections.length} total records</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
              placeholder="Search room, trade, engineer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
          >
            <option value="">All projects</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 self-start">
            {['', 'SUBMITTED', 'DRAFT'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filter === s
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
                    <Th label="Project"         field="project" />
                    <Th label="Floor › Location" field="location" />
                    <Th label="Trade"           field="trade" />
                    <Th label="Date"            field="dateOfCheck" />
                    <Th label="Engineer" />
                    <Th label="Checkpoints" />
                    <Th label="Status"          field="status" />
                    <Th label="Actions"         right />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ins => {
                    const okCount    = ins.results?.filter(r => r.result === 'OK').length || 0
                    const totalCount = ins.results?.length || 0
                    const pct        = totalCount > 0 ? Math.round((okCount / totalCount) * 100) : 0
                    const isExpanded = expandedRows.has(ins._id)

                    return (
                      <React.Fragment key={ins._id}>
                        <tr
                          className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
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
                            <div className="flex items-center gap-1.5">
                              <div className="w-14 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-400">{okCount}/{totalCount}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={ins.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={e => toggleRow(ins._id, e)}
                                title="Show timeline"
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isExpanded
                                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-500'
                                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600'
                                }`}
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
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

                        {isExpanded && (
                          <tr className="border-b border-gray-100 dark:border-gray-700/50">
                            <td colSpan={8} className="px-5 py-3 bg-blue-50/40 dark:bg-blue-500/5">
                              <InspectionTimeline inspection={ins} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No inspections found.</td>
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
