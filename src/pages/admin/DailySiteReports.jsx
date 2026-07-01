import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import AdminLayout from '../../components/layout/AdminLayout'
import { adminGetDailySiteReports, adminUpdateDailySiteReport, adminDeleteDailySiteReport } from '../../services/api'
import { useConfirm } from '../../context/ConfirmContext'
import Drawer, { DetailRow } from '../../components/common/Drawer'
import { ClipboardList, Search, Trash2, ChevronLeft, ChevronRight, X, Eye, Pencil, Loader2, Image, ChevronDown } from 'lucide-react'
import DateRangeInput from '../../components/common/DateRangeInput'
import toast from 'react-hot-toast'

const LIMIT       = 50
const STATUSES    = ['Pending', 'Reviewed']
const DRI_OPTIONS = ['Site Manager','Architect','Structural Engineer','MEP Engineer','Civil Engineer','Interior Designer','Contractor']

export default function DailySiteReports() {
  const confirm = useConfirm()

  const [data, setData]         = useState([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const abortRef = useRef(null)

  const [viewRec, setViewRec]   = useState(null)
  const [editRec, setEditRec]   = useState(null)
  const [editForm, setEditForm] = useState({})

  const [filters, setFilters] = useState({ project: '', dri: '', status: '', from: '', to: '' })

  const load = useCallback(async (pg = 1, f = filters) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const params = { page: pg, limit: LIMIT }
      if (f.project) params.project = f.project
      if (f.dri)     params.dri     = f.dri
      if (f.status)  params.status  = f.status
      if (f.from)    params.from    = f.from
      if (f.to)      params.to      = f.to
      const res = await adminGetDailySiteReports(params, abortRef.current.signal)
      setData(res.data.data)
      setTotal(res.data.total)
      setPages(res.data.pages)
      setPage(pg)
    } catch (err) {
      if (!axios.isCancel(err) && err.code !== 'ERR_CANCELED') toast.error('Failed to load reports.')
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load(1, filters) }, []) // eslint-disable-line

  const applyFilters = () => load(1, filters)
  const clearFilters = () => {
    const blank = { project: '', dri: '', status: '', from: '', to: '' }
    setFilters(blank); load(1, blank)
  }

  const openEdit = (r) => {
    setEditRec(r)
    setEditForm({
      dri:                r.dri,
      project:            r.project,
      projectDescription: r.projectDescription,
      workType:           r.workType,
      status:             r.status,
    })
  }

  const handleStatusChange = async (id, status) => {
    try {
      await adminUpdateDailySiteReport(id, { status })
      setData(prev => prev.map(r => r._id === id ? { ...r, status } : r))
      toast.success(`Marked as ${status}`)
    } catch { toast.error('Failed to update.') }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await adminUpdateDailySiteReport(editRec._id, editForm)
      setData(prev => prev.map(r => r._id === editRec._id ? res.data.data : r))
      toast.success('Report updated.')
      setEditRec(null)
    } catch { toast.error('Failed to update.') }
    finally  { setSaving(false) }
  }

  const handleDelete = async (r) => {
    const ok = await confirm({
      title: 'Delete Report',
      message: `Delete site report for "${r.project}" on ${fmtDate(r.reportDateTime)}?`,
      confirmLabel: 'Delete', variant: 'danger',
    })
    if (!ok) return
    try {
      await adminDeleteDailySiteReport(r._id)
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
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Site Reports</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Site activity records — {total} total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60 px-4 py-3 flex flex-wrap items-center gap-2">
          {/* Project search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search project…" value={filters.project}
              onChange={e => setFilters(p => ({ ...p, project: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full pl-9 pr-3 py-2 h-[38px] rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors" />
          </div>
          {/* DRI search */}
          <div className="relative shrink-0">
            <input type="text" placeholder="DRI…" value={filters.dri}
              onChange={e => setFilters(p => ({ ...p, dri: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-32 px-3 py-2 h-[38px] rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors" />
          </div>
          {/* Status */}
          <div className="relative shrink-0">
            <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
              className="appearance-none pl-3 pr-8 py-2 h-[38px] rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-emerald-500 transition-colors cursor-pointer">
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {/* Date range */}
          <DateRangeInput from={filters.from} to={filters.to} onChange={(f, v) => setFilters(p => ({ ...p, [f]: v }))} />
          {/* Actions */}
          <button onClick={applyFilters} className="flex items-center gap-1.5 px-4 py-2 h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0">
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                  <th className="px-4 py-3 text-left font-medium">Project</th>
                  <th className="px-4 py-3 text-left font-medium">DRI</th>
                  <th className="px-4 py-3 text-left font-medium">Work Type</th>
                  <th className="px-4 py-3 text-center font-medium">Photos</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-50 dark:divide-gray-700/40 transition-opacity duration-150 ${loading && data.length > 0 ? 'opacity-50' : 'opacity-100'}`}>
                {data.length === 0 && loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                    <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                  </td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No reports found.</td></tr>
                ) : data.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs tabular-nums text-gray-700 dark:text-gray-200">{fmtDateTime(r.reportDateTime)}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium text-xs">{r.project}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{r.dri}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{r.workType}</td>
                    <td className="px-4 py-3 text-center">
                      {r.photos?.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setLightbox(r.photos[0])}>
                            <img src={r.photos[0]} alt="" className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-gray-700" />
                          </button>
                          {r.photos.length > 1 && <span className="text-xs text-gray-500">+{r.photos.length - 1}</span>}
                        </div>
                      ) : (
                        <Image className="w-4 h-4 mx-auto text-gray-300 dark:text-gray-600" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select value={r.status} onChange={e => handleStatusChange(r._id, e.target.value)}
                        className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 outline-none cursor-pointer ${statusCls(r.status)}`}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewRec(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors" title="Edit">
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
                <button disabled={page === 1}    onClick={() => load(page - 1, filters)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronLeft  className="w-4 h-4" /></button>
                <button disabled={page === pages} onClick={() => load(page + 1, filters)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── View Drawer ── */}
      <Drawer open={!!viewRec} onClose={() => setViewRec(null)} title="Site Report" subtitle={viewRec ? fmtDateTime(viewRec.reportDateTime) : ''}>
        {viewRec && (
          <>
            <DetailRow label="Project" value={viewRec.project} />
            <DetailRow label="DRI" value={viewRec.dri} />
            <DetailRow label="Work Type" value={viewRec.workType} />
            <DetailRow label="Description" value={viewRec.projectDescription} />
            <DetailRow label="Status">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCls(viewRec.status)}`}>{viewRec.status}</span>
            </DetailRow>
            {viewRec.photos?.length > 0 && (
              <DetailRow label={`Photos (${viewRec.photos.length})`} block>
                <div className="grid grid-cols-3 gap-2">
                  {viewRec.photos.map((url, i) => (
                    <button key={i} onClick={() => setLightbox(url)} className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </DetailRow>
            )}
          </>
        )}
      </Drawer>

      {/* ── Edit Drawer ── */}
      <Drawer
        open={!!editRec} onClose={() => setEditRec(null)}
        title="Edit Site Report" subtitle={editRec ? editRec.project : ''}
        footer={<>
          <button onClick={() => setEditRec(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-60 transition-colors flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
          </button>
        </>}
      >
        {editRec && (
          <div className="space-y-3">
            <EField label="DRI">
              <select value={editForm.dri} onChange={e => ef('dri', e.target.value)} className={eInput}>
                {DRI_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </EField>
            <EField label="Project"><input value={editForm.project} onChange={e => ef('project', e.target.value)} className={eInput} /></EField>
            <EField label="Description">
              <textarea rows={3} value={editForm.projectDescription} onChange={e => ef('projectDescription', e.target.value)} className={eInput + ' resize-none'} />
            </EField>
            <EField label="Work Type"><input value={editForm.workType} onChange={e => ef('workType', e.target.value)} className={eInput} /></EField>
            <EField label="Status">
              <select value={editForm.status} onChange={e => ef('status', e.target.value)} className={eInput}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </EField>
          </div>
        )}
      </Drawer>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </AdminLayout>
  )
}

const fInput = 'w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors'
const eInput = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-colors'

function EField({ label, children }) {
  return <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>{children}</div>
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

function statusCls(s) {
  return s === 'Reviewed'
    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
    : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
}
