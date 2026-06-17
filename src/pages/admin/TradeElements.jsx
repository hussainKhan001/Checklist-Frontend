import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import {
  adminGetTrades, adminGetProjects, adminGetFloors, adminGetLocations, adminGetElements,
  adminGetTradeElements, adminCreateTradeElement, adminDeleteTradeElement,
} from '../../api'
import { useConfirm } from '../../context/ConfirmContext'
import { Plus, Trash2, ChevronRight, Layers, CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_COLOR = {
  WALL:              'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
  COLUMN:            'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400',
  BEAM:              'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  SLAB:              'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  DOOR_WINDOW_FRAME: 'bg-pink-100 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400',
  STAIRCASE:         'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400',
  OTHER:             'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
}
const TYPE_LABEL = {
  WALL: 'Wall', COLUMN: 'Column', BEAM: 'Beam', SLAB: 'Slab',
  DOOR_WINDOW_FRAME: 'Door/Window Frame', STAIRCASE: 'Staircase', OTHER: 'Other',
}

const selectCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition'

export default function TradeElements() {
  const { tradeId } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const [trade, setTrade] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  // Add form state
  const [projects, setProjects] = useState([])
  const [selProject, setSelProject] = useState('')
  const [floors, setFloors] = useState([])
  const [selFloor, setSelFloor] = useState('')
  const [locations, setLocations] = useState([])
  const [selLocation, setSelLocation] = useState('')
  const [elements, setElements] = useState([])
  const [selElement, setSelElement] = useState('')
  const [adding, setAdding] = useState(false)

  const load = async () => {
    const [tRes, teRes] = await Promise.all([adminGetTrades(), adminGetTradeElements(tradeId)])
    setTrade(tRes.data.find(t => t._id === tradeId) || null)
    setAssignments(teRes.data)
  }

  useEffect(() => {
    Promise.all([load(), adminGetProjects().then(r => setProjects(r.data))])
      .finally(() => setLoading(false))
  }, [tradeId])

  useEffect(() => {
    if (!selProject) { setFloors([]); setSelFloor(''); return }
    adminGetFloors(selProject).then(r => setFloors(r.data))
    setSelFloor(''); setSelLocation(''); setSelElement('')
  }, [selProject])

  useEffect(() => {
    if (!selFloor) { setLocations([]); setSelLocation(''); return }
    adminGetLocations(selFloor).then(r => setLocations(r.data))
    setSelLocation(''); setSelElement('')
  }, [selFloor])

  useEffect(() => {
    if (!selLocation) { setElements([]); setSelElement(''); return }
    adminGetElements(selLocation).then(r => setElements(r.data))
    setSelElement('')
  }, [selLocation])

  const handleAdd = async () => {
    if (!selElement) return toast.error('Select an element first.')
    const alreadyAssigned = assignments.some(a => a.elementId?._id === selElement)
    if (alreadyAssigned) return toast.error('This element is already assigned.')
    setAdding(true)
    try {
      await adminCreateTradeElement({ tradeId, elementId: selElement })
      await load()
      setSelElement('')
      toast.success('Element assigned.')
    } catch {
      toast.error('Failed to assign element.')
    } finally { setAdding(false) }
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Remove this element assignment?', 'The element will no longer appear for this work.')
    if (!ok) return
    await adminDeleteTradeElement(id)
    setAssignments(prev => prev.filter(a => a._id !== id))
    toast.success('Assignment removed.')
  }

  // Group existing assignments by location for display
  const grouped = assignments.reduce((acc, a) => {
    const locName = a.elementId?.locationId?.name || 'Unknown Location'
    const floorLabel = a.elementId?.floorId?.label || ''
    const key = `${floorLabel} — ${locName}`
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
          <Link to="/admin/trades" className="hover:text-orange-500 transition-colors font-medium">Trades</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-600 dark:text-gray-300 font-medium">{trade?.name || '…'} — Eligible Elements</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {trade?.name || '…'} — Eligible Elements
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Configure which structural elements (walls, columns, beams…) require this work.
            When a user selects this work, they will see these elements to choose from.
          </p>
        </div>

        {/* Add assignment */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-500" /> Assign Element to this Work
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Project</label>
              <select className={selectCls} value={selProject} onChange={e => setSelProject(e.target.value)}>
                <option value="">— select —</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Floor</label>
              <select className={selectCls} value={selFloor} onChange={e => setSelFloor(e.target.value)} disabled={!selProject}>
                <option value="">— select —</option>
                {floors.map(f => <option key={f._id} value={f._id}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Location</label>
              <select className={selectCls} value={selLocation} onChange={e => setSelLocation(e.target.value)} disabled={!selFloor}>
                <option value="">— select —</option>
                {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Element</label>
              <select className={selectCls} value={selElement} onChange={e => setSelElement(e.target.value)} disabled={!selLocation}>
                <option value="">— select —</option>
                {elements.map(el => <option key={el._id} value={el._id}>{el.name} ({TYPE_LABEL[el.type] || el.type})</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!selElement || adding}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> {adding ? 'Assigning…' : 'Assign Element'}
            </button>
          </div>
        </div>

        {/* Assigned elements list */}
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <Layers className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No elements assigned yet.</p>
            <p className="text-xs mt-1">Use the form above to add eligible elements for this work.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([groupKey, items]) => (
              <div key={groupKey} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{groupKey}</span>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {items.map(a => (
                    <div key={a._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${TYPE_COLOR[a.elementId?.type] || TYPE_COLOR.OTHER}`}>
                          <Layers className="w-3 h-3" />
                          {TYPE_LABEL[a.elementId?.type] || a.elementId?.type}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{a.elementId?.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/admin/trades/${tradeId}/elements/${a.elementId?._id}/checkpoints`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          title="Manage checkpoints for this element"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> Checkpoints
                        </button>
                        <button
                          onClick={() => handleDelete(a._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Remove assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
