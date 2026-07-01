import { useState, useEffect, useRef } from 'react'
import { ClipboardList, CheckCircle2, Loader2, Camera, X, ChevronDown } from 'lucide-react'
import { submitDailySiteReport, uploadPhoto, getProjects } from '../services/api'

const DRI_OPTIONS = [
  'Site Manager', 'Architect', 'Structural Engineer',
  'MEP Engineer', 'Civil Engineer', 'Interior Designer', 'Contractor',
]

const INITIAL = { dri: '', project: '', projectDescription: '', workType: '' }

function fmtDateTime(d) {
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function DailySiteReportForm() {
  const [form, setForm]           = useState(INITIAL)
  const [errors, setErrors]       = useState({})
  const [loading, setLoading]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [projects, setProjects]   = useState([])
  const [photos, setPhotos]       = useState([])       // [{ url, uploading, error }]
  const [now, setNow]             = useState(new Date())
  const fileRef                   = useRef()

  useEffect(() => {
    getProjects().then(r => setProjects(r.data || [])).catch(() => {})
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleFiles = async (files) => {
    const list = Array.from(files)
    const slots = list.map(() => ({ url: '', uploading: true, error: false }))
    setPhotos(prev => [...prev, ...slots])
    const base = photos.length

    await Promise.all(list.map(async (file, i) => {
      try {
        const fd = new FormData()
        fd.append('photo', file)
        const res = await uploadPhoto(fd)
        const url = res.data?.url || res.data?.secure_url || ''
        setPhotos(prev => {
          const next = [...prev]
          next[base + i] = { url, uploading: false, error: false }
          return next
        })
      } catch {
        setPhotos(prev => {
          const next = [...prev]
          next[base + i] = { url: '', uploading: false, error: true }
          return next
        })
      }
    }))
  }

  const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx))

  const validate = () => {
    const e = {}
    if (!form.dri)                       e.dri                = 'Required'
    if (!form.project)                   e.project            = 'Required'
    if (!form.projectDescription.trim()) e.projectDescription = 'Required'
    if (!form.workType.trim())           e.workType           = 'Required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (photos.some(p => p.uploading)) return
    setLoading(true)
    try {
      const photoUrls = photos.filter(p => p.url).map(p => p.url)
      await submitDailySiteReport({ ...form, photos: photoUrls })
      setSubmitted(true)
    } catch {
      setErrors({ _form: 'Submission failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Report Submitted</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Your daily site report has been recorded successfully.
          </p>
          <button
            onClick={() => { setForm(INITIAL); setPhotos([]); setSubmitted(false) }}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  const stillUploading = photos.some(p => p.uploading)

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Site Report</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Submit today's site activity report</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* DRI */}
        <Field label="DRI (Responsible Individual) *" error={errors.dri}>
          <div className="relative">
            <select value={form.dri} onChange={e => set('dri', e.target.value)} className={selectCls(errors.dri)}>
              <option value="">Choose DRI</option>
              {DRI_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </Field>

        {/* Project */}
        <Field label="Project *" error={errors.project}>
          <div className="relative">
            <select value={form.project} onChange={e => set('project', e.target.value)} className={selectCls(errors.project)}>
              <option value="">Choose project</option>
              {projects.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </Field>

        {/* Project Description */}
        <Field label="Project Description *" error={errors.projectDescription}>
          <textarea
            rows={3}
            value={form.projectDescription}
            onChange={e => set('projectDescription', e.target.value)}
            placeholder="Describe today's work and site status"
            className={inputCls(errors.projectDescription) + ' resize-none'}
          />
        </Field>

        {/* Work Type */}
        <Field label="Work Type *" error={errors.workType}>
          <input
            type="text"
            value={form.workType}
            onChange={e => set('workType', e.target.value)}
            placeholder="e.g. Masonry, Plumbing, Electrical"
            className={inputCls(errors.workType)}
          />
        </Field>

        {/* Date & Time — disabled, auto */}
        <Field label="Date & Time">
          <input
            type="text"
            value={fmtDateTime(now)}
            disabled
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-400">Auto-recorded at time of submission</p>
        </Field>

        {/* Photos */}
        <Field label="Photos (optional)">
          <div className="space-y-3">
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                    {p.uploading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    ) : p.error ? (
                      <div className="w-full h-full flex items-center justify-center text-red-400 text-xs">Failed</div>
                    ) : (
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
            >
              <Camera className="w-4 h-4" />
              {photos.length ? 'Add more photos' : 'Tap to add photos'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
            />
          </div>
        </Field>

        {errors._form && <p className="text-sm text-red-500 dark:text-red-400">{errors._form}</p>}

        <button
          type="submit"
          disabled={loading || stillUploading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
           : stillUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading photos…</>
           : 'Submit Report'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputCls(err) {
  return `w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors ${
    err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500'
  }`
}

function selectCls(err) {
  return `w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none appearance-none transition-colors ${
    err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500'
  }`
}
