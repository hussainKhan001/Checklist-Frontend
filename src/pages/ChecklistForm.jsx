import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  getProject, getFloor, getLocations, getTrade, getCheckPoints,
  getElements, createInspection, updateInspection, submitInspection,
  uploadPhoto, getDraftInspection, getInspections, checkDuplicateInspection,
} from '../services/api'
import {
  ArrowLeft, ChevronRight, AlertTriangle, Camera, CheckCircle2,
  XCircle, MapPin, Calendar, ClipboardCheck, FileText,
  RefreshCw, Save, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition'

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''

// Compress image client-side before upload (max 1280px, 75% JPEG quality)
const compressImage = (file, maxPx = 1280, quality = 0.75) =>
  new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) } // fallback: upload original
    img.src = url
  })

export default function ChecklistForm() {
  const { tradeId } = useParams()
  const { projectId, floorId, locationId, elementId } = JSON.parse(
    sessionStorage.getItem('checklistCtx') || localStorage.getItem(`checklistCtx_${tradeId}`) || '{}'
  )
  const navigate = useNavigate()

  // Context data
  const [project, setProject]     = useState(null)
  const [floor, setFloor]         = useState(null)
  const [location, setLocation]   = useState(null)
  const [element, setElement]     = useState(null)
  const [trade, setTrade]         = useState(null)
  const [checkPoints, setCheckPoints] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [photoErrorCpIds, setPhotoErrorCpIds] = useState(new Set())

  // Form fields
  const [dateOfCheck, setDateOfCheck]           = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  const [workNotes, setWorkNotes]               = useState('')
  const [results, setResults]                   = useState({})
  const [photos, setPhotos]                     = useState({})
  const fileInputRefs = useRef({})

  // Draft / duplicate state
  const inspIdRef       = useRef(null)
  const initDoneRef     = useRef(false)
  const userEditedRef   = useRef(false) // true only after user makes a real change
  const preFilledCpIds  = useRef(new Set()) // checkpoint IDs that came from previous submission
  const [lockedOkCpIds, setLockedOkCpIds] = useState(new Set()) // cpIds saved as OK → permanently locked
  const autoSaveTimer   = useRef(null)
  const [inspectionId, setInspectionId]           = useState(null)
  const [lastSaved, setLastSaved]                 = useState(null)
  const [isSaving, setIsSaving]                   = useState(false)
  const [draftRestoredAt, setDraftRestoredAt]     = useState(null)
  const [showDraftBanner, setShowDraftBanner]     = useState(false)
  const [uploadingCps, setUploadingCps]           = useState(new Set())
  const [prevSubmission, setPrevSubmission]       = useState(null) // last SUBMITTED for this wall
  const [isLockedToday, setIsLockedToday]         = useState(false) // today already submitted → read-only

  // ── Load context data ────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getProject(projectId),
      getFloor(floorId),
      getLocations(floorId),
      getTrade(tradeId),
      getCheckPoints(tradeId, projectId, elementId || null),
      elementId ? getElements(locationId) : Promise.resolve({ data: [] }),
    ])
      .then(([pRes, fRes, lRes, tRes, cpRes, eRes]) => {
        setProject(pRes.data)
        setFloor(fRes.data)
        setLocation(lRes.data.find(l => l._id === locationId) || null)
        if (elementId) setElement(eRes.data.find(e => e._id === elementId) || null)
        setTrade(tRes.data)
        setCheckPoints(cpRes.data)
        const initial = {}
        cpRes.data.forEach(cp => { initial[cp._id] = 'PENDING' })
        setResults(initial)
        initDraft()
      })
      .catch(() => setError('Failed to load checklist.'))
      .finally(() => setLoading(false))
  }, [projectId, floorId, locationId, tradeId])

  // ── Init: check for today's DRAFT to resume + any previous SUBMITTED ────────
  const initDraft = async () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const params = { locationId, tradeId, date: today }
    if (elementId && elementId !== 'undefined' && elementId !== 'null' && elementId !== '') {
      params.elementId = elementId
    }
    try {
      // Run all checks in parallel
      const prevParams = { locationId, tradeId, status: 'SUBMITTED' }
      const dupParams  = { locationId, tradeId, date: today }
      if (elementId && elementId !== 'undefined' && elementId !== 'null' && elementId !== '') {
        prevParams.elementId = elementId
        dupParams.elementId  = elementId
      }
      const [draftRes, prevRes, dupRes] = await Promise.all([
        getDraftInspection(params).catch(() => ({ data: { found: false } })),
        getInspections(prevParams).catch(() => ({ data: [] })),
        checkDuplicateInspection(dupParams).catch(() => ({ data: { exists: false } })),
      ])

      const allSubmitted   = Array.isArray(prevRes.data) ? prevRes.data : []
      const lastSubmission = allSubmitted[0] // newest (any date), for pre-fill
      const submittedToday = dupRes.data.exists // server confirmed today's submission exists

      if (lastSubmission) setPrevSubmission(lastSubmission)

      const preloadResults = (src) => {
        const r = {}; const p = {}
        src.results?.forEach(item => {
          const cpId = String(item.checkPointId?._id || item.checkPointId || '')
          if (cpId) { r[cpId] = item.result; if (item.photos?.length) p[cpId] = item.photos }
        })
        return { r, p }
      }

      if (draftRes.data.found) {
        // Priority 1: today's DRAFT — restore it
        const draft = draftRes.data.inspection
        inspIdRef.current = draft._id
        setInspectionId(draft._id)
        setDateOfCheck(draft.dateOfCheck ? draft.dateOfCheck.split('T')[0] : today)
        setWorkNotes(draft.workNotes || '')
        const { r, p } = preloadResults(draft)
        setResults(prev => ({ ...prev, ...r }))
        setPhotos(p)
        setDraftRestoredAt(draft.updatedAt)
        setShowDraftBanner(true)
      } else if (submittedToday && lastSubmission) {
        // Priority 2a: already submitted today — OK items locked, NOT_OK items editable for re-inspection
        const { r, p } = preloadResults(lastSubmission)
        setResults(prev => ({ ...prev, ...r }))
        setPhotos(p)
        if (lastSubmission.workNotes) setWorkNotes(lastSubmission.workNotes)
        preFilledCpIds.current = new Set(Object.keys(r).filter(id => r[id] !== 'PENDING'))
        setLockedOkCpIds(new Set(Object.keys(r).filter(id => r[id] === 'OK')))
        inspIdRef.current = lastSubmission._id
        setInspectionId(lastSubmission._id)
        setIsLockedToday(true)
      } else if (lastSubmission) {
        // Priority 2b: not submitted today — pre-fill from last, immediately editable
        const { r, p } = preloadResults(lastSubmission)
        setResults(prev => ({ ...prev, ...r }))
        setPhotos(p)
        if (lastSubmission.workNotes) setWorkNotes(lastSubmission.workNotes)
      }
    } catch {
      // Silent — proceed with blank form
    }
    initDoneRef.current = true
  }

  // ── Auto-save (debounced 2 s) ────────────────────────────────────────────────
  const buildPayload = () => ({
    projectId, floorId, locationId,
    ...(elementId ? { elementId } : {}),
    tradeId,
    dateOfCheck,
    workNotes,
    results: checkPoints.map(cp => ({
      checkPointId: cp._id,
      result:  results[cp._id] || 'PENDING',
      photos:  photos[cp._id]  || [],
    })),
  })

  const saveDraft = async () => {
    setIsSaving(true)
    try {
      const payload = buildPayload()
      if (inspIdRef.current) {
        await updateInspection(inspIdRef.current, payload)
      } else {
        const { data } = await createInspection(payload)
        inspIdRef.current = data._id
        setInspectionId(data._id)
      }
      setLastSaved(new Date())
    } catch {
      // Silent auto-save failure — don't toast
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!initDoneRef.current) return
    if (!userEditedRef.current) return            // don't save on initial pre-fill
    if (isLockedToday) return  // re-inspection mode: Submit-only, no auto-draft
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(saveDraft, 2000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [results, photos, workNotes, dateOfCheck, isLockedToday])

  // ── Photo upload ─────────────────────────────────────────────────────────────
  const setResult = (cpId, value) => {
    userEditedRef.current = true
    setResults(prev => ({ ...prev, [cpId]: value }))
  }

  const handlePhotoUpload = async (cpId, file) => {
    if (!file) return
    userEditedRef.current = true
    setUploadingCps(prev => new Set(prev).add(cpId))
    try {
      const isPdf = file.type === 'application/pdf'
      const toUpload = isPdf ? file : await compressImage(file)
      const fd = new FormData()
      fd.append('photo', toUpload)
      if (inspIdRef.current) fd.append('inspectionId', inspIdRef.current)
      const res = await uploadPhoto(fd)
      setPhotos(prev => ({ ...prev, [cpId]: [...(prev[cpId] || []), res.data.url] }))
      setPhotoErrorCpIds(prev => { const s = new Set(prev); s.delete(String(cpId)); return s })
    } catch {
      toast.error('Upload failed.')
    } finally {
      setUploadingCps(prev => { const s = new Set(prev); s.delete(cpId); return s })
    }
  }

  const isPdfUrl = (url) => url?.toLowerCase().includes('.pdf') || url?.includes('/raw/upload/')

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validate: photoRequired checkpoints must have a photo before submitting
    const missingPhoto = checkPoints.filter(cp =>
      cp.photoRequired &&
      results[cp._id] === 'OK' &&
      (!photos[cp._id] || photos[cp._id].length === 0)
    )
    if (missingPhoto.length > 0) {
      setPhotoErrorCpIds(new Set(missingPhoto.map(cp => String(cp._id))))
      toast.error(`${missingPhoto.length} checkpoint${missingPhoto.length > 1 ? 's require' : ' requires'} a photo before submitting.`)
      // Scroll to first problematic checkpoint
      const first = document.getElementById(`cp-${missingPhoto[0]._id}`)
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setPhotoErrorCpIds(new Set())

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setSubmitting(true)
    try {
      const payload = buildPayload()
      let id = inspIdRef.current
      if (id) {
        await updateInspection(id, payload)
      } else {
        const { data } = await createInspection(payload)
        id = data._id
        inspIdRef.current = id
        setInspectionId(id)
      }
      await submitInspection(id, {})
      setSubmitted(true)
      try { new BroadcastChannel('nqc-inspections').postMessage({ type: 'submitted' }) } catch {}
    } catch {
      toast.error('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / Submitted screens ──────────────────────────────────────────────
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
  const filledCount  = okCount + notOkCount

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-16">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-400 flex-wrap">
        <Link to="/" className="hover:text-orange-500 transition-colors font-medium truncate max-w-[100px]">
          {project?.name || '…'}
        </Link>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <Link to={`/p/${projectId}`} className="hover:text-orange-500 transition-colors font-medium">
          {floor?.label || '…'}
        </Link>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <Link to={`/p/${projectId}/f/${floorId}`} className="hover:text-orange-500 transition-colors font-medium">
          {locationName}
        </Link>
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
          {trade?.name}
        </h1>
      </div>

      {/* ── Locked: already submitted today ─────────────────────────────────── */}
      {isLockedToday && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Submitted today — OK items locked
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              Not OK items can still be updated and re-submitted after rectification.
            </p>
          </div>
        </div>
      )}

      {/* ── Previously submitted banner ─────────────────────────────────────── */}
      {prevSubmission && !showDraftBanner && !isLockedToday && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/40">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Continuing from last submission · {new Date(prevSubmission.submittedAt || prevSubmission.dateOfCheck || prevSubmission.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Previous results loaded. Update checkpoints and submit to record today's inspection.
            </p>
          </div>
        </div>
      )}

      {/* ── Draft restored banner ────────────────────────────────────────────── */}
      {showDraftBanner && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
          <RefreshCw className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Draft restored from {fmtTime(draftRestoredAt)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              {filledCount} of {checkPoints.length} checkpoints were filled — continue from where you left off.
            </p>
          </div>
          <button onClick={() => setShowDraftBanner(false)} className="ml-auto text-blue-300 hover:text-blue-500 transition-colors text-lg leading-none">×</button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400">
          {error}
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
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Date of Inspection
              </label>
              <input
                type="date"
                className={inputCls}
                value={dateOfCheck}
                onChange={e => { userEditedRef.current = true; setDateOfCheck(e.target.value) }}
              />
            </div>
          </div>

        </div>
      </div>


      {/* Progress bar */}
      {checkPoints.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filledCount} / {checkPoints.length} reviewed
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(filledCount / checkPoints.length) * 100}%` }}
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
              id={`cp-${cp._id}`}
              className={`bg-white dark:bg-gray-800 border rounded-xl shadow-sm overflow-hidden transition-all ${
                photoErrorCpIds.has(String(cp._id))
                  ? 'border-red-500 dark:border-red-500 ring-2 ring-red-400/50'
                  : cpResult === 'OK'     ? 'border-emerald-300 dark:border-emerald-500/40'
                  : cpResult === 'NOT_OK' ? 'border-red-300 dark:border-red-500/40'
                  :                        'border-gray-200 dark:border-gray-700'
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
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Standard: </span>
                      {cp.standard}
                    </p>
                  )}
                  {cp.howToCheck && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      <span className="font-semibold text-gray-600 dark:text-gray-300">How to check: </span>
                      {cp.howToCheck}
                    </p>
                  )}
                </div>
              )}

              {(() => {
                const isAnyLock = isLockedToday
                // Saved as OK → both buttons locked. Saved as NOT_OK → both buttons editable.
                const cpLocked = isAnyLock && lockedOkCpIds.has(String(cp._id))
                const notOkBtnLocked = cpLocked
                return (
                  <>
                    <div className="px-4 pb-4 pt-2 flex flex-wrap items-center gap-2">
                      <button
                        disabled={cpLocked}
                        onClick={() => setResult(cp._id, cpResult === 'OK' ? 'PENDING' : 'OK')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                          disabled:opacity-60 disabled:cursor-not-allowed ${
                          cpResult === 'OK'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" /> OK
                      </button>
                      <button
                        disabled={notOkBtnLocked}
                        onClick={() => setResult(cp._id, cpResult === 'NOT_OK' ? 'PENDING' : 'NOT_OK')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                          disabled:opacity-60 disabled:cursor-not-allowed ${
                          cpResult === 'NOT_OK'
                            ? 'bg-red-500 text-white shadow-sm'
                            : 'border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-500'
                        }`}
                      >
                        <XCircle className="w-4 h-4" /> Not OK
                      </button>
                      {!cpLocked && (
                        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                          uploadingCps.has(cp._id)
                            ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-500 cursor-wait'
                            : (photos[cp._id] || []).length > 0
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                              : 'border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-amber-400 hover:text-amber-600'
                        }`}>
                          <Camera className={`w-4 h-4 ${uploadingCps.has(cp._id) ? 'animate-pulse' : ''}`} />
                          {uploadingCps.has(cp._id)
                            ? 'Uploading…'
                            : (photos[cp._id] || []).length > 0
                              ? `${photos[cp._id].length} photo${photos[cp._id].length > 1 ? 's' : ''}`
                              : cp.photoRequired ? 'Add photo (required)' : 'Add photo'
                          }
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={uploadingCps.has(cp._id)}
                            ref={el => fileInputRefs.current[cp._id] = el}
                            onChange={e => handlePhotoUpload(cp._id, e.target.files[0])}
                          />
                        </label>
                      )}
                      {cpLocked && (photos[cp._id] || []).length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          <Camera className="w-4 h-4" />
                          {photos[cp._id].length} photo{photos[cp._id].length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {(photos[cp._id] || []).length > 0 && (
                      <div className="px-4 pb-4 flex flex-wrap gap-2">
                        {photos[cp._id].map((url, i) => (
                          <div key={i} className="relative">
                            {isPdfUrl(url) ? (
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                className="w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-500/10 gap-1">
                                <FileText className="w-6 h-6 text-red-500" />
                                <span className="text-[9px] text-red-500 font-semibold">PDF</span>
                              </a>
                            ) : (
                              <img
                                src={url}
                                alt={`checkpoint-${i}`}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                              />
                            )}
                            {!submitted && !cpLocked && (
                              <button
                                type="button"
                                onClick={() => {
                                  userEditedRef.current = true
                                  setPhotos(prev => ({
                                    ...prev,
                                    [cp._id]: prev[cp._id].filter((_, idx) => idx !== i),
                                  }))
                                }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center
                                  rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-md"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )
        })}
      </div>

      {/* Result summary */}
      <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <ClipboardCheck className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="font-bold text-gray-700 dark:text-gray-200">Result — </span>
          All points OK → work approved to proceed. Any Not OK → record action, rectify, re-inspect BEFORE the next activity covers it.
        </p>
      </div>

      {/* ── Save / Submit footer ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Auto-save status */}
          <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            {isSaving ? (
              <><Save className="w-3.5 h-3.5 animate-pulse" /> Saving…</>
            ) : lastSaved ? (
              <><Clock className="w-3.5 h-3.5" /> Auto-saved {fmtTime(lastSaved)}</>
            ) : inspectionId ? (
              <><Clock className="w-3.5 h-3.5" /> Draft loaded</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Changes auto-save every 2 s</>
            )}
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={saveDraft}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition"
            >
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm shadow-sm transition"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
