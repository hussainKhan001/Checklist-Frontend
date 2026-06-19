import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { adminGetInspection, adminUpdateInspection, adminDeleteInspection } from '../../api'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { ArrowLeft, Trash2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InspectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { hasPermission } = useAuth()
  const isAdmin = hasPermission('manage_inspections')
  const [ins, setIns] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminGetInspection(id).then(r => setIns(r.data)).finally(() => setLoading(false))
  }, [id])

  const toggleStatus = async () => {
    const newStatus = ins.status === 'SUBMITTED' ? 'DRAFT' : 'SUBMITTED'
    const r = await adminUpdateInspection(id, { status: newStatus })
    setIns(r.data)
    toast.success(`Marked as ${newStatus === 'SUBMITTED' ? 'Submitted' : 'Draft'}`)
  }

  const handleDelete = async () => {
    const ok = await confirm('Permanently delete this inspection?', 'All check point results and photos will be removed.')
    if (!ok) return
    await adminDeleteInspection(id)
    toast.success('Inspection deleted')
    navigate('/inspections')
  }

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div></AdminLayout>
  if (!ins) return <AdminLayout><div className="text-sm text-gray-500 p-4">Inspection not found.</div></AdminLayout>

  const resultCount = { OK: 0, NOT_OK: 0, PENDING: 0 }
  ins.results.forEach(r => { resultCount[r.result] = (resultCount[r.result] || 0) + 1 })

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Back + actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/inspections')}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Inspections
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ins.tradeId?.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {ins.projectId?.name} · {ins.floorId?.label} · {ins.locationId?.name}
              {ins.elementId && (
                <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">· {ins.elementId.name}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={ins.status} />
            {isAdmin && (
              <button
                onClick={toggleStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Mark as {ins.status === 'SUBMITTED' ? 'Draft' : 'Submitted'}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Date', value: new Date(ins.dateOfCheck).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
            { label: 'Contractor', value: ins.contractorAgency || '—' },
            { label: 'Site Engineer', value: ins.checkedBy || '—' },
            { label: 'OK', value: resultCount.OK, cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Not OK', value: resultCount.NOT_OK, cls: 'text-red-600 dark:text-red-400' },
            { label: 'Pending', value: resultCount.PENDING, cls: 'text-amber-600 dark:text-amber-400' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</div>
              <div className={`text-sm font-bold ${cls || 'text-gray-900 dark:text-white'}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Work notes */}
        {ins.workNotes && (
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-4 py-3">
            <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1">Work Done</div>
            <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{ins.workNotes}</p>
          </div>
        )}

        {/* Checkpoints */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Check Points</h2>
          <div className="space-y-2">
            {ins.results.map((r, i) => {
              const cp = r.checkPointId
              const isOK = r.result === 'OK'
              const isNOK = r.result === 'NOT_OK'
              return (
                <div key={i} className="flex gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                  <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {cp?.order || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{cp?.title || '—'}</span>
                      {ins.elementId && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          {ins.elementId.name}
                        </span>
                      )}
                    </div>
                    {cp?.standard && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"><span className="font-medium">Standard:</span> {cp.standard}</div>}
                    {r.remarks && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"><span className="font-medium">Remarks:</span> {r.remarks}</div>}
                    {r.photos?.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {r.photos.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      isOK ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                           : isNOK ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                           : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    }`}>
                      {isOK ? <CheckCircle2 className="w-3 h-3" /> : isNOK ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {r.result.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
