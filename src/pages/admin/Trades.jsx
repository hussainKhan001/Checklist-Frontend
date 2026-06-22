import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import Modal from '../../components/Modal'
import { adminGetTrades, adminCreateTrade, adminUpdateTrade, adminDeleteTrade, adminGetCheckPoints } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Plus, Pencil, Trash2, CheckSquare, Layers, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const BLANK = { name: '', order: 0, isHoldPoint: false, isPending: false, whyItMatters: '', color: '' }

export default function Trades() {
  const [trades, setTrades] = useState([])
  const [cpCounts, setCpCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { hasPermission } = useAuth()
  const isAdmin = hasPermission('manage_trades')

  const load = async () => {
    const r = await adminGetTrades()
    setTrades(r.data)
    const counts = {}
    await Promise.all(r.data.map(async t => {
      const c = await adminGetCheckPoints(t._id)
      counts[t._id] = c.data.length
    }))
    setCpCounts(counts)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(BLANK); setError(''); setModal('add') }
  const openEdit = (t) => { setForm({ name: t.name, order: t.order, isHoldPoint: t.isHoldPoint, isPending: t.isPending, whyItMatters: t.whyItMatters || '', color: t.color || '' }); setModal(t._id) }

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required.')
    setSaving(true); setError('')
    try {
      modal === 'add' ? await adminCreateTrade(form) : await adminUpdateTrade(modal, form)
      setModal(null); load()
      toast.success(modal === 'add' ? 'Trade created' : 'Trade updated')
    } catch (e) { setError(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  const toggleHide = async (t) => {
    await adminUpdateTrade(t._id, { isHidden: !t.isHidden })
    setTrades(prev => prev.map(x => x._id === t._id ? { ...x, isHidden: !x.isHidden } : x))
    toast.success(t.isHidden ? 'Trade visible' : 'Trade hidden')
  }

  const del = async (id) => {
    const ok = await confirm('Delete trade and all its check points?', 'This will permanently remove all associated check points.')
    if (!ok) return
    await adminDeleteTrade(id)
    setTrades(prev => prev.filter(t => t._id !== id))
    toast.success('Trade deleted')
  }

  const inputCls = "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trades & Checklists</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{trades.length} trades</p>
          </div>
          {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-orange-500/30 transition-colors">
              <Plus className="w-4 h-4" /> Add Trade
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {['#','Trade Name','Hold Point','Status','Check Points','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {trades.map(t => (
                    <tr key={t._id} className={`transition-colors ${t.isHidden ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{t.order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${t.isHidden ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{t.name}</span>
                          {t.isHidden && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500">Hidden</span>}
                        </div>
                      </td>
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
                          <button onClick={() => navigate(`/trades/${t._id}/elements`)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                            <Layers className="w-3.5 h-3.5" /> Elements
                          </button>
                          <button onClick={() => navigate(`/trades/${t._id}/checkpoints`)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
                            <CheckSquare className="w-3.5 h-3.5" /> Checkpoints
                          </button>
                          {isAdmin && <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"><Pencil className="w-4 h-4" /></button>}
                          {isAdmin && <button onClick={() => toggleHide(t)} title={t.isHidden ? 'Show trade' : 'Hide trade'} className={`p-1.5 rounded-lg transition-colors ${t.isHidden ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}>
                            {t.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>}
                          {isAdmin && <button onClick={() => del(t._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {trades.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No trades yet.</td></tr>}
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
                <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-sm shadow-orange-500/30 transition-colors">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            }
          >
            {error && <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Trade Name *</label>
                  <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Brick / Block Masonry" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Order</label>
                  <input className={inputCls} type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: +e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Trade Color</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={form.color || '#6b7280'}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5 bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-5 h-5 rounded flex-shrink-0" style={{ backgroundColor: form.color || '#6b7280' }} />
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{form.color || '#6b7280'}</span>
                  </div>
                  {form.color && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: '' }))}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Why It Matters</label>
                <textarea className={inputCls} rows={3} value={form.whyItMatters} onChange={e => setForm(f => ({ ...f, whyItMatters: e.target.value }))} placeholder="Explain the risk context for this trade…" />
              </div>
              <div className="flex gap-6">
                {[['isHoldPoint','Hold Point'],['isPending','Content Pending']].map(([key, label]) => (
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
