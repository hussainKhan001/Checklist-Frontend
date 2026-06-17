import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  getProject, getFloor, getLocations, getTrade, getCheckPoints,
  getElements, createInspection, updateInspection, submitInspection,
  uploadPhoto, getDraftInspection, checkDuplicateInspection,
} from '../api'
import {
  ArrowLeft, ChevronRight, AlertTriangle, Camera, CheckCircle2,
  XCircle, MapPin, Calendar, Building2, User, ClipboardCheck,
  RefreshCw, Save, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition'

const fmtTime = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ChecklistForm() {
  const { tradeId } = useParams()
  const { projectId, floorId, locationId, elementId } = JSON.parse(sessionStorage.getItem('checklistCtx') || '{}')
  const navigate = useNavigate()

  // Core data
  const [project, setProject]       = useState(null)
  const [floor, setFloor]           = useState(null)
  const [location, setLocation]     = useState(null)
  const [element, setElement]       = useState(null)
  const [trade, setTrade]           = useState(null)
  const [checkPoints, setCheckPoints] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  // Form fields
  const [contractorAgency, setContractorAgency] = useState('')
  const [checkedBy, setCheckedBy]               = useState('')
  const [dateOfCheck, setDateOfCheck]           = useState(new Date().toISOString().split('T')[0])
  const [workNotes, setWorkNotes]               = useState('')
  const [results, setResults]                   = useState({})
  const [photos, setPhotos]                     = useState({})
  const fileInputRefs = useRef({})

  // Draft / duplicate state
  const [inspectionId, setInspectionId]           = useState(null)
  const [showDraftBanner, setShowDraftBanner]     = useState(false)
  const [draftRestoredAt, setDraftRestoredAt]     = useState(null)
  const [lastSaved, setLastSaved]                 = useState(null)
  const [savingDraft, setSavingDraft]             = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [existingSubmission, setExistingSubmission] = useState(null)

  const autoSaveTimer   = useRef(null)
  const inspectionIdRef = useRef(null)
  useEffect(() => { inspectionIdRef.current = inspectionId }, [inspectionId])

  // ── Load all data + run duplicate/draft checks in one pass ─────────────────
  useEffect(() => {
    if (!projectId || !floorId || !locationId) {
      setError('Missing context. Please navigate from the project page.')
      setLoading(false)
      return
    }
    const today = new Date().toISOString().split('T')[0]
    const dupParams   = { locationId, tradeId, date: today, ...(elementId && { elementId }) }
    const draftParams = { locationId, tradeId, date: today, ...(elementId && { elementId }) }

    Promise.all([
      getProject(projectId),
      getFloor(floorId),
      getLocations(floorId),
      getTrade(tradeId),
      getCheckPoints(tradeId, elementId || null),
      elementId ? getElements(locationId) : Promise.resolve({ data: [] }),
      checkDuplicateInspection(dupParams),
      getDraftInspection(draftParams),
    ])
      .then(([pRes, fRes, lRes, tRes, cpRes, eRes, dupRes, draftRes]) => {
        setProject(pRes.data)
        setFloor(fRes.data)
        setLocation(lRes.data.find(l => l._id === locationId) || null)
        if (elementId) setElement(eRes.data.find(e => e._id === elementId) || null)
        setTrade(tRes.data)

        const cpList = cpRes.data
        setCheckPoints(cpList)
        const initial = {}
        cpList.forEach(cp => { initial[cp._id] = 'PENDING' })

        // Step 1: check if already submitted today
        if (dupRes.data.exists) {
          setExistingSubmission(dupRes.data.inspection)
          setShowDuplicateModal(true)
          setResults(initial)
          return
        }

        // Step 2: restore draft if found
        if (draftRes.data.found) {
          const insp = draftRes.data.inspection
          setInspectionId(insp._id)
          setDateOfCheck(new Date(insp.dateOfCheck).toISOString().split('T')[0])
          setContractorAgency(insp.contractorAgency || '')
          setCheckedBy(insp.checkedBy || '')
          setWorkNotes(insp.workNotes || '')

          const restored = { ...initial }
          const restoredPhotos = {}
          insp.results?.forEach(r => {
            const k = typeof r.checkPointId === 'string' ? r.checkPointId : r.checkPointId?.toString()
            if (k) {
              restored[k] = r.result
              if (r.photos?.length) restoredPhotos[k] = r.photos
            }
          })
          setResults(restored)
          setPhotos(restoredPhotos)
          setDraftRestoredAt(insp.updatedAt)
          setShowDraftBanner(true)
        } else {
          setResults(initial)
        }
      })
      .catch(() => setError('Failed to load checklist.'))
      .finally(() => setLoading(false))
  }, [projectId, floorId, locationId, tradeId])

  // ── Auto-save debounce (only when a draft ID is already set) ───────────────
  useEffect(() => {
    if (loading || !checkPoints.length) return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      const id = inspectionIdRef.current
      if (!id) return
      try {
        await updateInspection(id, buildPayload())
        setLastSaved(new Date())
      } catch {}
    }, 2000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [results, photos, contractorAgency, checkedBy, dateOfCheck, workNotes])

  const buildPayload = () => ({
    projectId, floorId, locationId,
    ...(elementId ? { elementId } : {}),
    tradeId,
    dateOfCheck, workNotes, contractorAgency, checkedBy,
    results: checkPoints.map(cp => ({
      checkPointId: cp._id,
      result:       results[cp._id] || 'PENDING',
      photos:       photos[cp._id]  || [],
    })),
  })

  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      const payload = buildPayload()
      if (inspectionId) {
        await updateInspection(inspectionId, payload)
      } else {
        const { data: insp } = await createInspection(payload)
        setInspectionId(insp._id)
      }
      setLastSaved(new Date())
      toast.success('Draft saved.')
    } catch {
      toast.error('Failed to save draft.')
    } finally {
      setSavingDraft(false)
    }
  }

  const setResult = (cpId, value) => setResults(prev => ({ ...prev, [cpId]: value }))

  const handlePhotoUpload = async (cpId, file) => {
    if (!file) return
    try {
      const fd = new FormData()
      fd.append('photo', file)
      if (inspectionId) fd.append('inspectionId', inspectionId)
      const res = await uploadPhoto(fd)
      setPhotos(prev => ({ ...prev, [cpId]: [...(prev[cpId] || []), res.data.url] }))
    } catch {
      toast.error('Photo upload failed.')
    }
  }

  const handleSubmit = async () => {
    clearTimeout(autoSaveTimer.current)
    setSubmitting(true)
    try {
      const payload = buildPayload()
      if (inspectionId) {
        await submitInspection(inspectionId, payload)
      } else {
        const { data: insp } = await createInspection(payload)
        await submitInspection(insp._id, {})
      }
      setSubmitted(true)
    } catch {
      toast.error('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm animate-pulse">
      Loading checklist…
    </div>
  )

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Checklist Submitted</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          {trade?.name} — {project?.name}, {floor?.label}, {location?.name}
          {element && ` / ${element.name}`}
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full max-w-xs px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-sm transition"
        >
          Back to Projects
        </button>
      </div>
    )
  }

  const locationName = location?.name || locationId
  const okCount      = Object.values(results).filter(r => r === 'OK').length
  const notOkCount   = Object.values(results).filter(r => r === 'NOT_OK').length
  const pendingCount = checkPoints.length - okCount - notOkCount

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-24">

      {/* ── Duplicate submission modal ──────────────────────────────────────── */}
      {showDuplicateModal && existingSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1">Already submitted today</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This room + trade was already submitted today. Do you want to file an additional submission?
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Submitted by</span>
                <span className="font-medium text-gray-800 dark:text-white">{existingSubmission.checkedBy || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="font-medium text-gray-800 dark:text-white">{fmtDateTime(existingSubmission.submittedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Checkpoints filled</span>
                <span className="font-medium text-gray-800 dark:text-white">{existingSubmission.filledCount} of {existingSubmission.totalCount}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Go back
              </button>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
              >
                New submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-400 flex-wrap">
        <Link to="/" className="hover:text-orange-500 transition-colors font-medium truncate max-w-[100px]">{project?.name || '…'}</Link>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <Link to={`/p/${projectId}`} className="hover:text-orange-500 transition-colors font-medium">{floor?.label || '…'}</Link>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <Link to={`/p/${projectId}/f/${floorId}`} className="hover:text-orange-500 transition-colors font-medium">{locationName}</Link>
        {element && (
          <>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="text-gray-500 dark:text-gray-400 font-medium truncate max-w-[80px]">{element.name}</span>
          </>
        )}
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <span className="text-gray-600 dark:text-gray-300 font-medium truncate max-w-[120px]">{trade?.name || '…'}</span>
      </nav>

      {/* Back + title */}
      <div>
        <button
          onClick={() => navigate(`/p/${projectId}/f/${floorId}/l/${locationId}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-orange-500 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Change trade
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">{trade?.name}</h1>
      </div>

      {/* ── Draft restored banner ───────────────────────────────────────────── */}
      {showDraftBanner && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25">
          <RefreshCw className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Draft restored from {fmtTime(draftRestoredAt)}
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
              {okCount + notOkCount} of {checkPoints.length} checkpoints were filled — continue from where you left off
            </p>
          </div>
          <button onClick={() => setShowDraftBanner(false)} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-lg leading-none">×</button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Why it matters */}
      {trade?.whyItMatters && (
        <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
            <span className="font-bold">Why this matters: </span>{trade.whyItMatters}
          </p>
        </div>
      )}

      {/* Meta info card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Project / Location</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {project?.name} — {floor?.label}, {locationName}
                {element && <span className="text-orange-500"> / {element.name}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Date of Inspection</label>
              <input type="date" className={inputCls} value={dateOfCheck} onChange={e => setDateOfCheck(e.target.value)} />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Contractor / Agency</label>
              <input className={inputCls} placeholder="Agency name" value={contractorAgency} onChange={e => setContractorAgency(e.target.value)} />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Checked By (Site Engineer)</label>
              <input className={inputCls} placeholder="Full name" value={checkedBy} onChange={e => setCheckedBy(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Daily work notes */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ClipboardCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Work Done Today <span className="normal-case font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="Describe today's progress — e.g. 'Completed brickwork up to lintel level on North wall. Mortar mixing ratio verified.'"
              value={workNotes}
              onChange={e => setWorkNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {checkPoints.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{okCount + notOkCount} / {checkPoints.length} reviewed</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${((okCount + notOkCount) / checkPoints.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2.5 text-xs">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> {okCount} OK
            </span>
            <span className="flex items-center gap-1 text-red-500 font-medium">
              <XCircle className="w-3.5 h-3.5" /> {notOkCount} Not OK
            </span>
            <span className="text-gray-400">{pendingCount} pending</span>
          </div>
        </div>
      )}

      {/* Check points */}
      <div className="space-y-3">
        {checkPoints.map(cp => {
          const cpResult = results[cp._id]
          return (
            <div
              key={cp._id}
              className={`bg-white dark:bg-gray-800 border rounded-xl shadow-sm overflow-hidden transition-all ${
                cpResult === 'OK'     ? 'border-emerald-300 dark:border-emerald-500/40' :
                cpResult === 'NOT_OK' ? 'border-red-300 dark:border-red-500/40' :
                'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className={`flex items-start gap-3 p-4 ${
                cpResult === 'OK'     ? 'bg-emerald-50/60 dark:bg-emerald-500/5' :
                cpResult === 'NOT_OK' ? 'bg-red-50/60 dark:bg-red-500/5' : ''
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                  cpResult === 'OK'     ? 'bg-emerald-500 text-white' :
                  cpResult === 'NOT_OK' ? 'bg-red-500 text-white' :
                  'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
                }`}>
                  {cp.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{cp.title}</span>
                    {cp.photoRequired && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex-shrink-0">
                        <Camera className="w-2.5 h-2.5" /> Photo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(cp.standard || cp.howToCheck) && (
                <div className="px-4 pb-3 space-y-2 border-t border-gray-50 dark:border-gray-700/50 pt-3">
                  {cp.standard && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Standard: </span>{cp.standard}
                    </p>
                  )}
                  {cp.howToCheck && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      <span className="font-semibold text-gray-600 dark:text-gray-300">How to check: </span>{cp.howToCheck}
                    </p>
                  )}
                </div>
              )}

              <div className="px-4 pb-4 pt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setResult(cp._id, cpResult === 'OK' ? 'PENDING' : 'OK')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    cpResult === 'OK'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> OK
                </button>
                <button
                  onClick={() => setResult(cp._id, cpResult === 'NOT_OK' ? 'PENDING' : 'NOT_OK')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    cpResult === 'NOT_OK'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-500'
                  }`}
                >
                  <XCircle className="w-4 h-4" /> Not OK
                </button>
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                  (photos[cp._id] || []).length > 0
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : 'border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-amber-400 hover:text-amber-600'
                }`}>
                  <Camera className="w-4 h-4" />
                  {(photos[cp._id] || []).length > 0
                    ? `${photos[cp._id].length} photo${photos[cp._id].length > 1 ? 's' : ''}`
                    : cp.photoRequired ? 'Add photo (required)' : 'Add photo'
                  }
                  <input
                    type="file" accept="image/*" className="hidden"
                    ref={el => fileInputRefs.current[cp._id] = el}
                    onChange={e => handlePhotoUpload(cp._id, e.target.files[0])}
                  />
                </label>
              </div>

              {(photos[cp._id] || []).length > 0 && (
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {photos[cp._id].map((url, i) => (
                    <img key={i} src={url} alt={`cp-${i}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Result summary note */}
      <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <ClipboardCheck className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="font-bold text-gray-700 dark:text-gray-200">Result — </span>
          All points OK → work approved to proceed. Any Not OK → record action, rectify, re-inspect BEFORE the next activity covers it.
        </p>
      </div>

      {/* ── Save status bar + action buttons ───────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-400 flex items-center gap-1.5 min-w-0">
          {lastSaved
            ? <><Save className="w-3 h-3 flex-shrink-0" /><span className="truncate">Auto-saved {fmtTime(lastSaved)}</span></>
            : <><Clock className="w-3 h-3 flex-shrink-0" /><span>Not yet saved</span></>
          }
        </span>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {savingDraft ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-1.5 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold shadow-sm transition"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
