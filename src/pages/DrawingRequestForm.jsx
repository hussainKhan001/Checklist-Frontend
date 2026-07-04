import { useState, useEffect } from 'react'
import { PenLine, CheckCircle2, Loader2, Copy, Check } from 'lucide-react'
import { submitDrawingRequest, getAllProjectsIncludingHidden, getSettingByKey } from '../services/api'
import CustomSelect from '../components/ui/CustomSelect'

const FALLBACK_DRAWING_TYPES = [
  'Architectural', 'Structural', 'MEP', 'Civil',
  'Interior', 'Landscape', 'Shop Drawing', 'As-Built',
]

const FALLBACK_DRI_OPTIONS = [
  'Ajeet', 'Rishabh', 'Ayush', 'Saurabh', 
  'Jeetendra', 'Deepti', 'Umesh', 'Sagar', 'Rajat'
]

const INITIAL = {
  project: '', drawingDescription: '', drawingType: '', dri: '', requestDate: new Date().toISOString(),
}

export default function DrawingRequestForm() {
  const [form, setForm]         = useState(INITIAL)
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(null) // ticketNo string on success
  const [copied, setCopied]     = useState(false)
  const [projects, setProjects] = useState([])
  const [driOptions, setDriOptions] = useState([])
  const [drawingTypes, setDrawingTypes] = useState([])

  useEffect(() => {
    getAllProjectsIncludingHidden().then(r => setProjects(r.data || [])).catch(() => {})
    getSettingByKey('DRI_OPTIONS').then(r => setDriOptions(r.data.data.value || FALLBACK_DRI_OPTIONS)).catch(() => setDriOptions(FALLBACK_DRI_OPTIONS))
    getSettingByKey('DRAWING_TYPES').then(r => setDrawingTypes(r.data.data.value || FALLBACK_DRAWING_TYPES)).catch(() => setDrawingTypes(FALLBACK_DRAWING_TYPES))
  }, [])

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.project)                  e.project            = 'Required'
    if (!form.drawingDescription.trim()) e.drawingDescription = 'Required'
    if (!form.drawingType)              e.drawingType        = 'Required'
    if (!form.dri)                      e.dri                = 'Required'
    if (!form.requestDate)              e.requestDate        = 'Required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await submitDrawingRequest(form)
      setSubmitted(res.data.data.ticketNo)
    } catch {
      setErrors({ _form: 'Submission failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const copyTicket = () => {
    navigator.clipboard.writeText(submitted).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Request Submitted</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Your drawing request has been recorded.</p>

          <div className="mb-5 px-5 py-4 bg-violet-50 dark:bg-violet-500/10 rounded-2xl border border-violet-200 dark:border-violet-500/30">
            <p className="text-xs text-violet-500 dark:text-violet-400 mb-1.5 tracking-wide uppercase font-medium">Ticket ID</p>
            <p className="text-3xl font-mono font-bold text-violet-700 dark:text-violet-200 tracking-wider mb-3">{submitted}</p>
            <button
              onClick={copyTicket}
              className="flex items-center gap-1.5 mx-auto text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy ticket ID'}
            </button>
          </div>

          <p className="text-gray-400 dark:text-gray-500 text-xs mb-5">
            Save this ticket ID for reference. AGM will assign the drawing and set priority.
          </p>

          <button
            onClick={() => { setForm(INITIAL); setSubmitted(null); setCopied(false) }}
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
          <CustomSelect
            value={form.project}
            onChange={v => set('project', v)}
            options={projects.map(p => ({ value: p.name, label: p.name }))}
            placeholder="Choose project"
            error={errors.project}
            accent="violet"
          />
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
          <CustomSelect
            value={form.drawingType}
            onChange={v => set('drawingType', v)}
            options={drawingTypes}
            placeholder="Choose type"
            error={errors.drawingType}
            accent="violet"
          />
        </Field>

        {/* DRI */}
        <Field label="DRI *" error={errors.dri}>
          <CustomSelect
            value={form.dri}
            onChange={v => set('dri', v)}
            options={driOptions}
            placeholder="Choose"
            error={errors.dri}
            accent="violet"
          />
        </Field>

        {/* Request Date */}
        <Field label="Request Date *" error={errors.requestDate}>
          <input
            type="text"
            value={new Date(form.requestDate).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
            className={inputCls(errors.requestDate) + " opacity-70 cursor-not-allowed"}
            disabled
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

