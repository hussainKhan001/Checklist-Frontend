import { useEffect, useState, useMemo, Fragment } from 'react'
import AdminLayout from '../../components/AdminLayout'
import Dropdown from '../../components/ui/Dropdown'
import DatePicker from '../../components/ui/DatePicker'
import {
  adminGetProjects, adminGetFloors, adminGetTrades,
  adminGetProgressSummary, adminGetProgressPlans, adminUpsertProgressPlan, adminDeleteProgressPlan,
  adminGetMilestones, adminCreateMilestone, adminUpdateMilestone, adminDeleteMilestone,
} from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import {
  TrendingUp, Flag, Layers, ChevronDown, ChevronRight,
  Plus, Pencil, Trash2, CheckCircle2, Clock, AlertTriangle,
  CalendarDays, BarChart3, X, Save, Circle,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const toISO   = (d) => d ? new Date(d).toISOString().slice(0, 10) : ''

const PLAN_STATUS = {
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  ON_TRACK:  { label: 'On Track',  cls: 'bg-blue-100   dark:bg-blue-500/20   text-blue-700   dark:text-blue-400',   icon: TrendingUp },
  AT_RISK:   { label: 'At Risk',   cls: 'bg-amber-100  dark:bg-amber-500/20  text-amber-700  dark:text-amber-400',  icon: AlertTriangle },
  DELAYED:   { label: 'Delayed',   cls: 'bg-red-100    dark:bg-red-500/20    text-red-700    dark:text-red-400',    icon: AlertTriangle },
}

const PRIORITY = {
  HIGH:   { label: 'High',   cls: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
  MEDIUM: { label: 'Medium', cls: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' },
  LOW:    { label: 'Low',    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
}

function PlanStatusBadge({ status }) {
  if (!status) return null
  const cfg = PLAN_STATUS[status]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

function ProgressBar({ pct, size = 'md', color }) {
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2'
  const barColor = color || (pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-400')
  return (
    <div className={`w-full ${h} bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden`}>
      <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

function RingProgress({ pct, size = 80, stroke = 8 }) {
  const r   = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  const color = pct >= 100 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#f87171'
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-100 dark:text-gray-700" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  )
}

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-4 ${color}`}>
      <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-semibold opacity-80 truncate">{label}</div>
        {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ── Milestone form modal ───────────────────────────────────────────────────────
function MilestoneModal({ open, onClose, onSave, initial, floors, trades }) {
  const [form, setForm] = useState({ title: '', description: '', targetDate: '', priority: 'MEDIUM', floorId: '', tradeId: '' })

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            title:       initial.title       || '',
            description: initial.description || '',
            targetDate:  toISO(initial.targetDate),
            priority:    initial.priority    || 'MEDIUM',
            floorId:     initial.floorId?._id || initial.floorId || '',
            tradeId:     initial.tradeId?._id || initial.tradeId || '',
          }
        : { title: '', description: '', targetDate: '', priority: 'MEDIUM', floorId: '', tradeId: '' }
      )
    }
  }, [open, initial])

  if (!open) return null
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">{initial ? 'Edit Milestone' : 'Add Milestone'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
              placeholder="e.g. 1st Floor Brick Work Complete" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors resize-none"
              placeholder="Optional details…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Target Date *</label>
              <DatePicker value={form.targetDate} onChange={v => set('targetDate', v)} placeholder="Pick date" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Priority</label>
              <Dropdown value={form.priority} onChange={v => set('priority', v || 'MEDIUM')}
                options={[{ id: 'HIGH', name: 'High' }, { id: 'MEDIUM', name: 'Medium' }, { id: 'LOW', name: 'Low' }]}
                placeholder="Priority"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Floor (optional)</label>
              <Dropdown value={form.floorId} onChange={v => set('floorId', v)} options={floors} placeholder="All floors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Trade (optional)</label>
              <Dropdown value={form.tradeId} onChange={v => set('tradeId', v)} options={trades} placeholder="All trades" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button
            onClick={() => { if (form.title && form.targetDate) onSave(form) }}
            disabled={!form.title || !form.targetDate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Plan edit inline cell ──────────────────────────────────────────────────────
function PlanCell({ plan, floorId, tradeId, projectId, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [start, setStart]     = useState(toISO(plan?.plannedStart))
  const [end, setEnd]         = useState(toISO(plan?.plannedEnd))
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    if (!start && !end) return setEditing(false)
    setSaving(true)
    try {
      const r = await adminUpsertProgressPlan({ projectId, floorId, tradeId, plannedStart: start || null, plannedEnd: end || null })
      onSaved(r.data)
      setEditing(false)
    } catch { toast.error('Failed to save plan') }
    setSaving(false)
  }

  const clear = async () => {
    if (!plan?._id) return setEditing(false)
    setSaving(true)
    try {
      await adminDeleteProgressPlan(plan._id)
      onSaved(null)
      setStart(''); setEnd('')
      setEditing(false)
    } catch { toast.error('Failed to clear plan') }
    setSaving(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-left w-full group"
      >
        {plan?.plannedEnd ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-orange-500 transition-colors">
            {fmtDate(plan.plannedStart)} → {fmtDate(plan.plannedEnd)}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600 group-hover:text-orange-400 transition-colors italic">Set dates…</span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1 min-w-[220px]" onClick={e => e.stopPropagation()}>
      <DatePicker value={start} onChange={setStart} placeholder="Start" max={end || undefined} />
      <DatePicker value={end}   onChange={setEnd}   placeholder="End"   min={start || undefined} />
      <div className="flex gap-1 mt-1">
        <button onClick={save} disabled={saving} className="flex-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50">Save</button>
        {plan?._id && <button onClick={clear} disabled={saving} className="px-2 py-1 text-[11px] rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">Clear</button>}
        <button onClick={() => setEditing(false)} className="px-2 py-1 text-[11px] rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 transition-colors">×</button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SiteProgress() {
  const [projects,     setProjects]     = useState([])
  const [projectId,    setProjectId]    = useState('')
  const [summary,      setSummary]      = useState(null)
  const [plans,        setPlans]        = useState([])
  const [milestones,   setMilestones]   = useState([])
  const [floorOpts,    setFloorOpts]    = useState([])
  const [tradeOpts,    setTradeOpts]    = useState([])
  const [loading,      setLoading]      = useState(false)
  const [tab,          setTab]          = useState('overview')
  const [expanded,     setExpanded]     = useState({})
  const [msModal,      setMsModal]      = useState(null) // null | {} | existing milestone
  const { hasPermission } = useAuth()
  const confirm = useConfirm()
  const canManage = hasPermission('manage_inspections')

  // Load projects on mount
  useEffect(() => {
    adminGetProjects().then(r => {
      const list = r.data.filter(p => !p.isHidden)
      setProjects(list)
      if (list.length) setProjectId(list[0]._id)
    })
  }, [])

  // Load summary + plans + milestones when project changes
  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setSummary(null)
    Promise.all([
      adminGetProgressSummary(projectId),
      adminGetProgressPlans(projectId),
      adminGetMilestones(projectId),
      adminGetFloors(projectId),
      adminGetTrades(),
    ]).then(([sumRes, planRes, msRes, floorRes, tradeRes]) => {
      setSummary(sumRes.data)
      setPlans(planRes.data)
      setMilestones(msRes.data)
      setFloorOpts(floorRes.data.map(f => ({ id: f._id, name: f.label })))
      setTradeOpts(tradeRes.data.filter(t => !t.isHidden).map(t => ({ id: t._id, name: t.name })))
    }).finally(() => setLoading(false))
  }, [projectId])

  const planMap = useMemo(() => {
    const m = {}
    plans.forEach(p => { m[`${p.floorId?._id || p.floorId}:${p.tradeId?._id || p.tradeId}`] = p })
    return m
  }, [plans])

  const handlePlanSaved = (floorId, tradeId, plan) => {
    const key = `${floorId}:${tradeId}`
    setPlans(prev => {
      const without = prev.filter(p => `${p.floorId?._id || p.floorId}:${p.tradeId?._id || p.tradeId}` !== key)
      return plan ? [...without, { ...plan, floorId: { _id: floorId }, tradeId: { _id: tradeId } }] : without
    })
  }

  // Milestone CRUD
  const saveMilestone = async (form) => {
    try {
      if (msModal?._id) {
        const r = await adminUpdateMilestone(msModal._id, { ...form, projectId })
        setMilestones(prev => prev.map(m => m._id === msModal._id ? r.data : m))
        toast.success('Milestone updated')
      } else {
        const r = await adminCreateMilestone({ ...form, projectId })
        setMilestones(prev => [...prev, r.data].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate)))
        toast.success('Milestone added')
      }
      setMsModal(null)
    } catch { toast.error('Failed to save milestone') }
  }

  const toggleComplete = async (m) => {
    try {
      const r = await adminUpdateMilestone(m._id, {
        ...m,
        floorId:     m.floorId?._id || m.floorId,
        tradeId:     m.tradeId?._id || m.tradeId,
        completedAt: m.completedAt ? null : new Date().toISOString(),
      })
      setMilestones(prev => prev.map(x => x._id === m._id ? r.data : x))
    } catch { toast.error('Failed to update') }
  }

  const deleteMilestone = async (id) => {
    const ok = await confirm('Delete this milestone?', 'This cannot be undone.')
    if (!ok) return
    await adminDeleteMilestone(id)
    setMilestones(prev => prev.filter(m => m._id !== id))
    toast.success('Milestone deleted')
  }

  const toggleExpanded = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const projectOpts = projects.map(p => ({ id: p._id, name: p.name }))
  const ov = summary?.overview || {}

  // Milestone grouping
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { overdue, upcoming, done } = useMemo(() => {
    const overdue = [], upcoming = [], done = []
    milestones.forEach(m => {
      if (m.completedAt) done.push(m)
      else if (new Date(m.targetDate) < today) overdue.push(m)
      else upcoming.push(m)
    })
    return { overdue, upcoming, done }
  }, [milestones])

  const TABS = [
    { id: 'overview',  label: 'Overview',  icon: BarChart3 },
    { id: 'byfloor',   label: 'By Floor',  icon: Layers },
    { id: 'milestones',label: 'Milestones',icon: Flag },
  ]

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Site Progress</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track completion across floors, rooms and trades</p>
          </div>
          <div className="w-56 flex-shrink-0">
            <Dropdown value={projectId} onChange={v => v && setProjectId(v)} options={projectOpts} placeholder="Select project" />
          </div>
        </div>

        {/* ── Overview cards ── */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Slots"  value={ov.totalSlots}  icon={BarChart3}     color="bg-gray-50   dark:bg-gray-800   border-gray-200  dark:border-gray-700  text-gray-700   dark:text-gray-200" />
            <StatCard label="Submitted"    value={ov.submitted}   icon={CheckCircle2}  color="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" sub={`${ov.pct}% done`} />
            <StatCard label="In Progress"  value={ov.draft}       icon={Clock}         color="bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-800  text-amber-700   dark:text-amber-400" />
            <StatCard label="Not Started"  value={ov.notStarted}  icon={Circle}        color="bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800    text-red-700     dark:text-red-400" />
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.id
                    ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />{t.label}
              </button>
            )
          })}
        </div>

        {loading && (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>
        )}

        {/* ── Overview tab ── */}
        {!loading && tab === 'overview' && summary && (
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Overall ring */}
            <div className="lg:col-span-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <RingProgress pct={ov.pct} size={120} stroke={12} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">{ov.pct}%</span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Complete</span>
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{projects.find(p => p._id === projectId)?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{ov.submitted} of {ov.totalSlots} inspections submitted</p>
              </div>
            </div>

            {/* Trade progress */}
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Progress by Trade</h3>
              {summary.trades.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No trade data yet.</p>
              ) : (
                <div className="space-y-3">
                  {summary.trades.map(t => (
                    <div key={t.tradeId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate flex-1 mr-2">{t.tradeName}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-gray-400">{t.submitted}/{t.total}</span>
                          <span className={`text-xs font-bold ${t.pct >= 100 ? 'text-emerald-500' : t.pct >= 60 ? 'text-blue-500' : t.pct >= 30 ? 'text-amber-500' : 'text-red-400'}`}>{t.pct}%</span>
                        </div>
                      </div>
                      <ProgressBar pct={t.pct} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming milestones */}
            <div className="lg:col-span-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Upcoming Milestones</h3>
                {canManage && (
                  <button onClick={() => setMsModal({})} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                )}
              </div>
              {overdue.length === 0 && upcoming.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No upcoming milestones. Add one to track key dates.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...overdue, ...upcoming].slice(0, 6).map(m => (
                    <MilestoneCard key={m._id} m={m} canManage={canManage} onEdit={() => setMsModal(m)} onDelete={() => deleteMilestone(m._id)} onToggle={() => toggleComplete(m)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── By Floor tab ── */}
        {!loading && tab === 'byfloor' && summary && (
          <div className="space-y-3">
            {summary.floors.map(floor => (
              <div key={floor.floorId} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                {/* Floor header */}
                <button
                  onClick={() => toggleExpanded(floor.floorId)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    {expanded[floor.floorId] ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <Layers className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{floor.name}</span>
                    <span className="text-xs text-gray-400">{floor.totalRooms} rooms · {floor.trades.length} trades</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-32 hidden sm:block">
                      <ProgressBar pct={floor.pct} size="sm" />
                    </div>
                    <span className={`text-lg font-black ${floor.pct >= 100 ? 'text-emerald-500' : floor.pct >= 60 ? 'text-blue-500' : floor.pct >= 30 ? 'text-amber-500' : 'text-red-400'}`}>
                      {floor.pct}%
                    </span>
                  </div>
                </button>

                {/* Trade breakdown table */}
                {expanded[floor.floorId] && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-gray-50 dark:bg-gray-800/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <span className="col-span-3">Trade</span>
                      <span className="col-span-2 text-center">Submitted</span>
                      <span className="col-span-1 text-center">Draft</span>
                      <span className="col-span-1 text-center">Pending</span>
                      <span className="col-span-2">Progress</span>
                      <span className="col-span-3">Planned Dates</span>
                    </div>
                    {floor.trades.map(trade => {
                      const plan = planMap[`${floor.floorId}:${trade.tradeId}`]
                      return (
                        <div key={trade.tradeId} className="grid grid-cols-12 gap-2 items-center px-5 py-3 border-t border-gray-50 dark:border-gray-700/40 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                          <div className="col-span-3 flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{trade.tradeName}</span>
                            {trade.planStatus && <PlanStatusBadge status={trade.planStatus} />}
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{trade.submitted}</span>
                            <span className="text-xs text-gray-400">/{trade.total}</span>
                          </div>
                          <div className="col-span-1 text-center text-xs text-amber-500 font-semibold">{trade.draft || '—'}</div>
                          <div className="col-span-1 text-center text-xs text-gray-400">{trade.notStarted}</div>
                          <div className="col-span-2 flex items-center gap-2">
                            <ProgressBar pct={trade.pct} size="sm" />
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-8 text-right flex-shrink-0">{trade.pct}%</span>
                          </div>
                          <div className="col-span-3">
                            {canManage ? (
                              <PlanCell
                                plan={plan}
                                floorId={floor.floorId}
                                tradeId={trade.tradeId}
                                projectId={projectId}
                                onSaved={(p) => handlePlanSaved(floor.floorId, trade.tradeId, p)}
                              />
                            ) : (
                              <span className="text-xs text-gray-400">
                                {plan?.plannedEnd ? `${fmtDate(plan.plannedStart)} → ${fmtDate(plan.plannedEnd)}` : '—'}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            {summary.floors.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No floor data for this project.</div>
            )}
          </div>
        )}

        {/* ── Milestones tab ── */}
        {!loading && tab === 'milestones' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">{milestones.length} milestone{milestones.length !== 1 ? 's' : ''} total</p>
              {canManage && (
                <button onClick={() => setMsModal({})} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4" /> Add Milestone
                </button>
              )}
            </div>

            {overdue.length > 0 && (
              <MilestoneSection title="Overdue" count={overdue.length} color="text-red-500" items={overdue} canManage={canManage} onEdit={setMsModal} onDelete={deleteMilestone} onToggle={toggleComplete} />
            )}
            {upcoming.length > 0 && (
              <MilestoneSection title="Upcoming" count={upcoming.length} color="text-blue-500" items={upcoming} canManage={canManage} onEdit={setMsModal} onDelete={deleteMilestone} onToggle={toggleComplete} />
            )}
            {done.length > 0 && (
              <MilestoneSection title="Completed" count={done.length} color="text-emerald-500" items={done} canManage={canManage} onEdit={setMsModal} onDelete={deleteMilestone} onToggle={toggleComplete} />
            )}
            {milestones.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Flag className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No milestones yet. Add one to track key project dates.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Milestone modal */}
      <MilestoneModal
        open={msModal !== null}
        onClose={() => setMsModal(null)}
        onSave={saveMilestone}
        initial={msModal && msModal._id ? msModal : null}
        floors={floorOpts}
        trades={tradeOpts}
      />
    </AdminLayout>
  )
}

// ── Milestone section (for grouping) ──────────────────────────────────────────
function MilestoneSection({ title, count, color, items, canManage, onEdit, onDelete, onToggle }) {
  return (
    <div>
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${color}`}>{title} ({count})</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(m => (
          <MilestoneCard key={m._id} m={m} canManage={canManage} onEdit={() => onEdit(m)} onDelete={() => onDelete(m._id)} onToggle={() => onToggle(m)} />
        ))}
      </div>
    </div>
  )
}

// ── Milestone card ─────────────────────────────────────────────────────────────
function MilestoneCard({ m, canManage, onEdit, onDelete, onToggle }) {
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const isOverdue   = !m.completedAt && new Date(m.targetDate) < today
  const isCompleted = !!m.completedAt
  const daysLeft    = Math.ceil((new Date(m.targetDate) - today) / (1000 * 60 * 60 * 24))
  const priCfg   = PRIORITY[m.priority] || PRIORITY.MEDIUM

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
      isCompleted ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
      : isOverdue  ? 'border-red-200    dark:border-red-800    bg-red-50/50    dark:bg-red-900/10'
      :               'border-gray-200    dark:border-gray-700    bg-white        dark:bg-gray-900'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${priCfg.cls}`}>{priCfg.label}</span>
            {m.floorId && <span className="text-[10px] text-gray-400">{m.floorId?.label || m.floorId}</span>}
            {m.tradeId && <span className="text-[10px] text-gray-400">· {m.tradeId?.name || m.tradeId}</span>}
          </div>
          <p className={`text-sm font-bold leading-snug ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{m.title}</p>
          {m.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{m.description}</p>}
        </div>
        {canManage && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit}   className="p-1 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-1 rounded-lg text-gray-400 hover:text-red-500   hover:bg-red-50    dark:hover:bg-red-500/10    transition-colors"><Trash2  className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <CalendarDays className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-400' : isCompleted ? 'text-emerald-400' : 'text-gray-400'}`} />
          <span className={isOverdue ? 'text-red-500 font-semibold' : isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}>
            {isCompleted ? `Done ${fmtDate(m.completedAt)}` : isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="text-gray-400">{fmtDate(m.targetDate)}</span>
        </div>
        {canManage && (
          <button
            onClick={onToggle}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              isCompleted
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            {isCompleted ? 'Undo' : 'Complete'}
          </button>
        )}
      </div>
    </div>
  )
}
