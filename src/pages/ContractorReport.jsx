import { useState } from 'react'
import { HardHat, CheckCircle2, Loader2 } from 'lucide-react'
import { submitContractorReport } from '../services/api'

const SHIFT_OPTIONS = ['Day', 'Night', '24-Hour']

const INITIAL = {
  email: '',
  contractorName: '',
  location: '',
  date: '',
  workType: '',
  shiftType: '',
  workerCount: '',
}

export default function ContractorReport() {
  const [form, setForm]       = useState(INITIAL)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.contractorName.trim()) e.contractorName = 'Required'
    if (!form.location.trim())       e.location       = 'Required'
    if (!form.date)                  e.date           = 'Required'
    if (!form.workType.trim())       e.workType       = 'Required'
    if (!form.shiftType)             e.shiftType      = 'Required'
    if (!form.workerCount || Number(form.workerCount) < 1) e.workerCount = 'Must be ≥ 1'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await submitContractorReport({ ...form, workerCount: Number(form.workerCount) })
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
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Report Submitted</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Your daily labor report has been recorded successfully.
          </p>
          <button
            onClick={() => { setForm(INITIAL); setSubmitted(false) }}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
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
        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <HardHat className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Labour Report</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Submit your daily labour details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <Field label="Email (optional)" error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="your@email.com"
            className={inputCls(errors.email)}
          />
        </Field>

        {/* Contractor Name */}
        <Field label="Contractor Name *" error={errors.contractorName}>
          <input
            type="text"
            value={form.contractorName}
            onChange={e => set('contractorName', e.target.value)}
            placeholder="Enter contractor name"
            className={inputCls(errors.contractorName)}
          />
        </Field>

        {/* Location */}
        <Field label="Location *" error={errors.location}>
          <input
            type="text"
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="Site location / area"
            className={inputCls(errors.location)}
          />
        </Field>

        {/* Date */}
        <Field label="Date *" error={errors.date}>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={inputCls(errors.date)}
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

        {/* Shift Type */}
        <Field label="Shift Type *" error={errors.shiftType}>
          <div className="flex gap-2">
            {SHIFT_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set('shiftType', s)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.shiftType === s
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {errors.shiftType && <p className="mt-1 text-xs text-red-500">{errors.shiftType}</p>}
        </Field>

        {/* Worker Count */}
        <Field label="Worker Count *" error={errors.workerCount}>
          <input
            type="number"
            min={1}
            value={form.workerCount}
            onChange={e => set('workerCount', e.target.value)}
            placeholder="Number of workers"
            className={inputCls(errors.workerCount)}
          />
        </Field>

        {errors._form && (
          <p className="text-sm text-red-500 dark:text-red-400">{errors._form}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Report'}
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
    err
      ? 'border-red-400 focus:border-red-500'
      : 'border-gray-200 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-500'
  }`
}
