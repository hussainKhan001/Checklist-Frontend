import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import {
  adminGetInspection, adminApproveInspection,
  adminRejectInspection, adminDeleteInspection,
} from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import {
  ArrowLeft, Trash2, CheckCircle2, XCircle, Clock,
  ThumbsUp, ThumbsDown, RotateCcw, Camera, FileText,
  MessageSquare, User, CalendarCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  DRAFT:     { label: 'Draft',           cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  SUBMITTED: { label: 'Awaiting Review', cls: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  APPROVED:  { label: 'Approved ✓',      cls: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  REJECTED:  { label: 'Rework Needed',   cls: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400' },
}

function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.DRAFT
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${s.cls}`}>{s.label}</span>
}

// ── Circuit indicator ──────────────────────────────────────────────────────────
function CircuitFlow({ status }) {
  const steps = [
    { key: 'DRAFT',     label: 'Draft',     icon: Clock },
    { key: 'SUBMITTED', label: 'Submitted', icon: MessageSquare },
    { key: 'APPROVED',  label: 'Approved',  icon: CheckCircle2 },
  ]
  const order = { DRAFT: 0, SUBMITTED: 1, REJECTED: 1, APPROVED: 2 }
  const current = order[status] ?? 0

  return (
    <div className="flex items-center gap-0 w-full max-w-sm">
      {steps.map((s, i) => {
        const Icon = s.icon
        const done = current > i
        const active = (status === 'REJECTED' && s.key === 'SUBMITTED') ? false : current === i
        const rejected = status === 'REJECTED' && s.key === 'SUBMITTED'
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className={`flex flex-col items-center ${i > 0 ? 'flex-1' : ''}`}>
              {i > 0 && (
                <div className={`w-full h-0.5 mb-1 ${done || current > i ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                rejected    ? 'bg-red-100 dark:bg-red-500/15 text-red-500' :
                done        ? 'bg-emerald-500 text-white' :
                active      ? 'bg-orange-500 text-white' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}>
                {rejected ? <XCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${
                rejected ? 'text-red-500' :
                done || active ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {rejected ? 'Rejected' : s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mt-[-18px] ${done ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function InspectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { hasPermission } = useAuth()
  const isAdmin = hasPermission('manage_inspections')
  const [ins, setIns] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    adminGetInspection(id).then(r => {
      setIns(r.data)
      setReviewNotes(r.data.reviewNotes || '')
    }).finally(() => setLoading(false))
  }, [id])

  const handleApprove = async () => {
    setActing(true)
    try {
      const r = await adminApproveInspection(id, { reviewNotes })
      setIns(r.data)
      setShowRejectForm(false)
      toast.success('Inspection approved — circuit closed ✓')
    } catch { toast.error('Failed to approve.') }
    finally { setActing(false) }
  }

  const handleReject = async () => {
    if (!reviewNotes.trim()) return toast.error('Please add a note explaining what needs rework.')
    setActing(true)
    try {
      const r = await adminRejectInspection(id, { reviewNotes })
      setIns(r.data)
      setShowRejectForm(false)
      toast.success('Marked as Rework Needed — worker will be notified.')
    } catch { toast.error('Failed to reject.') }
    finally { setActing(false) }
  }

  const handleReopen = async () => {
    const ok = await confirm('Reopen this inspection for re-review?', 'Status will go back to "Awaiting Review".')
    if (!ok) return
    setActing(true)
    try {
      const { adminUpdateInspection } = await import('../../services/api')
      const r = await adminUpdateInspection(id, { status: 'SUBMITTED', approvedAt: null, reviewNotes: '' })
      setIns(r.data)
      setReviewNotes('')
      toast.success('Reopened for review.')
    } catch { toast.error('Failed to reopen.') }
    finally { setActing(false) }
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

  const canApprove = isAdmin && ins.status === 'SUBMITTED'
  const canReject  = isAdmin && ins.status === 'SUBMITTED'
  const canReopen  = isAdmin && (ins.status === 'APPROVED' || ins.status === 'REJECTED')
  const isClosed   = ins.status === 'APPROVED'

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* Back */}
        <button onClick={() => navigate('/inspections')} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Inspections
        </button>

        {/* Header + circuit */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ins.tradeId?.name}</h1>
                <StatusPill status={ins.status} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {ins.projectId?.name} · {ins.floorId?.label} · {ins.locationId?.name}
                {ins.elementId && <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">· {ins.elementId.name}</span>}
              </p>
            </div>
            <CircuitFlow status={ins.status} />
          </div>
        </div>

        {/* ── Review Panel (admin actions) ─────────────────────────────── */}
        {isAdmin && (ins.status === 'SUBMITTED' || ins.status === 'APPROVED' || ins.status === 'REJECTED') && (
          <div className={`border rounded-xl p-5 ${
            isClosed
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
              : ins.status === 'REJECTED'
                ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
          }`}>

            {/* Approved state */}
            {isClosed && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Circuit Closed — Inspection Approved</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Approved by <strong>{ins.reviewedBy}</strong> · {ins.approvedAt ? new Date(ins.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                  {ins.reviewNotes && <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 italic">"{ins.reviewNotes}"</p>}
                </div>
                <button onClick={handleReopen} disabled={acting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition">
                  <RotateCcw className="w-3.5 h-3.5" /> Reopen
                </button>
              </div>
            )}

            {/* Rejected state */}
            {ins.status === 'REJECTED' && (
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-800 dark:text-red-300">Rework Required</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Reviewed by <strong>{ins.reviewedBy}</strong></p>
                  {ins.reviewNotes && <p className="text-xs text-red-700 dark:text-red-400 mt-1 italic">"{ins.reviewNotes}"</p>}
                </div>
                <button onClick={handleReopen} disabled={acting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition">
                  <RotateCcw className="w-3.5 h-3.5" /> Reopen
                </button>
              </div>
            )}

            {/* Awaiting review state */}
            {ins.status === 'SUBMITTED' && (
              <div className="space-y-3">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Awaiting your review — Approve or request rework
                </p>

                <textarea
                  className="w-full px-3 py-2 text-sm rounded-lg border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                  rows={2}
                  placeholder="Add review notes (required for rejection, optional for approval)…"
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                />

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleApprove}
                    disabled={acting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition"
                  >
                    <ThumbsUp className="w-4 h-4" /> Approve — Close Circuit
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={acting || !reviewNotes.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition"
                  >
                    <ThumbsDown className="w-4 h-4" /> Request Rework
                  </button>
                </div>
                {!reviewNotes.trim() && <p className="text-xs text-gray-400">Add a note to enable the Rework button.</p>}
              </div>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Date', value: new Date(ins.dateOfCheck).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
            {
              label: 'Submitted',
              value: ins.submittedAt ? new Date(ins.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
              sub:   ins.submittedAt ? new Date(ins.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
              cls:   ins.submittedAt ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400',
            },
            { label: 'Contractor', value: ins.contractorAgency || '—' },
            { label: 'Site Engineer', value: ins.checkedBy || '—' },
            { label: 'OK',      value: resultCount.OK,      cls: 'text-emerald-600 dark:text-emerald-400 text-xl font-black' },
            { label: 'Not OK',  value: resultCount.NOT_OK,  cls: 'text-red-500 text-xl font-black' },
            { label: 'Pending', value: resultCount.PENDING, cls: 'text-amber-500 text-xl font-black' },
          ].map(({ label, value, sub, cls }) => (
            <div key={label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{label}</div>
              <div className={`text-sm font-bold ${cls || 'text-gray-900 dark:text-white'}`}>{value}</div>
              {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
            </div>
          ))}
        </div>

        {/* Work notes */}
        {ins.workNotes && (
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-4 py-3">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Work Done / Notes</div>
            <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{ins.workNotes}</p>
          </div>
        )}

        {/* Checkpoints */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Checklist Items</h2>
          <div className="space-y-2">
            {ins.results.map((r, i) => {
              const cp = r.checkPointId
              const isOK  = r.result === 'OK'
              const isNOK = r.result === 'NOT_OK'
              return (
                <div key={i} className={`flex gap-3 bg-white dark:bg-gray-800 border rounded-xl p-4 shadow-sm ${
                  isOK  ? 'border-emerald-200 dark:border-emerald-500/30' :
                  isNOK ? 'border-red-200 dark:border-red-500/30' :
                          'border-gray-200 dark:border-gray-700'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isOK  ? 'bg-emerald-500 text-white' :
                    isNOK ? 'bg-red-500 text-white' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {cp?.order || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{cp?.title || '—'}</span>
                      {ins.elementId && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          {ins.elementId.name}
                        </span>
                      )}
                      {ins.submittedAt && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          {new Date(ins.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {cp?.standard && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"><span className="font-medium">Standard:</span> {cp.standard}</div>}
                    {r.remarks && <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Remarks: {r.remarks}</div>}
                    {r.photos?.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {r.photos.map((url, idx) => (
                          url?.toLowerCase().includes('.pdf') || url?.includes('/raw/upload/')
                            ? <a key={idx} href={url} target="_blank" rel="noreferrer" className="w-14 h-14 flex flex-col items-center justify-center rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-500/10 gap-1"><FileText className="w-5 h-5 text-red-500" /><span className="text-[9px] text-red-500 font-bold">PDF</span></a>
                            : <a key={idx} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity" /></a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isOK  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                      isNOK ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400' :
                              'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    }`}>
                      {isOK ? <CheckCircle2 className="w-3 h-3" /> : isNOK ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {isOK ? 'OK' : isNOK ? 'Not OK' : 'Pending'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Delete */}
        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition">
              <Trash2 className="w-3.5 h-3.5" /> Delete Inspection
            </button>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
