import { useState, useEffect, useRef } from 'react'
import { HardHat, CheckCircle2, Loader2, ChevronDown, Search, X } from 'lucide-react'
import { submitContractorReport, getContractors, getWorkTypes, getAllProjectsIncludingHidden } from '../services/api'

const SHIFT_OPTIONS = ['Day', 'Night', '24-Hour']

const freshDate = () => new Date().toISOString()

const INITIAL = {
  email: '',
  contractorName: '',
  location: '',
  workType: '',
  shiftType: '',
  workerCount: '',
}

export default function ContractorReport() {
  const [form, setForm]         = useState({ ...INITIAL, date: freshDate() })
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // contractor combobox
  const [contractors, setContractors]   = useState([])
  const [query, setQuery]               = useState('')
  const [open, setOpen]                 = useState(false)
  const [selectedContractor, setSelectedContractor] = useState(null)
  const comboRef = useRef(null)

  // work type dropdown
  const [workTypes, setWorkTypes] = useState([])
  const [wtOpen, setWtOpen]       = useState(false)
  const wtRef = useRef(null)

  // projects for location dropdown
  const [projects, setProjects] = useState([])
  const [locOpen, setLocOpen]   = useState(false)
  const locRef = useRef(null)

  useEffect(() => {
    const ctrl = new AbortController()
    getContractors(ctrl.signal).then(r => setContractors(r.data.data || [])).catch(() => {})
    getWorkTypes(ctrl.signal).then(r => setWorkTypes(r.data.data || [])).catch(() => {})
    getAllProjectsIncludingHidden().then(r => setProjects(r.data || [])).catch(() => {})
    return () => ctrl.abort()
  }, [])

  // close contractor dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (comboRef.current && !comboRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // close work type dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (wtRef.current && !wtRef.current.contains(e.target)) setWtOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // close location dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (locRef.current && !locRef.current.contains(e.target)) setLocOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filteredContractors = query.trim()
    ? contractors.filter(v =>
        v.companyName.toLowerCase().includes(query.toLowerCase()) ||
        v.vendorCode.toLowerCase().includes(query.toLowerCase()) ||
        v.ownerName.toLowerCase().includes(query.toLowerCase())
      )
    : contractors

  const selectContractor = (v) => {
    setSelectedContractor(v)
    setForm(prev => ({ ...prev, contractorName: v.companyName }))
    setErrors(prev => ({ ...prev, contractorName: '' }))
    setQuery('')
    setOpen(false)
  }

  const clearContractor = () => {
    setSelectedContractor(null)
    setForm(prev => ({ ...prev, contractorName: '' }))
    setQuery('')
  }

  const selectWorkType = (name) => {
    setForm(prev => ({ ...prev, workType: name }))
    setErrors(prev => ({ ...prev, workType: '' }))
    setWtOpen(false)
  }

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.contractorName.trim()) e.contractorName = 'Please select a contractor'
    if (!form.location.trim())       e.location       = 'Required'
    if (!form.workType)              e.workType       = 'Please select a work type'
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
      await submitContractorReport({ ...form, date: new Date().toISOString(), workerCount: Number(form.workerCount) })
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
            onClick={() => {
              setForm({ ...INITIAL, date: freshDate() })
              setSelectedContractor(null)
              setQuery('')
              setSubmitted(false)
            }}
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

        {/* Contractor Name — searchable combobox */}
        <Field label="Contractor Name *" error={errors.contractorName}>
          <div ref={comboRef} className="relative">
            {selectedContractor ? (
              <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 ${errors.contractorName ? 'border-red-400' : 'border-orange-400 dark:border-orange-500'}`}>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-white">{selectedContractor.companyName}</span>
                  <span className="ml-2 text-[11px] text-gray-400">{selectedContractor.vendorCode}</span>
                </div>
                <button type="button" onClick={clearContractor} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 cursor-text transition-colors ${
                  errors.contractorName ? 'border-red-400 focus-within:border-red-500' : 'border-gray-200 dark:border-gray-700 focus-within:border-orange-400 dark:focus-within:border-orange-500'
                }`}
                onClick={() => setOpen(true)}
              >
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setOpen(true) }}
                  onFocus={() => setOpen(true)}
                  placeholder="Search contractor…"
                  className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </div>
            )}

            {open && !selectedContractor && (
              <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  {filteredContractors.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">No contractors found</div>
                  ) : filteredContractors.map(v => (
                    <button
                      key={v._id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectContractor(v) }}
                      className="w-full text-left px-4 py-2.5 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors flex items-center gap-3 group"
                    >
                      <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded flex-shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {v.vendorCode}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{v.companyName}</div>
                        {v.ownerName !== v.companyName && (
                          <div className="text-[11px] text-gray-400 truncate">{v.ownerName}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Field>

        {/* Location */}
        <Field label="Location *" error={errors.location}>
          <div ref={locRef} className="relative">
            <button
              type="button"
              onClick={() => setLocOpen(o => !o)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 transition-colors text-left ${
                errors.location
                  ? 'border-red-400'
                  : form.location
                    ? 'border-orange-400 dark:border-orange-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className={form.location ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'}>
                {form.location || 'Choose location…'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${locOpen ? 'rotate-180' : ''}`} />
            </button>

            {locOpen && (
              <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto py-1">
                  {projects.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">Loading…</div>
                  ) : projects.map(p => (
                    <button
                      key={p._id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); set('location', p.name); setLocOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                        form.location === p.name
                          ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      {p.name}
                      {form.location === p.name && <Check className="w-4 h-4 text-orange-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Field>

        {/* Date & Time — auto-set, read-only */}
        <Field label="Date & Time">
          <div className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-sm text-gray-500 dark:text-gray-400 select-none cursor-not-allowed">
            {new Date(form.date).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true,
            })}
          </div>
        </Field>

        {/* Work Type — dropdown from DB */}
        <Field label="Work Type *" error={errors.workType}>
          <div ref={wtRef} className="relative">
            <button
              type="button"
              onClick={() => setWtOpen(o => !o)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 transition-colors text-left ${
                errors.workType
                  ? 'border-red-400'
                  : form.workType
                    ? 'border-orange-400 dark:border-orange-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className={form.workType ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'}>
                {form.workType || 'Select work type…'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${wtOpen ? 'rotate-180' : ''}`} />
            </button>

            {wtOpen && (
              <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto py-1">
                  {workTypes.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">Loading…</div>
                  ) : workTypes.map(wt => (
                    <button
                      key={wt._id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectWorkType(wt.name) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between group ${
                        form.workType === wt.name
                          ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      {wt.name}
                      {form.workType === wt.name && <Check className="w-4 h-4 text-orange-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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

function Check({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function inputCls(err) {
  return `w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors ${
    err
      ? 'border-red-400 focus:border-red-500'
      : 'border-gray-200 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-500'
  }`
}
