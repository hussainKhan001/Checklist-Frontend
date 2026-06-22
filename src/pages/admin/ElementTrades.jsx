import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import Modal from '../../components/Modal'
import {
  adminGetElements, adminGetTrades, adminCreateTrade, adminUpdateTrade, adminDeleteTrade,
  adminGetCheckPoints,
} from '../../api'
import { useConfirm } from '../../context/ConfirmContext'
import { Plus, Pencil, Trash2, CheckSquare, ChevronRight, Layers } from 'lucide-react'
import toast from 'react-hot-toast'

const BLANK = { name: '', order: 0, isHoldPoint: false, isPending: false, whyItMatters: '' }

const ELEM_LABEL = {
  WALL: 'Wall', COLUMN: 'Column', BEAM: 'Beam', SLAB: 'Slab',
  DOOR_WINDOW_FRAME: 'Door/Window Frame', STAIRCASE: 'Staircase', OTHER: 'Other',
}

const inputCls = 'w-full px-3 py-2 text-sm bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors'

export default function ElementTrades() {
  const { elementId } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const [element, setElement] = useState(null)
  const [trades, setTrades] = useState([])
  const [cpCounts, setCpCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const r = await adminGetTrades(elementId)
    setTrades(r.data)
    const counts = {}
    await Promise.all(r.data.map(async t => {
      const c = await adminGetCheckPoints(t._id)
      counts[t._id] = c.data.length
    }))
    setCpCounts(counts)
  }

  useEffect(() => {
    Promise.all([
      adminGetElements(),
      adminGetTrades(elementId),
    ]).then(async ([eRes, tRes]) => {
      setElement(eRes.data.find(e => e._id === elementId) || null)
      setTrades(tRes.data)
      const counts = {}
      await Promise.all(tRes.data.map(async t => {
        const c = await adminGetCheckPoints(t._id)
        counts[t._id] = c.data.length
      }))
      setCpCounts(counts)
    }).finally(() => setLoading(false))
  }, [elementId])

  const openAdd = () => { setForm(BLANK); setError(''); setModal('add') }
  const openEdit = (t) => {
    setForm({ name: t.name, order: t.order, isHoldPoint: t.isHoldPoint, isPending: t.isPending, whyItMatters: t.whyItMatters || '' })
    setModal(t._id)
  }

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required.')
    setSaving(true); setError('')
    try {
      if (modal === 'add') {
        await adminCreateTrade({ ...form, elementId })
      } else {
        await adminUpdateTrade(modal, form)
      }
      setModal(null)
      await load()
      toast.success(modal === 'add' ? 'Trade created' : 'Trade updated')
    } catch (e) { setError(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    const ok = await confirm('Delete trade and all its check points?', 'This will permanently remove all associated check points.')
    if (!ok) return
    await adminDeleteTrade(id)
    setTrades(prev => prev.filter(t => t._id !== id))
    toast.success('Trade deleted')
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
          <Link to="/projects" className="hover:text-orange-500 transition-colors font-medium">Projects</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-600 dark:text-gray-300 font-medium">Element Trades</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {element ? element.name : '…'} — Trades
              </h1>
              {element && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  {ELEM_LABEL[element.type] || element.type}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trades specific to this structural element · {trades.length} total
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-orange-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Trade
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {['#', 'Trade Name', 'Hold Point', 'Status', 'Check Points', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {trades.map(t => (
                    <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{t.order}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{t.name}</td>
                      <td className="px-4 py-3">
                        {t.isHoldPoint
                          ? <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">Hold Point</span>
                          : <span className="text-gray-400 dark:text-gray-500">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {t.isPending
                          ? <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">Pending</span>
                          : <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Active</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{cpCounts[t._id] ?? '…'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/trades/${t._id}/checkpoints`)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                          >
                            <CheckSquare className="w-3.5 h-3.5" /> Checkpoints
                          </button>
                          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => del(t._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {trades.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                        No trades for this element yet. Add one above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {modal && (
          <Modal
            title={modal === 'add' ? 'Add Trade' : 'Edit Trade'}
            onClose={() => setModal(null)}
            footer={
              <div className="flex justify-end gap-2">
                <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Cancel</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-sm shadow-orange-500/30 transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            }
          >
            {error && (
              <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Trade Name *</label>
                  <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Column Formwork, Wall Plastering" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Order</label>
                  <input className={inputCls} type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: +e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Why It Matters</label>
                <textarea className={inputCls} rows={3} value={form.whyItMatters} onChange={e => setForm(f => ({ ...f, whyItMatters: e.target.value }))} placeholder="Explain the risk context…" />
              </div>
              <div className="flex gap-6">
                {[['isHoldPoint', 'Hold Point'], ['isPending', 'Content Pending']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  )
}
