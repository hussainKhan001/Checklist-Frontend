import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import Modal from '../../components/Modal'
import { Plus, Pencil, Trash2, MapPin, Layers, Briefcase, X, ChevronDown, ChevronUp, Map, Upload, ImageOff, FileText, ExternalLink } from 'lucide-react'
import { useConfirm } from '../../context/ConfirmContext'
import toast from 'react-hot-toast'
import {
  adminGetProjects, adminGetFloors, adminCreateFloor, adminUpdateFloor, adminDeleteFloor,
  adminGetLocations, adminCreateLocation, adminUpdateLocation, adminDeleteLocation,
  adminGetElements, adminCreateElement, adminUpdateElement, adminDeleteElement,
  adminGetTrades, adminGetTradeElementsByLocation, adminCreateTradeElement, adminDeleteTradeElement,
  uploadPhoto,
} from '../../api'
import { useAuth } from '../../context/AuthContext'

const BLANK_FLOOR = { code: '', label: '', order: 0, isProjectLevel: false }
const BLANK_LOC   = { name: '', type: 'APARTMENT' }
const BLANK_ELEM  = { name: '', type: 'WALL', order: 0 }

const ELEM_TYPES = ['WALL', 'COLUMN', 'BEAM', 'SLAB', 'DOOR_WINDOW_FRAME', 'STAIRCASE', 'OTHER']
const ELEM_LABEL = { WALL: 'Wall', COLUMN: 'Column', BEAM: 'Beam', SLAB: 'Slab', DOOR_WINDOW_FRAME: 'Door/Window Frame', STAIRCASE: 'Staircase', OTHER: 'Other' }
const TYPE_COLOR = {
  WALL:              'bg-blue-100   dark:bg-blue-500/15   text-blue-700   dark:text-blue-400',
  COLUMN:            'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  BEAM:              'bg-amber-100  dark:bg-amber-500/15  text-amber-700  dark:text-amber-400',
  SLAB:              'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  DOOR_WINDOW_FRAME: 'bg-pink-100   dark:bg-pink-500/15   text-pink-700   dark:text-pink-400',
  STAIRCASE:         'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
  OTHER:             'bg-gray-100   dark:bg-gray-700       text-gray-600   dark:text-gray-300',
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition'
const selectSm = 'px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition'

export default function Floors() {
  const { projectId } = useParams()
  const [projects, setProjects]   = useState([])
  const [selProject, setSelProject] = useState(projectId || '')
  const [floors, setFloors]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(BLANK_FLOOR)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const confirm = useConfirm()
  const { hasPermission } = useAuth()
  const isAdmin = hasPermission('manage_floors')

  // Locations
  const [locFloor, setLocFloor]   = useState(null)
  const [locations, setLocations] = useState([])
  const [locModal, setLocModal]   = useState(null)
  const [locForm, setLocForm]     = useState(BLANK_LOC)

  // Works & Checklists panel
  const [worksLoc, setWorksLoc]       = useState(null)
  const [trades, setTrades]           = useState([])      // all global trades
  const [tradeElems, setTradeElems]   = useState([])      // assignments at this location
  const [elements, setElements]       = useState([])      // structural elements at this location
  const [editTradeId, setEditTradeId] = useState(null)    // trade row being expanded (edit mode)
  const [assignSel, setAssignSel]     = useState('')
  const [assigning, setAssigning]     = useState(false)

  // Add-work inline form
  const [addingWork, setAddingWork]   = useState(false)
  const [newTradeId, setNewTradeId]   = useState('')
  const [newElemIds, setNewElemIds]   = useState(new Set())
  const [addingW, setAddingW]         = useState(false)

  // Element management mini-panel (collapsible)
  const [showElems, setShowElems]     = useState(false)
  const [elemModal, setElemModal]     = useState(null)
  const [elemForm, setElemForm]       = useState(BLANK_ELEM)

  // Floor map upload
  const [floorMapModal, setFloorMapModal]     = useState(null)  // floor object
  const [floorMapPreview, setFloorMapPreview] = useState(null)  // object URL for new file
  const [floorMapIsNewPdf, setFloorMapIsNewPdf] = useState(false)
  const [floorMapUploading, setFloorMapUploading] = useState(false)
  const floorMapFileRef = useRef(null)

  useEffect(() => { adminGetProjects().then(r => setProjects(r.data)) }, [])
  useEffect(() => {
    if (!selProject) return
    setLoading(true)
    adminGetFloors(selProject).then(r => setFloors(r.data)).finally(() => setLoading(false))
  }, [selProject])

  /* ── Floor CRUD ─────────────────────────────────────── */
  const openAddFloor  = () => { setForm({ ...BLANK_FLOOR, projectId: selProject }); setError(''); setModal('add') }
  const openEditFloor = (f) => { setForm({ code: f.code, label: f.label, order: f.order, isProjectLevel: f.isProjectLevel, projectId: selProject }); setModal(f._id) }

  const saveFloor = async () => {
    if (!form.code || !form.label) return setError('Code and label are required.')
    setSaving(true); setError('')
    try {
      modal === 'add' ? await adminCreateFloor(form) : await adminUpdateFloor(modal, form)
      setModal(null)
      adminGetFloors(selProject).then(r => setFloors(r.data))
      toast.success(modal === 'add' ? 'Floor added' : 'Floor updated')
    } catch (e) { setError(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  const delFloor = async (id) => {
    const ok = await confirm('Delete this floor?', 'All locations under this floor will also be deleted.')
    if (!ok) return
    await adminDeleteFloor(id)
    setFloors(prev => prev.filter(f => f._id !== id))
    if (locFloor?._id === id) { setLocFloor(null); setLocations([]) }
    toast.success('Floor deleted')
  }

  /* ── Location CRUD ──────────────────────────────────── */
  const openLocations = (floor) => {
    setLocFloor(floor); setWorksLoc(null)
    adminGetLocations(floor._id).then(r => setLocations(r.data))
  }

  const saveLocation = async () => {
    if (!locForm.name) return
    locModal === 'add'
      ? await adminCreateLocation({ ...locForm, floorId: locFloor._id, projectId: selProject })
      : await adminUpdateLocation(locModal, locForm)
    setLocModal(null)
    adminGetLocations(locFloor._id).then(r => setLocations(r.data))
    toast.success(locModal === 'add' ? 'Location added' : 'Location updated')
  }

  const delLocation = async (id) => {
    const ok = await confirm('Delete this location?', 'This cannot be undone.')
    if (!ok) return
    await adminDeleteLocation(id)
    setLocations(prev => prev.filter(l => l._id !== id))
    if (worksLoc?._id === id) setWorksLoc(null)
    toast.success('Location deleted')
  }

  /* ── Works panel ────────────────────────────────────── */
  const openWorks = (loc) => {
    setWorksLoc(loc)
    setAddingWork(false); setEditTradeId(null); setShowElems(false)
    loadWorksData(loc._id)
  }

  const loadWorksData = (locationId) => {
    Promise.all([
      adminGetTrades(),
      adminGetTradeElementsByLocation(locationId),
      adminGetElements(locationId),
    ]).then(([tRes, teRes, eRes]) => {
      setTrades(tRes.data)
      setTradeElems(teRes.data)
      setElements(eRes.data)
    })
  }

  const refreshTE = () => adminGetTradeElementsByLocation(worksLoc._id).then(r => setTradeElems(r.data))

  // Group assignments by trade
  const groups = tradeElems.reduce((acc, te) => {
    const id = te.tradeId?._id
    if (!id) return acc
    if (!acc[id]) acc[id] = { trade: te.tradeId, items: [] }
    acc[id].items.push(te)
    return acc
  }, {})

  const configuredTradeIds = new Set(Object.keys(groups))
  const availableTrades = trades.filter(t => !configuredTradeIds.has(t._id))

  const toggleNewElem = (id) => setNewElemIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  /* ── Add Work ─────────────────────────────────────── */
  const handleAddWork = async () => {
    if (!newTradeId) return toast.error('Select a work first.')
    setAddingW(true)
    try {
      if (newElemIds.size > 0) {
        await Promise.all([...newElemIds].map(elemId =>
          adminCreateTradeElement({ tradeId: newTradeId, elementId: elemId })
        ))
      }
      await refreshTE()
      const hadElems = newElemIds.size > 0
      setAddingWork(false); setNewTradeId(''); setNewElemIds(new Set())
      if (!hadElems) setEditTradeId(newTradeId)
      toast.success('Work added.')
    } catch { toast.error('Failed or already assigned.') }
    finally { setAddingW(false) }
  }

  /* ── Assign element to existing trade ─────────────── */
  const handleAssign = async (tradeId) => {
    if (!assignSel) return
    setAssigning(true)
    try {
      await adminCreateTradeElement({ tradeId, elementId: assignSel })
      await refreshTE()
      setEditTradeId(null); setAssignSel('')
      toast.success('Element assigned.')
    } catch { toast.error('Already assigned or failed.') }
    finally { setAssigning(false) }
  }

  /* ── Remove single assignment ─────────────────────── */
  const handleRemove = async (id) => {
    const ok = await confirm('Remove this element?', 'It will no longer appear for this work.')
    if (!ok) return
    await adminDeleteTradeElement(id)
    setTradeElems(prev => prev.filter(te => te._id !== id))
    toast.success('Element removed.')
  }

  /* ── Delete all assignments for a trade at this location */
  const handleDeleteWork = async (tradeId) => {
    const entries = tradeElems.filter(te => te.tradeId?._id === tradeId)
    const ok = await confirm(
      'Remove this work from location?',
      `This will remove all ${entries.length} element assignment(s) for this work here.`
    )
    if (!ok) return
    await Promise.all(entries.map(te => adminDeleteTradeElement(te._id)))
    setTradeElems(prev => prev.filter(te => te.tradeId?._id !== tradeId))
    toast.success('Work removed from this location.')
  }

  /* ── Element CRUD (collapsible section) ─────────────── */
  const saveElement = async () => {
    if (!elemForm.name) return
    elemModal === 'add'
      ? await adminCreateElement({ ...elemForm, locationId: worksLoc._id, floorId: locFloor._id, projectId: selProject })
      : await adminUpdateElement(elemModal, elemForm)
    setElemModal(null)
    adminGetElements(worksLoc._id).then(r => setElements(r.data))
    toast.success(elemModal === 'add' ? 'Element added' : 'Element updated')
  }

  const delElement = async (id) => {
    const ok = await confirm('Delete this element?', 'This cannot be undone.')
    if (!ok) return
    await adminDeleteElement(id)
    setElements(prev => prev.filter(e => e._id !== id))
    toast.success('Element deleted')
  }

  const typeLabel = (t) => ({ APARTMENT: 'Apartment', COMMON_AREA: 'Common Area', PROJECT_LEVEL: 'Project Level' }[t] || t)

  /* ── Floor map upload ──────────────────────────────── */
  const uploadFloorMap = async () => {
    const file = floorMapFileRef.current?.files?.[0]
    if (!file) return
    setFloorMapUploading(true)
    try {
      const fd = new FormData(); fd.append('photo', file)
      const { data } = await uploadPhoto(fd)
      await adminUpdateFloor(floorMapModal._id, { mapImage: data.url })
      setFloors(prev => prev.map(f => f._id === floorMapModal._id ? { ...f, mapImage: data.url } : f))
      setFloorMapModal(prev => ({ ...prev, mapImage: data.url }))
      setFloorMapPreview(null)
      setFloorMapIsNewPdf(false)
      if (floorMapFileRef.current) floorMapFileRef.current.value = ''
      toast.success('Floor map uploaded')
      setFloorMapModal(null)
    } catch { toast.error('Upload failed. Try again.') }
    finally { setFloorMapUploading(false) }
  }

  const removeFloorMap = async () => {
    const ok = await confirm('Remove this floor map?', 'The map image will be deleted from this floor.')
    if (!ok) return
    await adminUpdateFloor(floorMapModal._id, { mapImage: '' })
    setFloors(prev => prev.map(f => f._id === floorMapModal._id ? { ...f, mapImage: '' } : f))
    setFloorMapModal(prev => ({ ...prev, mapImage: '' }))
    toast.success('Map removed')
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Floors</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage floors, locations and works.</p>
          </div>
          {selProject && isAdmin && (
            <button onClick={openAddFloor} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm transition">
              <Plus className="w-4 h-4" /> Add Floor
            </button>
          )}
        </div>

        {/* Project selector */}
        <div className="max-w-sm">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Select Project</label>
          <select className={inputCls} value={selProject} onChange={e => { setSelProject(e.target.value); setLocFloor(null); setWorksLoc(null) }}>
            <option value="">— choose a project —</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>

        {loading && <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>}

        {!loading && selProject && (
          <div className={`grid gap-5 ${locFloor ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Floors table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/60">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Floors</span>
                <span className="text-xs text-gray-400">{floors.length} total</span>
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    {['Code','Label','Order','Type','Actions'].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {floors.map(f => (
                    <tr key={f._id} className={`transition-colors ${locFloor?._id === f._id ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                      <td className="px-4 py-3 font-bold text-orange-500">{f.code}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{f.label}</td>
                      <td className="px-4 py-3 text-gray-400">{f.order}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${f.isProjectLevel ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'}`}>
                          {f.isProjectLevel ? 'Project Level' : 'Regular'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openLocations(f)} title="Locations" className={`p-1.5 rounded-lg transition-colors ${locFloor?._id === f._id ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-500' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-orange-500'}`}><MapPin className="w-4 h-4" /></button>
                          {isAdmin && <button onClick={() => { setFloorMapModal(f); setFloorMapPreview(null) }} title="Floor map" className={`p-1.5 rounded-lg transition-colors ${f.mapImage ? 'text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-teal-500'}`}><Map className="w-4 h-4" /></button>}
                          {isAdmin && <button onClick={() => openEditFloor(f)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500 transition-colors"><Pencil className="w-4 h-4" /></button>}
                          {isAdmin && <button onClick={() => delFloor(f._id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {floors.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No floors yet.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Locations panel */}
            {locFloor && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/60">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Locations — <span className="text-orange-500">{locFloor.label}</span></span>
                  </div>
                  {isAdmin && <button onClick={() => { setLocForm(BLANK_LOC); setLocModal('add') }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm transition">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>}
                </div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      {['Name','Type','Actions'].map(h => (
                        <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {locations.map(l => (
                      <tr key={l._id} className={`transition-colors ${worksLoc?._id === l._id ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{typeLabel(l.type)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openWorks(l)} title="Works & Checklists" className={`p-1.5 rounded-lg transition-colors ${worksLoc?._id === l._id ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-500' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500'}`}><Briefcase className="w-4 h-4" /></button>
                            {isAdmin && <button onClick={() => { setLocForm({ name: l.name, type: l.type }); setLocModal(l._id) }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500 transition-colors"><Pencil className="w-4 h-4" /></button>}
                            {isAdmin && <button onClick={() => delLocation(l._id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {locations.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">No locations yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Works & Checklists panel ─────────────────────────────── */}
        {worksLoc && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/60">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Works & Checklists — <span className="text-orange-500">{worksLoc.name}</span>
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">({Object.keys(groups).length} works)</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => { setShowElems(false); setAddingWork(v => !v); setNewTradeId(''); setNewElemIds(new Set()) }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Work
                </button>
              )}
            </div>

            {/* Add Work inline form */}
            {addingWork && (
              <div className="px-4 py-3.5 border-b border-orange-100 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5 uppercase tracking-wider">New Work Assignment</p>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Work / Trade *</label>
                      <select className={selectSm + ' min-w-[180px]'} value={newTradeId} onChange={e => setNewTradeId(e.target.value)}>
                        <option value="">— select work —</option>
                        {availableTrades.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={handleAddWork}
                      disabled={!newTradeId || addingW}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition"
                    >
                      {addingW ? 'Adding…' : 'Add'}
                    </button>
                    <button
                      onClick={() => { setAddingWork(false); setNewTradeId(''); setNewElemIds(new Set()) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Multi-element selector */}
                  {elements.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          Elements to assign {newElemIds.size > 0 && <span className="text-orange-500 font-bold">({newElemIds.size} selected)</span>}
                        </label>
                        {newElemIds.size > 0 && (
                          <button onClick={() => setNewElemIds(new Set())} className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">clear</button>
                        )}
                        {newElemIds.size < elements.length && (
                          <button onClick={() => setNewElemIds(new Set(elements.map(e => e._id)))} className="text-[10px] text-gray-400 hover:text-orange-500 transition-colors">select all</button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {elements.map(el => {
                          const sel = newElemIds.has(el._id)
                          return (
                            <button
                              key={el._id}
                              type="button"
                              onClick={() => toggleNewElem(el._id)}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                                sel
                                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                  : `${TYPE_COLOR[el.type] || TYPE_COLOR.OTHER} border-transparent hover:border-orange-300`
                              }`}
                            >
                              {el.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No structural elements at this location yet. Add elements first using the "Manage Elements" section below.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Works list */}
            {Object.keys(groups).length === 0 && !addingWork ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-gray-500">
                <Briefcase className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No works configured for this location.</p>
                <p className="text-xs mt-1">Click <span className="font-semibold text-orange-500">+ Add Work</span> to assign trades and elements.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {Object.values(groups).map(({ trade, items }) => {
                  const isEditing = editTradeId === trade._id
                  const assignedIds = new Set(items.map(te => te.elementId?._id))
                  const available = elements.filter(el => !assignedIds.has(el._id))

                  return (
                    <div key={trade._id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Trade title */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{trade.name}</span>
                            {trade.isHoldPoint && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">Hold Point</span>
                            )}
                            {trade.isPending && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">Pending</span>
                            )}
                          </div>

                          {/* Assigned element chips */}
                          {items.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {items.map(te => (
                                <span
                                  key={te._id}
                                  className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_COLOR[te.elementId?.type] || TYPE_COLOR.OTHER}`}
                                >
                                  {te.elementId?.name}
                                  <button
                                    onClick={() => handleRemove(te._id)}
                                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                                    title="Remove element"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500">No elements assigned yet</p>
                          )}

                          {/* Inline assign form (edit mode) */}
                          {isEditing && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                              <select
                                className={selectSm + ' flex-1'}
                                value={assignSel}
                                onChange={e => setAssignSel(e.target.value)}
                              >
                                <option value="">— select element to assign —</option>
                                {available.map(el => (
                                  <option key={el._id} value={el._id}>{el.name} ({ELEM_LABEL[el.type] || el.type})</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssign(trade._id)}
                                disabled={!assignSel || assigning}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition"
                              >
                                {assigning ? '…' : 'Assign'}
                              </button>
                              <button
                                onClick={() => { setEditTradeId(null); setAssignSel('') }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                              >
                                Done
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {isAdmin && (
                          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                            <button
                              onClick={() => { setEditTradeId(isEditing ? null : trade._id); setAssignSel('') }}
                              title={isEditing ? 'Close' : 'Edit elements'}
                              className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-500' : 'text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-500'}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWork(trade._id)}
                              title="Remove this work from location"
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Structural Elements collapsible ──────────── */}
            <div className="border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setShowElems(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Manage Structural Elements ({elements.length})
                </div>
                {showElems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showElems && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <div className="px-4 py-2 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                    <span className="text-xs text-gray-400">Walls, columns, beams, slabs…</span>
                    {isAdmin && (
                      <button
                        onClick={() => { setElemForm(BLANK_ELEM); setElemModal('add') }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition"
                      >
                        <Plus className="w-3 h-3" /> Add Element
                      </button>
                    )}
                  </div>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {elements.map(el => (
                        <tr key={el._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{el.name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${TYPE_COLOR[el.type] || TYPE_COLOR.OTHER}`}>
                              {ELEM_LABEL[el.type] || el.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400">{el.order}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              {isAdmin && <button onClick={() => { setElemForm({ name: el.name, type: el.type, order: el.order }); setElemModal(el._id) }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>}
                              {isAdmin && <button onClick={() => delElement(el._id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {elements.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">No elements yet. Add walls, columns, beams, etc.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floor modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Floor' : 'Edit Floor'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Code *</label>
                <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="BSMT / G / 1 / TER" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Label *</label>
                <input className={inputCls} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Basement / Ground Floor" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Order</label>
                <input className={inputCls} type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: +e.target.value }))} />
              </div>
              <div className="pb-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={form.isProjectLevel} onChange={e => setForm(f => ({ ...f, isProjectLevel: e.target.checked }))} className="w-4 h-4 accent-orange-500 rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">Project-level area</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={saveFloor} disabled={saving} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Location modal */}
      {locModal && (
        <Modal title={locModal === 'add' ? 'Add Location' : 'Edit Location'} onClose={() => setLocModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Name *</label>
              <input className={inputCls} value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} placeholder="8A / Lift Lobby / Terrace" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
              <select className={inputCls} value={locForm.type} onChange={e => setLocForm(f => ({ ...f, type: e.target.value }))}>
                <option value="APARTMENT">Apartment</option>
                <option value="COMMON_AREA">Common Area</option>
                <option value="PROJECT_LEVEL">Project Level</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setLocModal(null)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={saveLocation} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm transition">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Element modal */}
      {elemModal && (
        <Modal title={elemModal === 'add' ? 'Add Structural Element' : 'Edit Structural Element'} onClose={() => setElemModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Name *</label>
              <input className={inputCls} value={elemForm.name} onChange={e => setElemForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. W-01, Col-A1, B-North" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
                <select className={inputCls} value={elemForm.type} onChange={e => setElemForm(f => ({ ...f, type: e.target.value }))}>
                  {ELEM_TYPES.map(t => <option key={t} value={t}>{ELEM_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Order</label>
                <input className={inputCls} type="number" value={elemForm.order} onChange={e => setElemForm(f => ({ ...f, order: +e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setElemModal(null)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={saveElement} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold shadow-sm transition">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Floor map upload drawer ──────────────────────────────────────────── */}
      {floorMapModal && (
        <Modal
          title="Floor Map"
          onClose={() => setFloorMapModal(null)}
          footer={
            <div className="flex items-center gap-2">
              <button
                onClick={uploadFloorMap}
                disabled={!floorMapPreview || floorMapUploading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {floorMapUploading ? 'Uploading…' : 'Save Map'}
              </button>
              {floorMapModal.mapImage && !floorMapPreview && (
                <button
                  onClick={removeFloorMap}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
              {floorMapPreview && (
                <button
                  onClick={() => { setFloorMapPreview(null); setFloorMapIsNewPdf(false); if (floorMapFileRef.current) floorMapFileRef.current.value = '' }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            {/* Floor info */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <Map className="w-4 h-4 text-teal-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{floorMapModal.label}</p>
                <p className="text-xs text-gray-400">{floorMapModal.code}</p>
              </div>
            </div>

            {/* Preview area */}
            {(() => {
              const src   = floorMapPreview || floorMapModal.mapImage
              const isPdf = floorMapPreview ? floorMapIsNewPdf : (floorMapModal.mapImage?.toLowerCase().includes('.pdf') || floorMapModal.mapImage?.includes('/raw/upload/'))

              if (src && isPdf) return (
                <div className="relative flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-500/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">PDF Document</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Floor plan / layout drawing</p>
                    {!floorMapPreview && (
                      <a href={src} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                        <ExternalLink className="w-3 h-3" /> Open PDF
                      </a>
                    )}
                  </div>
                  {floorMapPreview && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">New</span>
                  )}
                </div>
              )

              if (src) return (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <img src={src} alt="Floor map" className="w-full max-h-56 object-contain" />
                  {floorMapPreview && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">New</div>
                  )}
                </div>
              )

              return (
                <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                    <Map className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">No map uploaded yet</p>
                  <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">Supports image or PDF</p>
                </div>
              )
            })()}

            {/* Upload area */}
            <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
                <Upload className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {floorMapModal.mapImage ? 'Replace map' : 'Upload map'}
                </p>
                <p className="text-[11px] text-gray-400 truncate">JPG, PNG, WebP or PDF</p>
              </div>
              <input
                ref={floorMapFileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setFloorMapPreview(URL.createObjectURL(f))
                    setFloorMapIsNewPdf(f.type === 'application/pdf')
                  }
                }}
              />
            </label>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}
