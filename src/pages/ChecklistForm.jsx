import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  getProject, getFloor, getLocations, getTrade, getCheckPoints,
  createInspection, submitInspection, uploadPhoto,
} from '../api'
import {
  ArrowLeft, ChevronRight, AlertTriangle, Camera, CheckCircle2,
  XCircle, MapPin, Calendar, Building2, User, ClipboardCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition'

export default function ChecklistForm() {
  const { projectId, floorId, locationId, tradeId } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [floor, setFloor] = useState(null)
  const [location, setLocation] = useState(null)
  const [trade, setTrade] = useState(null)
  const [checkPoints, setCheckPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [contractorAgency, setContractorAgency] = useState('')
  const [checkedBy, setCheckedBy] = useState('')
  const [results, setResults] = useState({})
  const [photos, setPhotos] = useState({})
  const [signatures, setSignatures] = useState({ siteEngineer: '', contractorRep: '', projectManager: '' })

  const fileInputRefs = useRef({})

  useEffect(() => {
    Promise.all([
      getProject(projectId),
      getFloor(floorId),
      getLocations(floorId),
      getTrade(tradeId),
      getCheckPoints(tradeId),
    ])
      .then(([pRes, fRes, lRes, tRes, cpRes]) => {
        setProject(pRes.data)
        setFloor(fRes.data)
        const loc = lRes.data.find(l => l._id === locationId)
        setLocation(loc || null)
        setTrade(tRes.data)
        setCheckPoints(cpRes.data)
        const initial = {}
        cpRes.data.forEach(cp => { initial[cp._id] = 'PENDING' })
        setResults(initial)
      })
      .catch(() => setError('Failed to load checklist.'))
      .finally(() => setLoading(false))
  }, [projectId, floorId, locationId, tradeId])

  const setResult = (cpId, value) =>
    setResults(prev => ({ ...prev, [cpId]: value }))

  const handlePhotoUpload = async (cpId, file) => {
    if (!file) return
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await uploadPhoto(fd)
      setPhotos(prev => ({ ...prev, [cpId]: [...(prev[cpId] || []), res.data.url] }))
    } catch {
      toast.error('Photo upload failed.')
    }
  }

  const handleSubmit = async () => {
    if (!signatures.siteEngineer || !signatures.contractorRep || !signatures.projectManager) {
      toast.error('All three signatures are required before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        projectId, floorId, locationId, tradeId,
        contractorAgency, checkedBy,
        results: checkPoints.map(cp => ({
          checkPointId: cp._id,
          result: results[cp._id] || 'PENDING',
          photos: photos[cp._id] || [],
        })),
        signatures,
      }
      const { data: inspection } = await createInspection(payload)
      await submitInspection(inspection._id, { signatures })
      setSubmitted(true)
    } catch {
      toast.error('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

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

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const locationName = location?.name || locationId
  const okCount = Object.values(results).filter(r => r === 'OK').length
  const notOkCount = Object.values(results).filter(r => r === 'NOT_OK').length
  const pendingCount = checkPoints.length - okCount - notOkCount

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-16">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-400 flex-wrap">
        <Link to="/" className="hover:text-orange-500 transition-colors font-medium truncate max-w-[100px]">
          {project?.name || '…'}
        </Link>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <Link to={`/project/${projectId}/floors`} className="hover:text-orange-500 transition-colors font-medium">
          {floor?.label || '…'}
        </Link>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <Link to={`/project/${projectId}/floor/${floorId}/locations`} className="hover:text-orange-500 transition-colors font-medium">
          {locationName}
        </Link>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <span className="text-gray-600 dark:text-gray-300 font-medium truncate max-w-[120px]">{trade?.name || '…'}</span>
      </nav>

      {/* Back + title */}
      <div>
        <button
          onClick={() => navigate(`/project/${projectId}/floor/${floorId}/location/${locationId}/trades`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-orange-500 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Change trade
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
          {trade?.name}
        </h1>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Why it matters */}
      {trade?.whyItMatters && (
        <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
            <span className="font-bold">Why this matters: </span>
            {trade.whyItMatters}
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
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Date of Check</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{today}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Contractor / Agency
              </label>
              <input
                className={inputCls}
                placeholder="Agency name"
                value={contractorAgency}
                onChange={e => setContractorAgency(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Checked By (Site Engineer)
              </label>
              <input
                className={inputCls}
                placeholder="Full name"
                value={checkedBy}
                onChange={e => setCheckedBy(e.target.value)}
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
              {okCount + notOkCount} / {checkPoints.length} reviewed
            </span>
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
                cpResult === 'OK'
                  ? 'border-emerald-300 dark:border-emerald-500/40'
                  : cpResult === 'NOT_OK'
                  ? 'border-red-300 dark:border-red-500/40'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Card header */}
              <div className={`flex items-start gap-3 p-4 ${
                cpResult === 'OK' ? 'bg-emerald-50/60 dark:bg-emerald-500/5' :
                cpResult === 'NOT_OK' ? 'bg-red-50/60 dark:bg-red-500/5' : ''
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                  cpResult === 'OK' ? 'bg-emerald-500 text-white' :
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

              {/* Standard & how to check */}
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

              {/* Actions */}
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
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => fileInputRefs.current[cp._id] = el}
                    onChange={e => handlePhotoUpload(cp._id, e.target.files[0])}
                  />
                </label>
              </div>

              {/* Photo thumbnails */}
              {(photos[cp._id] || []).length > 0 && (
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {photos[cp._id].map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`checkpoint-${i}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Result box */}
      <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <ClipboardCheck className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="font-bold text-gray-700 dark:text-gray-200">Result — </span>
          All points OK → work approved to proceed. Any Not OK → record action, rectify, re-inspect BEFORE the next activity covers it.
        </p>
      </div>

      {/* Signatures */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 text-center">
            Three signatures make this sheet valid — an unsigned checklist is a non-existent checklist
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: 'siteEngineer', label: 'Site Engineer', note: 'I physically stood at the work and verified every point.' },
            { key: 'contractorRep', label: 'Contractor Representative', note: 'I accept the findings and the corrective actions recorded.' },
            { key: 'projectManager', label: 'Project Manager', note: 'I verified the sheet, photos, and any Not OK actions.' },
          ].map(({ key, label, note }) => (
            <div
              key={key}
              className={`bg-white dark:bg-gray-800 border rounded-xl p-4 shadow-sm transition-all ${
                signatures[key]
                  ? 'border-emerald-300 dark:border-emerald-500/40'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 leading-tight">{label}</div>
              <input
                className={inputCls}
                placeholder="Full name"
                value={signatures[key]}
                onChange={e => setSignatures(s => ({ ...s, [key]: e.target.value }))}
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed italic">{note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
      >
        {submitting ? 'Submitting…' : 'Submit Checklist'}
      </button>
    </div>
  )
}
