import { useEffect, useState, useCallback } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import {
  adminGetProjects, adminGetFloors, adminGetLocations, adminGetElements,
  adminGetTrades, adminGetTradeElementsByLocation,
  adminCreateTradeElement, adminDeleteTradeElement,
} from '../../services/api'
import { useConfirm } from '../../context/ConfirmContext'
import { Plus, Trash2, Layers, Zap, ChevronRight, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_COLOR = {
  WALL:              'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
  COLUMN:            'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400',
  BEAM:              'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  SLAB:              'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  DOOR_WINDOW_FRAME: 'bg-pink-100 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400',
  STAIRCASE:         'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400',
  OTHER:             'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
}
const TYPE_LABEL = {
  WALL: 'Wall', COLUMN: 'Column', BEAM: 'Beam', SLAB: 'Slab',
  DOOR_WINDOW_FRAME: 'Door/Win', STAIRCASE: 'Staircase', OTHER: 'Other',
}

const sel = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition disabled:opacity-50 disabled:cursor-not-allowed'

export default function RoomAssignment() {
  const confirm = useConfirm()

  // Cascading selectors
  const [projects,    setProjects]    = useState([])
  const [floors,      setFloors]      = useState([])
  const [locations,   setLocations]   = useState([])
  const [allTrades,   setAllTrades]   = useState([])

  const [selProject,  setSelProject]  = useState('')
  const [selFloor,    setSelFloor]    = useState('')
  const [selLocation, setSelLocation] = useState('')

  // Data for selected location
  const [elements,     setElements]     = useState([])
  const [assignments,  setAssignments]  = useState([]) // TradeElement docs for this location
  const [loadingData,  setLoadingData]  = useState(false)

  // Bulk assign
  const [bulkTrade,    setBulkTrade]    = useState('')
  const [bulking,      setBulking]      = useState(false)

  // Per-element add
  const [addingFor,    setAddingFor]    = useState(null) // elementId
  const [addTrade,     setAddTrade]     = useState('')
  const [saving,       setSaving]       = useState(false)

  // ── Bootstrap ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([adminGetProjects(), adminGetTrades()])
      .then(([pRes, tRes]) => {
        setProjects(pRes.data)
        setAllTrades(tRes.data.filter(t => !t.isHidden))
      })
  }, [])

  // ── Cascading loads ────────────────────────────────────────────────────────────
  useEffect(() => {
    setFloors([]); setSelFloor('')
    setLocations([]); setSelLocation('')
    setElements([]); setAssignments([])
    if (!selProject) return
    adminGetFloors(selProject).then(r => setFloors(r.data))
  }, [selProject])

  useEffect(() => {
    setLocations([]); setSelLocation('')
    setElements([]); setAssignments([])
    if (!selFloor) return
    adminGetLocations(selFloor).then(r => setLocations(r.data))
  }, [selFloor])

  const loadLocationData = useCallback(async (locationId) => {
    if (!locationId) { setElements([]); setAssignments([]); return }
    setLoadingData(true)
    try {
      const [elRes, teRes] = await Promise.all([
        adminGetElements(locationId),
        adminGetTradeElementsByLocation(locationId),
      ])
      setElements(elRes.data)
      setAssignments(teRes.data)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    setElements([]); setAssignments([])
    loadLocationData(selLocation)
  }, [selLocation])

  // ── Helpers ────────────────────────────────────────────────────────────────────
  // Get trade assignments for a specific element
  const tradesForElement = (elementId) =>
    assignments.filter(a => {
      const eId = a.elementId?._id ? String(a.elementId._id) : String(a.elementId)
      return eId === String(elementId)
    })

  // Check if a trade is already assigned to an element
  const isAssigned = (elementId, tradeId) =>
    tradesForElement(elementId).some(a => {
      const tId = a.tradeId?._id ? String(a.tradeId._id) : String(a.tradeId)
      return tId === String(tradeId)
    })

  // ── Bulk assign ────────────────────────────────────────────────────────────────
  const handleBulkAssign = async () => {
    if (!bulkTrade || !elements.length) return
    const unassigned = elements.filter(el => !isAssigned(el._id, bulkTrade))
    if (!unassigned.length) return toast.error('All elements already have this trade assigned.')
    setBulking(true)
    try {
      await Promise.all(
        unassigned.map(el => adminCreateTradeElement({ tradeId: bulkTrade, elementId: el._id }))
      )
      await loadLocationData(selLocation)
      toast.success(`Trade assigned to ${unassigned.length} element(s).`)
    } catch {
      toast.error('Some assignments failed.')
    } finally {
      setBulking(false)
    }
  }

  // ── Per-element add ────────────────────────────────────────────────────────────
  const handleAdd = async (elementId) => {
    if (!addTrade) return
    if (isAssigned(elementId, addTrade)) return toast.error('Already assigned.')
    setSaving(true)
    try {
      await adminCreateTradeElement({ tradeId: addTrade, elementId })
      await loadLocationData(selLocation)
      setAddingFor(null); setAddTrade('')
      toast.success('Trade assigned.')
    } catch {
      toast.error('Failed to assign.')
    } finally { setSaving(false) }
  }

  // ── Remove assignment ──────────────────────────────────────────────────────────
  const handleRemove = async (assignmentId, tradeName) => {
    const ok = await confirm(`Remove "${tradeName}" from this element?`, 'This will remove the trade assignment.')
    if (!ok) return
    try {
      await adminDeleteTradeElement(assignmentId)
      setAssignments(prev => prev.filter(a => a._id !== assignmentId))
      toast.success('Assignment removed.')
    } catch {
      toast.error('Failed to remove.')
    }
  }

  const projectName  = projects.find(p => p._id === selProject)?.name || ''
  const floorLabel   = floors.find(f => f._id === selFloor)?.label || ''
  const locationName = locations.find(l => l._id === selLocation)?.name || ''
  const bulkTradeName = allTrades.find(t => t._id === bulkTrade)?.name || ''

  const unassignedCount = bulkTrade
    ? elements.filter(el => !isAssigned(el._id, bulkTrade)).length
    : 0

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Room Assignments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Assign trades to structural elements in a specific project, floor, and room.
          </p>
        </div>

        {/* Location picker */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-orange-500" /> Select Location
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Project</label>
              <select className={sel} value={selProject} onChange={e => setSelProject(e.target.value)}>
                <option value="">— select project —</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Floor</label>
              <select className={sel} value={selFloor} onChange={e => setSelFloor(e.target.value)} disabled={!selProject}>
                <option value="">— select floor —</option>
                {floors.map(f => <option key={f._id} value={f._id}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Room / Area</label>
              <select className={sel} value={selLocation} onChange={e => setSelLocation(e.target.value)} disabled={!selFloor}>
                <option value="">— select room —</option>
                {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Breadcrumb trail */}
        {selLocation && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
            <span className="font-semibold text-orange-500">{projectName}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-medium text-gray-600 dark:text-gray-300">{floorLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-gray-900 dark:text-white">{locationName}</span>
            <span className="ml-2 text-gray-400">· {elements.length} elements</span>
          </div>
        )}

        {/* Bulk assign panel */}
        {selLocation && elements.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Bulk Assign — Apply one trade to ALL elements in this room
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Trade</label>
                <select className={sel} value={bulkTrade} onChange={e => setBulkTrade(e.target.value)}>
                  <option value="">— select trade —</option>
                  {allTrades.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              {bulkTrade && unassignedCount === 0 ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                  <Info className="w-4 h-4" />
                  "{bulkTradeName}" is already assigned to all {elements.length} elements in this room.
                </p>
              ) : (
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkTrade || bulking}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition"
                >
                  <Zap className="w-4 h-4" />
                  {bulking
                    ? 'Assigning…'
                    : bulkTrade
                      ? `Assign "${bulkTradeName}" to ${unassignedCount} element(s)`
                      : 'Select a trade above, then click here to assign'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Elements table */}
        {selLocation && (
          loadingData ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading elements…</div>
          ) : elements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
              <Layers className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No structural elements in this room.</p>
              <p className="text-xs mt-1">Add elements first from the Projects → Floors section.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/60">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Elements in <span className="text-orange-500">{locationName}</span>
                </span>
                <span className="text-xs text-gray-400">{elements.length} elements</span>
              </div>

              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {elements.map(el => {
                  const elTrades = tradesForElement(el._id)
                  const isAdding = addingFor === el._id

                  // Trades not yet assigned to this element
                  const availableTrades = allTrades.filter(t => !elTrades.some(a => (a.tradeId?._id || a.tradeId) === t._id))

                  return (
                    <div key={el._id} className="px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                      <div className="flex items-start gap-3 flex-wrap">
                        {/* Element name + type */}
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${TYPE_COLOR[el.type] || TYPE_COLOR.OTHER}`}>
                            {TYPE_LABEL[el.type] || el.type}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{el.name}</span>
                        </div>

                        {/* Assigned trades */}
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          {elTrades.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">No trades assigned</span>
                          ) : (
                            elTrades.map(a => {
                              const tName = a.tradeId?.name || allTrades.find(t => t._id === a.tradeId)?.name || '…'
                              return (
                                <span
                                  key={a._id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30"
                                >
                                  {tName}
                                  <button
                                    onClick={() => handleRemove(a._id, tName)}
                                    className="ml-0.5 w-3.5 h-3.5 rounded-full hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-500 text-blue-400 transition-colors flex items-center justify-center"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              )
                            })
                          )}

                          {/* Inline add trade */}
                          {isAdding ? (
                            <div className="flex items-center gap-1.5">
                              <select
                                className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                                value={addTrade}
                                onChange={e => setAddTrade(e.target.value)}
                                autoFocus
                              >
                                <option value="">— pick trade —</option>
                                {availableTrades.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                              </select>
                              <button
                                onClick={() => handleAdd(el._id)}
                                disabled={!addTrade || saving}
                                className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                              >
                                {saving ? '…' : 'Add'}
                              </button>
                              <button
                                onClick={() => { setAddingFor(null); setAddTrade('') }}
                                className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            availableTrades.length > 0 && (
                              <button
                                onClick={() => { setAddingFor(el._id); setAddTrade('') }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 border border-dashed border-gray-300 dark:border-gray-600 hover:border-orange-400 transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Add Trade
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        )}

        {!selLocation && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Layers className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Select a project, floor, and room above</p>
            <p className="text-xs mt-1">Then assign trades to elements in bulk or one by one.</p>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
