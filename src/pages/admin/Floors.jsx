import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import Modal from '../../components/Modal'
import { Plus, Pencil, Trash2, MapPin, Layers, CheckSquare } from 'lucide-react'
import { useConfirm } from '../../context/ConfirmContext'
import toast from 'react-hot-toast'
import {
  adminGetProjects, adminGetFloors, adminCreateFloor, adminUpdateFloor, adminDeleteFloor,
  adminGetLocations, adminCreateLocation, adminUpdateLocation, adminDeleteLocation,
  adminGetElements, adminCreateElement, adminUpdateElement, adminDeleteElement,
} from '../../api'

const BLANK_FLOOR = { code: '', label: '', order: 0, isProjectLevel: false }
const BLANK_LOC = { name: '', type: 'APARTMENT' }
const BLANK_ELEM = { name: '', type: 'WALL', order: 0 }

const ELEM_TYPES = ['WALL', 'COLUMN', 'BEAM', 'SLAB', 'DOOR_WINDOW_FRAME', 'STAIRCASE', 'OTHER']
const ELEM_LABEL = { WALL: 'Wall', COLUMN: 'Column', BEAM: 'Beam', SLAB: 'Slab', DOOR_WINDOW_FRAME: 'Door/Window Frame', STAIRCASE: 'Staircase', OTHER: 'Other' }

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition'

