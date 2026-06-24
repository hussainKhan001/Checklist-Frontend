import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import Modal from '../../components/common/Modal'
import { Plus, Pencil, Trash2, ArrowLeft, Camera, Eye, EyeOff, Layers, FolderOpen } from 'lucide-react'
import { useConfirm } from '../../context/ConfirmContext'
import toast from 'react-hot-toast'
import {
  adminGetProjects,
  adminGetTrades,
  adminGetCheckPoints,
  adminCreateCheckPoint,
  adminUpdateCheckPoint,
  adminDeleteCheckPoint,
  adminGetElement,
} from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const BLANK = { title: '', order: 1, standard: '', howToCheck: '', photoRequired: false }

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition'

export default function CheckPoints() {
  const { tradeId: paramTradeId, elementId: paramElementId } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { hasPermission } = useAuth()
  const isAdmin = hasPermission('manage_trades')

  const elementId = paramElementId || null

  const [projects, setProjects]     = useState([])
  const [trades, setTrades]         = useState([])
  const [selProject, setSelProject] = useState('')   // '' = Global / all projects
  const [selTrade, setSelTrade]     = useState(paramTradeId || '')
  const [checkpoints, setCheckpoints] = useState([])
  const [loading, setLoading]       = useState(false)
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(BLANK)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [elementCtx, setElementCtx] = useState(null)

  // Load projects & trades on mount
  useEffect(() => {
    adminGetProjects().then(r => setProjects(r.data))
    adminGetTrades().then(r => setTrades(r.data))
  }, [])

  // Load element context when navigated from an element
  useEffect(() => {
    if (!elementId) return
    adminGetElement(elementId)
      .then(r => {
        setElementCtx(r.data)
        // Auto-select the project that this element belongs to
        if (r.data?.projectId?._id) setSelProject(r.data.projectId._id)
      })
      .catch(() => {})
  }, [elementId])

  const load = () => {
    if (!selTrade) return
    setLoading(true)
    adminGetCheckPoints(selTrade, selProject || null, elementId)
      .then(r => setCheckpoints(r.data))
      .finally(() => setLoading(false))
  }
  useEffect(load, [selTrade, selProject, elementId])

  const openAdd = () => {
    const nextOrder = checkpoints.length ? Math.max(...checkpoints.map(c => c.order)) + 1 : 1
    setForm({
      ...BLANK,
      order: nextOrder,
      tradeId: selTrade,
      projectId: selProject || null,
      ...(elementId ? { elementId } : {}),
    })
    setError('')
    setModal('add')
  }

  const openEdit = (cp) => {
    setForm({
      title: cp.title,
      order: cp.order,
      standard: cp.standard || '',
      howToCheck: cp.howToCheck || '',
      photoRequired: cp.photoRequired,
      tradeId: selTrade,
      projectId: selProject || null,
      ...(elementId ? { elementId } : {}),
    })
    setModal(cp._id)
  }

  const save = async () => {
    if (!form.title.trim()) return setError('Title is required.')
    setSaving(true); setError('')
    try {
      if (modal === 'add') await adminCreateCheckPoint(form)
      else await adminUpdateCheckPoint(modal, form)
      setModal(null); load()
      toast.success(modal === 'add' ? 'Check point added' : 'Check point updated')
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const toggleHide = async (cp) => {
    await adminUpdateCheckPoint(cp._id, { isHidden: !cp.isHidden })
    setCheckpoints(prev => prev.map(x => x._id === cp._id ? { ...x, isHidden: !x.isHidden } : x))
    toast.success(cp.isHidden ? 'Check point visible' : 'Check point hidden')
  }

  const del = async (id) => {
    const ok = await confirm('Delete this check point?', 'This cannot be undone.')
    if (!ok) return
    await adminDeleteCheckPoint(id)
    setCheckpoints(prev => prev.filter(c => c._id !== id))
    toast.success('Check point deleted')
  }

  const tradeName   = trades.find(t => t._id === selTrade)?.name || ''
  const projectName = projects.find(p => p._id === selProject)?.name || ''

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => elementId ? navigate(`/trades/${selTrade}/elements`) : paramTradeId ? navigate('/trades') : navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-orange-500 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {elementId ? 'Back to Elements' : paramTradeId ? 'Back to Trades' : 'Back'}
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Check Points
              {tradeName ? <span className="text-orange-500"> — {tradeName}</span> : ''}
            </h1>

            {/* Element context breadcrumb */}
            {elementId && elementCtx && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Layers className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="font-semibold text-gray-700 dark:text-gray-200">{elementCtx.projectId?.name}</span>
                <span className="text-gray-400">›</span>
                <span>{elementCtx.floorId?.label}</span>
                <span className="text-gray-400">›</span>
                <span>{elementCtx.locationId?.name}</span>
                <span className="text-gray-400">›</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{elementCtx.name}</span>
              </div>
            )}

            {/* Active scope indicator */}
            {selTrade && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5" />
                Scope: <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {projectName || 'Global (all projects)'}
                </span>
              </p>
            )}
          </div>

          {selTrade && isAdmin && (
            <button
              onClick={openAdd}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Check Point
            </button>
          )}
        </div>

        {/* Project + Trade selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {/* Project selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Project
            </label>
            <select
              className={inputCls}
              value={selProject}
              onChange={e => setSelProject(e.target.value)}
            >
              <option value="">— Global (all projects) —</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Trade selector (hidden when coming from a specific trade URL) */}
          {!paramTradeId && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Trade
              </label>
              <select
                className={inputCls}
                value={selTrade}
                onChange={e => setSelTrade(e.target.value)}
              >
                <option value="">— choose a trade —</option>
                {trades.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        )}

        {!loading && selTrade && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/60">
              <div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Check Points</span>
                {selProject && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium">
                    {projectName}
                  </span>
                )}
                {!selProject && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
                    Global
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{checkpoints.length} total</span>
            </div>

            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Standard</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Photo</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {checkpoints.map(cp => (
                  <tr key={cp._id} className={`transition-colors ${cp.isHidden ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{cp.order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${cp.isHidden ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {cp.title}
                        </span>
                        {cp.isHidden && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500">Hidden</span>
                        )}
                      </div>
                      {cp.howToCheck && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{cp.howToCheck}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell max-w-xs">
                      <span className="line-clamp-2 text-xs leading-relaxed">{cp.standard || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {cp.photoRequired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          <Camera className="w-3 h-3" /> Required
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <button onClick={() => openEdit(cp)} title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => toggleHide(cp)} title={cp.isHidden ? 'Show' : 'Hide'}
                            className={`p-1.5 rounded-lg transition-colors ${cp.isHidden ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}>
                            {cp.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => del(cp._id)} title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {checkpoints.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                      {selProject
                        ? `No check points for ${projectName} yet. Add one or switch to Global to see shared check points.`
                        : 'No global check points yet. Add one to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!selTrade && (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Select a project and trade to manage check points.
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Check Point' : 'Edit Check Point'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Scope indicator inside modal */}
            <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Scope: <strong>{projectName || 'Global (applies to all projects)'}</strong>
                {tradeName && <> · Trade: <strong>{tradeName}</strong></>}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Title *</label>
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Brick soaking before use"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Order</label>
                <input
                  className={inputCls}
                  type="number"
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: +e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Standard</label>
              <textarea
                className={inputCls}
                rows={2}
                value={form.standard}
                onChange={e => setForm(f => ({ ...f, standard: e.target.value }))}
                placeholder="Acceptable threshold or specification…"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">How To Check</label>
              <textarea
                className={inputCls}
                rows={2}
                value={form.howToCheck}
                onChange={e => setForm(f => ({ ...f, howToCheck: e.target.value }))}
                placeholder="Physical verification method…"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.photoRequired}
                onChange={e => setForm(f => ({ ...f, photoRequired: e.target.checked }))}
                className="w-4 h-4 accent-orange-500 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200 font-medium flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-500" /> Photo Mandatory
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}
