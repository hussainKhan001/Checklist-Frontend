import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import AdminLayout from '../../components/layout/AdminLayout'
import { adminGetContractorReports, adminUpdateContractorReport, adminDeleteContractorReport } from '../../services/api'
import { useConfirm } from '../../context/ConfirmContext'
import Drawer, { DetailRow } from '../../components/common/Drawer'
import { HardHat, Search, Trash2, ChevronLeft, ChevronRight, X, Eye, Pencil, Loader2, ChevronDown } from 'lucide-react'
import DateRangeInput from '../../components/common/DateRangeInput'
import toast from 'react-hot-toast'

const SHIFTS = ['Day', 'Night', '24-Hour']
const LIMIT  = 50

export default function ContractorReports() {
  const confirm = useConfirm()

  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const abortRef = useRef(null)

  const [viewRec, setViewRec] = useState(null)
  const [editRec, setEditRec] = useState(null)
  const [editForm, setEditForm] = useState({})

  const [filters, setFilters] = useState({ contractorName: '', shiftType: '', from: '', to: '' })

  const load = useCallback(async (pg = 1, f = filters) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const params = { page: pg, limit: LIMIT }
      if (f.contractorName) params.contractorName = f.contractorName
      if (f.shiftType)      params.shiftType      = f.shiftType
      if (f.from)           params.from           = f.from
      if (f.to)             params.to             = f.to
      const res = await adminGetContractorReports(params, abortRef.current.signal)
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
    const blank = { contractorName: '', shiftType: '', from: '', to: '' }
    setFilters(blank); load(1, blank)
  }

  const openEdit = (r) => {
    setEditRec(r)
    setEditForm({
      contractorName: r.contractorName,
      location:       r.location,
      date:           r.date ? r.date.slice(0, 10) : '',
      workType:       r.workType,
      shiftType:      r.shiftType,
      workerCount:    r.workerCount,
      email:          r.email || '',
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await adminUpdateContractorReport(editRec._id, editForm)
      setData(prev => prev.map(r => r._id === editRec._id ? res.data.data : r))
      toast.success('Report updated.')
      setEditRec(null)
    } catch { toast.error('Failed to update.') }
    finally  { setSaving(false) }
  }

  const handleDelete = async (report) => {
    const ok = await confirm({
      title: 'Delete Report',
      message: `Delete report by "${report.contractorName}" on ${fmtDate(report.date)}?`,
      confirmLabel: 'Delete', variant: 'danger',
    })
    if (!ok) return
    try {
      await adminDeleteContractorReport(report._id)
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
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <HardHat className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Labour Reports</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Daily labour submission records — {total} total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60 px-4 py-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search contractor name…" value={filters.contractorName}
              onChange={e => setFilters(p => ({ ...p, contractorName: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full pl-9 pr-3 py-2 h-[38px] rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-orange-400 transition-colors" />
          </div>
          {/* Shift */}
          <div className="relative shrink-0">
            <select value={filters.shiftType} onChange={e => setFilters(p => ({ ...p, shiftType: e.target.value }))}
              className="appearance-none pl-3 pr-8 py-2 h-[38px] rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-orange-400 transition-colors cursor-pointer">
              <option value="">All shifts</option>
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {/* Date range */}
          <DateRangeInput from={filters.from} to={filters.to} onChange={(f, v) => setFilters(p => ({ ...p, [f]: v }))} />
          {/* Actions */}
          <button onClick={applyFilters} className="flex items-center gap-1.5 px-4 py-2 h-[38px] bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors shrink-0">
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
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Contractor</th>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-left font-medium">Work Type</th>
                  <th className="px-4 py-3 text-left font-medium">Shift</th>
                  <th className="px-4 py-3 text-right font-medium">Workers</th>
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
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200 whitespace-nowrap tabular-nums text-xs">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium text-xs">{r.contractorName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{r.location}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{r.workType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${shiftCls(r.shiftType)}`}>{r.shiftType}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200 tabular-nums font-medium text-xs">{r.workerCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewRec(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors" title="Edit">
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
      <Drawer open={!!viewRec} onClose={() => setViewRec(null)} title="Labour Report" subtitle={viewRec ? fmtDate(viewRec.date) : ''}>
        {viewRec && (
          <>
            <DetailRow label="Contractor Name" value={viewRec.contractorName} />
            <DetailRow label="Email" value={viewRec.email || '—'} />
            <DetailRow label="Location" value={viewRec.location} />
            <DetailRow label="Work Type" value={viewRec.workType} />
            <DetailRow label="Shift">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${shiftCls(viewRec.shiftType)}`}>{viewRec.shiftType}</span>
            </DetailRow>
            <DetailRow label="Worker Count" value={viewRec.workerCount} />
            <DetailRow label="Date" value={fmtDate(viewRec.date)} />
          </>
        )}
      </Drawer>

      {/* ── Edit Drawer ── */}
      <Drawer
        open={!!editRec} onClose={() => setEditRec(null)}
        title="Edit Labour Report" subtitle={editRec ? editRec.contractorName : ''}
        footer={<>
          <button onClick={() => setEditRec(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-60 transition-colors flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
          </button>
        </>}
      >
        {editRec && (
          <div className="space-y-3">
            <EField label="Contractor Name"><input value={editForm.contractorName} onChange={e => ef('contractorName', e.target.value)} className={eInput} /></EField>
            <EField label="Email"><input type="email" value={editForm.email} onChange={e => ef('email', e.target.value)} className={eInput} /></EField>
            <EField label="Location"><input value={editForm.location} onChange={e => ef('location', e.target.value)} className={eInput} /></EField>
            <EField label="Work Type"><input value={editForm.workType} onChange={e => ef('workType', e.target.value)} className={eInput} /></EField>
            <EField label="Shift Type">
              <div className="flex gap-1.5">
                {SHIFTS.map(s => (
                  <button key={s} type="button" onClick={() => ef('shiftType', s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${editForm.shiftType === s ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </EField>
            <EField label="Worker Count"><input type="number" min={1} value={editForm.workerCount} onChange={e => ef('workerCount', e.target.value)} className={eInput} /></EField>
            <EField label="Date"><input type="date" value={editForm.date} onChange={e => ef('date', e.target.value)} className={eInput} /></EField>
          </div>
        )}
      </Drawer>
    </AdminLayout>
  )
}

const fInput = 'w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-orange-400 transition-colors'
const eInput = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-orange-400 transition-colors'

function EField({ label, children }) {
  return <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>{children}</div>
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function shiftCls(shift) {
  if (shift === 'Day')   return 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
  if (shift === 'Night') return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
  return 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400'
}
