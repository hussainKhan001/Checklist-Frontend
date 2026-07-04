import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import AdminLayout from '../../components/layout/AdminLayout'
import { adminGetDrawingRequests, adminUpdateDrawingRequest, adminDeleteDrawingRequest } from '../../services/api'
import { useConfirm } from '../../context/ConfirmContext'
import Drawer, { DetailRow } from '../../components/common/Drawer'
import { PenLine, Search, Trash2, ChevronLeft, ChevronRight, X, Eye, Pencil, Loader2 } from 'lucide-react'
import CustomSelect from '../../components/ui/CustomSelect'
import DateRangeInput from '../../components/common/DateRangeInput'
import toast from 'react-hot-toast'

const LIMIT          = 50
const DRAWING_TYPES  = ['Architectural','Structural','MEP','Civil','Interior','Landscape','Shop Drawing','As-Built']
const STATUSES       = ['Pending','In Progress','In Queue','Delayed','With Consultant','Under Review','Completed','Rejected']
const PRIORITIES     = ['Critical','Important','Routine']
const SOURCE_OPTIONS = ['External Consultant','Internal','Client','Architect','Government Authority','Other']

export default function DrawingRequests() {
  const confirm = useConfirm()

  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const abortRef = useRef(null)

  const [viewRec, setViewRec]   = useState(null)
  const [editRec, setEditRec]   = useState(null)
  const [editForm, setEditForm] = useState({})

  const [filters, setFilters] = useState({ project: '', drawingType: '', status: '', priority: '', from: '', to: '' })

  const load = useCallback(async (pg = 1, f = filters) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const params = { page: pg, limit: LIMIT }
      if (f.project)     params.project     = f.project
      if (f.drawingType) params.drawingType = f.drawingType
      if (f.status)      params.status      = f.status
      if (f.priority)    params.priority    = f.priority
      if (f.from)        params.from        = f.from
      if (f.to)          params.to          = f.to
      const res = await adminGetDrawingRequests(params, abortRef.current.signal)
      setData(res.data.data)
      setTotal(res.data.total)
      setPages(res.data.pages)
      setPage(pg)
    } catch (err) {
      if (!axios.isCancel(err) && err.code !== 'ERR_CANCELED') toast.error('Failed to load requests.')
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load(1, filters) }, []) // eslint-disable-line

  const applyFilters = () => load(1, filters)
  const clearFilters = () => {
    const blank = { project: '', drawingType: '', status: '', priority: '', from: '', to: '' }
    setFilters(blank); load(1, blank)
  }

  const openEdit = (r) => {
    setEditRec(r)
    setEditForm({
      project:             r.project,
      drawingDescription:  r.drawingDescription,
      drawingType:         r.drawingType,
      source:              r.source || '',
      dri:                 r.dri,
      assignedTo:          r.assignedTo || '',
      priority:            r.priority || '',
      status:              r.status,
      committedDate:       r.committedDate    ? r.committedDate.slice(0, 10)    : '',
      actualCompletion:    r.actualCompletion ? r.actualCompletion.slice(0, 10) : '',
      planningVerified:    r.planningVerified    || false,
      projectAcknowledged: r.projectAcknowledged || false,
      remarks:             r.remarks || '',
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await adminUpdateDrawingRequest(editRec._id, editForm)
      setData(prev => prev.map(r => r._id === editRec._id ? res.data.data : r))
      toast.success('Request updated.')
      setEditRec(null)
    } catch { toast.error('Failed to update.') }
    finally  { setSaving(false) }
  }

  const handleDelete = async (r) => {
    const ok = await confirm({
      title: 'Delete Request',
      message: `Delete "${r.ticketNo || r.project}" drawing request?`,
      confirmLabel: 'Delete', variant: 'danger',
    })
    if (!ok) return
    try {
      await adminDeleteDrawingRequest(r._id)
      toast.success('Deleted.')
      load(page, filters)
    } catch { toast.error('Failed to delete.') }
  }

  const ef = (field, val) => setEditForm(p => ({ ...p, [field]: val }))
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <PenLine className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Drawing Requests</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage drawing requests — {total} total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60 px-4 py-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search project…" value={filters.project}
              onChange={e => setFilters(p => ({ ...p, project: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full pl-9 pr-3 py-2 h-[38px] rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div className="shrink-0 w-36">
            <CustomSelect
              value={filters.drawingType}
              onChange={v => setFilters(p => ({ ...p, drawingType: v }))}
              options={DRAWING_TYPES}
              emptyLabel="All types"
              accent="violet"
              size="sm"
            />
          </div>
          <div className="shrink-0 w-36">
            <CustomSelect
              value={filters.priority}
              onChange={v => setFilters(p => ({ ...p, priority: v }))}
              options={PRIORITIES}
              emptyLabel="All priorities"
              accent="violet"
              size="sm"
            />
          </div>
          <div className="shrink-0 w-40">
            <CustomSelect
              value={filters.status}
              onChange={v => setFilters(p => ({ ...p, status: v }))}
              options={STATUSES}
              emptyLabel="All statuses"
              accent="violet"
              size="sm"
            />
          </div>
          <DateRangeInput from={filters.from} to={filters.to} onChange={(f, v) => setFilters(p => ({ ...p, [f]: v }))} />
          <button onClick={applyFilters} className="flex items-center gap-1.5 px-4 py-2 h-[38px] bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0">
            <Search className="w-3.5 h-3.5" /> Search
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 h-[38px] bg-gray-100 dark:bg-gray-700/70 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '1600px' }}>
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Ticket No</th>
                  <th className="px-3 py-3 text-left font-medium">Project</th>
                  <th className="px-3 py-3 text-left font-medium">Description</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Type</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Source</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Requested By</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Request Date</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Assigned To</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Priority</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Committed</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Actual Completion</th>
                  <th className="px-3 py-3 text-center font-medium whitespace-nowrap">Delay</th>
                  <th className="px-3 py-3 text-center font-medium whitespace-nowrap">Plan. Verified</th>
                  <th className="px-3 py-3 text-center font-medium whitespace-nowrap">Proj. Ack.</th>
                  <th className="px-3 py-3 text-left font-medium">Remarks</th>
                  <th className="px-3 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-50 dark:divide-gray-700/40 transition-opacity duration-150 ${loading && data.length > 0 ? 'opacity-50' : 'opacity-100'}`}>
                {data.length === 0 && loading ? (
                  <tr><td colSpan={17} className="px-4 py-10 text-center text-gray-400 text-sm">
                    <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                  </td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={17} className="px-4 py-10 text-center text-gray-400 text-sm">No requests found.</td></tr>
                ) : data.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      {r.ticketNo
                        ? <span className="font-mono text-[11px] font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-md">{r.ticketNo}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-900 dark:text-white font-medium text-xs max-w-[100px] truncate">{r.project}</td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 max-w-[130px] truncate text-xs" title={r.drawingDescription}>{r.drawingDescription}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">{r.drawingType}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {r.source || <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">{r.dri}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs tabular-nums text-gray-500 dark:text-gray-400">
                      {fmtDate(r.requestDate)}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {r.assignedTo
                        ? <span className="text-gray-800 dark:text-gray-200">{r.assignedTo}</span>
                        : <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {r.priority
                        ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityCls(r.priority)}`}>{r.priority}</span>
                        : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCls(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      {r.committedDate ? fmtDate(r.committedDate) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      {r.actualCompletion ? fmtDate(r.actualCompletion) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      {r.actualCompletion
                        ? <span className={`text-xs font-semibold tabular-nums ${r.delayDays > 0 ? 'text-red-500' : 'text-green-500'}`}>{r.delayDays}d</span>
                        : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.planningVerified
                        ? <span className="text-[11px] font-medium text-green-600 dark:text-green-400">✓ Yes</span>
                        : <span className="text-[11px] text-gray-300 dark:text-gray-600">No</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.projectAcknowledged
                        ? <span className="text-[11px] font-medium text-green-600 dark:text-green-400">✓ Yes</span>
                        : <span className="text-[11px] text-gray-300 dark:text-gray-600">No</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate" title={r.remarks}>
                      {r.remarks || <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewRec(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500">
              <span>Page {page} of {pages} · {total} records</span>
              <div className="flex gap-1">
                <button disabled={page === 1}     onClick={() => load(page - 1, filters)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronLeft  className="w-4 h-4" /></button>
                <button disabled={page === pages} onClick={() => load(page + 1, filters)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── View Drawer ── */}
      <Drawer open={!!viewRec} onClose={() => setViewRec(null)} title="Drawing Request" subtitle={viewRec?.ticketNo || viewRec?.project || ''}>
        {viewRec && (
          <>
            {viewRec.ticketNo && (
              <div className="mb-4 px-4 py-3 bg-violet-50 dark:bg-violet-500/10 rounded-xl border border-violet-100 dark:border-violet-500/20">
                <p className="text-[10px] text-violet-400 uppercase tracking-wide mb-0.5">Ticket ID</p>
                <p className="text-xl font-mono font-bold text-violet-700 dark:text-violet-300">{viewRec.ticketNo}</p>
              </div>
            )}
            <DetailRow label="Project"             value={viewRec.project} />
            <DetailRow label="Drawing Description" value={viewRec.drawingDescription} />
            <DetailRow label="Drawing Type"        value={viewRec.drawingType} />
            {viewRec.source && <DetailRow label="Source" value={viewRec.source} />}
            <DetailRow label="Requested By (DRI)"  value={viewRec.dri} />
            <DetailRow label="Request Date"        value={fmtDateTime(viewRec.requestDate)} />
            <DetailRow label="Assigned To">
              <span className={viewRec.assignedTo ? 'text-gray-800 dark:text-gray-200 text-sm' : 'text-gray-400 italic text-sm'}>
                {viewRec.assignedTo || 'Not yet assigned'}
              </span>
            </DetailRow>
            <DetailRow label="Priority">
              {viewRec.priority
                ? <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${priorityCls(viewRec.priority)}`}>{viewRec.priority}</span>
                : <span className="text-gray-400 italic text-sm">Not set</span>}
            </DetailRow>
            <DetailRow label="Status">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCls(viewRec.status)}`}>{viewRec.status}</span>
            </DetailRow>
            <DetailRow label="Committed Date"    value={viewRec.committedDate    ? fmtDate(viewRec.committedDate)    : '—'} />
            <DetailRow label="Actual Completion" value={viewRec.actualCompletion ? fmtDate(viewRec.actualCompletion) : '—'} />
            <DetailRow label="Delay (Days)">
              {viewRec.actualCompletion
                ? <span className={`font-semibold text-sm ${viewRec.delayDays > 0 ? 'text-red-500' : 'text-green-500'}`}>{viewRec.delayDays} day{viewRec.delayDays !== 1 ? 's' : ''}</span>
                : <span className="text-gray-400 text-sm">—</span>}
            </DetailRow>
            <DetailRow label="Planning Verified"><VeriBadge value={viewRec.planningVerified} /></DetailRow>
            <DetailRow label="Project Acknowledged"><VeriBadge value={viewRec.projectAcknowledged} /></DetailRow>
            {viewRec.remarks && <DetailRow label="Remarks" value={viewRec.remarks} />}
          </>
        )}
      </Drawer>

      {/* ── Edit Drawer ── */}
      <Drawer
        open={!!editRec} onClose={() => setEditRec(null)}
        title="Edit Drawing Request" subtitle={editRec?.ticketNo || editRec?.project || ''}
        footer={<>
          <button onClick={() => setEditRec(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-60 transition-colors flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
          </button>
        </>}
      >
        {editRec && (
          <div className="space-y-3">
            {editRec.ticketNo && (
              <div className="px-3 py-2 bg-violet-50 dark:bg-violet-500/10 rounded-lg border border-violet-100 dark:border-violet-500/20 text-xs font-mono font-bold text-violet-700 dark:text-violet-300">{editRec.ticketNo}</div>
            )}

            <Section label="Request Info">
              <EField label="Project"><input value={editForm.project} onChange={e => ef('project', e.target.value)} className={eInput} /></EField>
              <EField label="Drawing Description">
                <textarea rows={2} value={editForm.drawingDescription} onChange={e => ef('drawingDescription', e.target.value)} className={eInput + ' resize-none'} />
              </EField>
              <EField label="Drawing Type">
                <CustomSelect value={editForm.drawingType} onChange={v => ef('drawingType', v)} options={DRAWING_TYPES} accent="violet" />
              </EField>
              <EField label="Source">
                <CustomSelect value={editForm.source} onChange={v => ef('source', v)} options={SOURCE_OPTIONS} emptyLabel="— None —" accent="violet" />
              </EField>
              <EField label="Requested By (DRI)">
                <input value={editForm.dri} onChange={e => ef('dri', e.target.value)} className={eInput} placeholder="Person's name" />
              </EField>
            </Section>

            <Section label="AGM Response">
              <EField label="Assigned To">
                <input value={editForm.assignedTo} onChange={e => ef('assignedTo', e.target.value)} className={eInput} placeholder="Planning team member" />
              </EField>
              <EField label="Committed Date">
                <input type="date" value={editForm.committedDate} onChange={e => ef('committedDate', e.target.value)} className={eInput} />
              </EField>
            </Section>

            <Section label="GM — Priority">
              <EField label="Priority">
                <CustomSelect value={editForm.priority} onChange={v => ef('priority', v)} options={PRIORITIES} emptyLabel="— Not set —" accent="violet" />
              </EField>
            </Section>

            <Section label="Planning — Status">
              <EField label="Status">
                <CustomSelect value={editForm.status} onChange={v => ef('status', v)} options={STATUSES} accent="violet" />
              </EField>
              <EField label="Actual Completion">
                <input type="date" value={editForm.actualCompletion} onChange={e => ef('actualCompletion', e.target.value)} className={eInput} />
              </EField>
            </Section>

            <Section label="Verification">
              <div className="flex gap-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.planningVerified} onChange={e => ef('planningVerified', e.target.checked)} className="w-4 h-4 rounded accent-violet-600" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Planning Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.projectAcknowledged} onChange={e => ef('projectAcknowledged', e.target.checked)} className="w-4 h-4 rounded accent-violet-600" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Project Acknowledged</span>
                </label>
              </div>
            </Section>

            <EField label="Remarks">
              <input value={editForm.remarks} onChange={e => ef('remarks', e.target.value)} className={eInput} placeholder="Optional remarks" />
            </EField>
          </div>
        )}
      </Drawer>
    </AdminLayout>
  )
}

const eInput = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-violet-500 transition-colors'

function EField({ label, children }) {
  return <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>{children}</div>
}

function Section({ label, children }) {
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700/60 overflow-hidden">
      <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700/60">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">{label}</span>
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  )
}

function VeriBadge({ value }) {
  return value
    ? <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ Yes</span>
    : <span className="text-xs font-medium text-gray-400">— No</span>
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

function statusCls(status) {
  const m = {
    'Pending':         'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    'In Progress':     'bg-blue-50   dark:bg-blue-500/10   text-blue-700   dark:text-blue-400',
    'In Queue':        'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700  dark:text-indigo-400',
    'Delayed':         'bg-red-50    dark:bg-red-500/10    text-red-700    dark:text-red-400',
    'With Consultant': 'bg-purple-50 dark:bg-purple-500/10 text-purple-700  dark:text-purple-400',
    'Under Review':    'bg-sky-50    dark:bg-sky-500/10    text-sky-700    dark:text-sky-400',
    'Completed':       'bg-green-50  dark:bg-green-500/10  text-green-700  dark:text-green-400',
    'Rejected':        'bg-red-50    dark:bg-red-500/10    text-red-700    dark:text-red-400',
  }
  return m[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
}

function priorityCls(p) {
  if (p === 'Critical')  return 'bg-red-50   dark:bg-red-500/10   text-red-600   dark:text-red-400   border border-red-200   dark:border-red-500/30'
  if (p === 'Important') return 'bg-amber-50  dark:bg-amber-500/10  text-amber-600  dark:text-amber-400  border border-amber-200  dark:border-amber-500/30'
  if (p === 'Routine')   return 'bg-green-50  dark:bg-green-500/10  text-green-600  dark:text-green-400  border border-green-200  dark:border-green-500/30'
  return 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 border border-gray-200 dark:border-gray-700'
}
