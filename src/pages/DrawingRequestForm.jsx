import { useState, useEffect } from 'react'
import { PenLine, CheckCircle2, Loader2, ChevronDown } from 'lucide-react'
import { submitDrawingRequest, getProjects } from '../services/api'

const DRAWING_TYPES = [
  'Architectural', 'Structural', 'MEP', 'Civil',
  'Interior', 'Landscape', 'Shop Drawing', 'As-Built',
]

const DRI_OPTIONS = [
  'Architect', 'Structural Engineer', 'MEP Engineer',
  'Civil Engineer', 'Interior Designer', 'Contractor',
]

const INITIAL = {
  project: '', drawingDescription: '', drawingType: '', dri: '', requestDate: '',
}

export default function DrawingRequestForm() {
  const [form, setForm]         = useState(INITIAL)
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [projects, setProjects] = useState([])

  useEffect(() => {
    getProjects().then(r => setProjects(r.data || [])).catch(() => {})
  }, [])

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.project)              e.project            = 'Required'
    if (!form.drawingDescription.trim()) e.drawingDescription = 'Required'
    if (!form.drawingType)          e.drawingType        = 'Required'
    if (!form.dri)                  e.dri                = 'Required'
    if (!form.requestDate)          e.requestDate        = 'Required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await submitDrawingRequest(form)
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
          <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Request Submitted</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Your drawing request has been recorded and will be processed.
          </p>
          <button
            onClick={() => { setForm(INITIAL); setSubmitted(false) }}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
          <PenLine className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Drawing Request Form</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Submit a new drawing request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project */}
        <Field label="Project *" error={errors.project}>
          <div className="relative">
            <select
              value={form.project}
              onChange={e => set('project', e.target.value)}
              className={selectCls(errors.project)}
            >
              <option value="">Choose project</option>
              {projects.map(p => (
                <option key={p._id} value={p.name}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </Field>

        {/* Drawing Description */}
        <Field label="Drawing Description *" error={errors.drawingDescription}>
          <textarea
            rows={3}
            value={form.drawingDescription}
            onChange={e => set('drawingDescription', e.target.value)}
            placeholder="Describe the drawing required"
            className={inputCls(errors.drawingDescription) + ' resize-none'}
          />
        </Field>

        {/* Drawing Type */}
        <Field label="Drawing Type *" error={errors.drawingType}>
          <div className="relative">
            <select
              value={form.drawingType}
              onChange={e => set('drawingType', e.target.value)}
              className={selectCls(errors.drawingType)}
            >
              <option value="">Choose type</option>
              {DRAWING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </Field>

        {/* DRI */}
        <Field label="DRI (Responsible Individual) *" error={errors.dri}>
          <div className="relative">
            <select
              value={form.dri}
              onChange={e => set('dri', e.target.value)}
              className={selectCls(errors.dri)}
            >
              <option value="">Choose DRI</option>
              {DRI_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </Field>

        {/* Request Date */}
        <Field label="Request Date *" error={errors.requestDate}>
          <input
            type="date"
            value={form.requestDate}
            onChange={e => set('requestDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={inputCls(errors.requestDate)}
          />
        </Field>

        {errors._form && (
          <p className="text-sm text-red-500 dark:text-red-400">{errors._form}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Request'}
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
    err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-violet-500 dark:focus:border-violet-500'
  }`
}

function selectCls(err) {
  return `w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none appearance-none transition-colors ${
    err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-violet-500 dark:focus:border-violet-500'
  }`
}