export default function Floors() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [selProject, setSelProject] = useState(projectId || '')
  const [floors, setFloors] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(BLANK_FLOOR)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const confirm = useConfirm()
  const [locFloor, setLocFloor] = useState(null)
  const [locations, setLocations] = useState([])
  const [locModal, setLocModal] = useState(null)
  const [locForm, setLocForm] = useState(BLANK_LOC)

  const [elemLoc, setElemLoc] = useState(null)
  const [elements, setElements] = useState([])
  const [elemModal, setElemModal] = useState(null)
  const [elemForm, setElemForm] = useState(BLANK_ELEM)

  useEffect(() => { adminGetProjects().then(r => setProjects(r.data)) }, [])
  useEffect(() => {
    if (!selProject) return
    setLoading(true)
    adminGetFloors(selProject).then(r => setFloors(r.data)).finally(() => setLoading(false))
  }, [selProject])

  const openAddFloor = () => { setForm({ ...BLANK_FLOOR, projectId: selProject }); setError(''); setModal('add') }
  const openEditFloor = (f) => { setForm({ code: f.code, label: f.label, order: f.order, isProjectLevel: f.isProjectLevel, projectId: selProject }); setModal(f._id) }

  const saveFloor = async () => {
    if (!form.code || !form.label) return setError('Code and label are required.')
    setSaving(true); setError('')
    try {
      if (modal === 'add') await adminCreateFloor(form)
      else await adminUpdateFloor(modal, form)
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

  const openLocations = (floor) => {
    setLocFloor(floor)
    adminGetLocations(floor._id).then(r => setLocations(r.data))
  }

  const saveLocation = async () => {
    if (!locForm.name) return
    if (locModal === 'add') await adminCreateLocation({ ...locForm, floorId: locFloor._id, projectId: selProject })
    else await adminUpdateLocation(locModal, locForm)
    setLocModal(null)
    adminGetLocations(locFloor._id).then(r => setLocations(r.data))
    toast.success(locModal === 'add' ? 'Location added' : 'Location updated')
  }

  const delLocation = async (id) => {
    const ok = await confirm('Delete this location?', 'This cannot be undone.')
    if (!ok) return
    await adminDeleteLocation(id)
    setLocations(prev => prev.filter(l => l._id !== id))
    toast.success('Location deleted')
  }

  const openElements = (loc) => {
    setElemLoc(loc)
    adminGetElements(loc._id).then(r => setElements(r.data))
  }

  const saveElement = async () => {
    if (!elemForm.name) return
    if (elemModal === 'add') await adminCreateElement({ ...elemForm, locationId: elemLoc._id, floorId: locFloor._id, projectId: selProject })
    else await adminUpdateElement(elemModal, elemForm)
    setElemModal(null)
    adminGetElements(elemLoc._id).then(r => setElements(r.data))
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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Floors</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage floors and their locations per project.</p>
          </div>
          {selProject && (
            <button
              onClick={openAddFloor}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Floor
            </button>
          )}
        </div>

        {/* Project selector */}
        <div className="max-w-sm">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Select Project</label>
          <select
            className={inputCls}
            value={selProject}
            onChange={e => { setSelProject(e.target.value); setLocFloor(null) }}
          >
            <option value="">— choose a project —</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        )}

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
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Label</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {floors.map(f => (
                    <tr
                      key={f._id}
                      className={`transition-colors ${locFloor?._id === f._id ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                    >
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
                          <button
                            onClick={() => openLocations(f)}
                            title="View Locations"
                            className={`p-1.5 rounded-lg transition-colors ${locFloor?._id === f._id ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-500' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-orange-500'}`}
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditFloor(f)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => delFloor(f._id)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {floors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                        No floors yet. Add one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Locations panel */}
            {locFloor && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/60">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Locations — <span className="text-orange-500">{locFloor.label}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => { setLocForm(BLANK_LOC); setLocModal('add') }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {locations.map(l => (
                      <tr key={l._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {typeLabel(l.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openElements(l)}
                              title="Structural Elements"
                              className={`p-1.5 rounded-lg transition-colors ${elemLoc?._id === l._id ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-500' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500'}`}
                            >
                              <Layers className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setLocForm({ name: l.name, type: l.type }); setLocModal(l._id) }}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => delLocation(l._id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {locations.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                          No locations. Add one above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Elements panel */}
        {elemLoc && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/60">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Structural Elements — <span className="text-blue-500">{elemLoc.name}</span>
                </span>
              </div>
              <button
                onClick={() => { setElemForm(BLANK_ELEM); setElemModal('add') }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {elements.map(el => (
                  <tr key={el._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{el.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        {ELEM_LABEL[el.type] || el.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{el.order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/admin/elements/${el._id}/trades`)}
                          title="Manage Trades & Checklists"
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> Trades
                        </button>
                        <button
                          onClick={() => { setElemForm({ name: el.name, type: el.type, order: el.order }); setElemModal(el._id) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => delElement(el._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {elements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                      No structural elements. Add walls, columns, beams, etc. above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floor modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Floor' : 'Edit Floor'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Code *</label>
                <input
                  className={inputCls}
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="BSMT / G / 1 / TER"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Label *</label>
                <input
                  className={inputCls}
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Basement / Ground Floor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Order</label>
                <input
                  className={inputCls}
                  type="number"
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: +e.target.value }))}
                />
              </div>
              <div className="pb-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isProjectLevel}
                    onChange={e => setForm(f => ({ ...f, isProjectLevel: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">Project-level area</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveFloor}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
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
              <input
                className={inputCls}
                value={locForm.name}
                onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))}
                placeholder="8A / Lift Lobby / Terrace"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
              <select
                className={inputCls}
                value={locForm.type}
                onChange={e => setLocForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="APARTMENT">Apartment</option>
                <option value="COMMON_AREA">Common Area</option>
                <option value="PROJECT_LEVEL">Project Level</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setLocModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveLocation}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm transition"
              >
                Save
              </button>
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
              <input
                className={inputCls}
                value={elemForm.name}
                onChange={e => setElemForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. W-01, Col-A1, B-North"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
                <select
                  className={inputCls}
                  value={elemForm.type}
                  onChange={e => setElemForm(f => ({ ...f, type: e.target.value }))}
                >
                  {ELEM_TYPES.map(t => <option key={t} value={t}>{ELEM_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Order</label>
                <input
                  className={inputCls}
                  type="number"
                  value={elemForm.order}
                  onChange={e => setElemForm(f => ({ ...f, order: +e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setElemModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveElement}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold shadow-sm transition"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}
