import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import Modal from '../../components/common/Modal'
import FormModal from '../../components/ui/FormModal'
import InputField from '../../components/ui/InputField'
import {
  adminGetProjects, adminCreateProject, adminUpdateProject, adminDeleteProject, uploadPhoto,
  adminGetFloors,   adminCreateFloor,   adminUpdateFloor,   adminDeleteFloor,
  adminGetLocations,adminCreateLocation,adminUpdateLocation,adminDeleteLocation,
  adminGetElements, adminCreateElement, adminUpdateElement, adminDeleteElement,
  adminGetTrades,   adminGetTradeElementsByLocation,
  adminCreateTradeElement, adminDeleteTradeElement,
  adminGetCheckPoints, adminCreateCheckPoint, adminUpdateCheckPoint, adminDeleteCheckPoint,
} from '../../services/api'
import { useConfirm } from '../../context/ConfirmContext'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import {
  Building2, Layers, DoorOpen, ChevronRight, Plus, Pencil,
  Trash2, Check, X, ClipboardList, Zap, ListChecks,
  Camera, Info, ChevronDown, ChevronUp, Map, Upload, Eye, EyeOff, FileText, ExternalLink
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const ELEM_TYPES  = ['WALL','COLUMN','BEAM','SLAB','DOOR_WINDOW_FRAME','STAIRCASE','OTHER']
const ELEM_LABEL  = { WALL:'Wall', COLUMN:'Column', BEAM:'Beam', SLAB:'Slab', DOOR_WINDOW_FRAME:'Door/Window', STAIRCASE:'Staircase', OTHER:'Other' }
const TYPE_COLOR  = {
  WALL:  'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  COLUMN:'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  BEAM:  'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  SLAB:  'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  DOOR_WINDOW_FRAME:'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400',
  STAIRCASE:'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
  OTHER: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
}

const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition'
const sel = `${inp} cursor-pointer`
const btnPrimary = 'flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition'
const btnGhost   = 'flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold rounded-lg transition'

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function Crumb({ steps, onGo }) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap mb-5">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />}
          <button
            onClick={() => i < steps.length - 1 && onGo(i)}
            className={i === steps.length - 1
              ? 'font-bold text-gray-900 dark:text-white cursor-default text-sm'
              : 'text-orange-500 hover:underline font-medium text-sm'}
          >{s}</button>
        </span>
      ))}
    </nav>
  )
}

// ── Inline editable row ───────────────────────────────────────────────────────
function InlineRow({ item, fields, onSave, onDelete, label, icon: Icon, color, extraContent, isAdmin = true }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const confirm = useConfirm()

  const startEdit = () => { setForm(fields.reduce((a, f) => ({ ...a, [f.key]: item[f.key] ?? '' }), {})); setEditing(true) }
  const cancel = () => setEditing(false)

  const save = async () => {
    setSaving(true)
    try { await onSave(item._id, form); setEditing(false) }
    catch { toast.error('Save failed.') }
    finally { setSaving(false) }
  }

  const del = async () => {
    const ok = await confirm(`Delete "${label}"?`, 'This cannot be undone.')
    if (!ok) return
    try { await onDelete(item._id) }
    catch { toast.error('Delete failed.') }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl transition-all">
      {editing && (
        <FormModal title={`Edit ${label}`} onClose={cancel} onSave={save} saving={saving}>
          {fields.map(f => (
            f.type === 'select'
              ? <div key={f.key}><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{f.label}</label>
                  <select className={sel} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              : f.type === 'checkbox'
                ? <div key={f.key} className="flex items-center gap-2"><input type="checkbox" className="accent-orange-500" checked={!!form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))} /><label className="text-sm text-gray-700 dark:text-gray-300">{f.label}</label></div>
                : <div key={f.key}><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{f.label}</label>
                    <input className={inp} value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && save()} />
                  </div>
          ))}
        </FormModal>
      )}
      <div className="flex items-center gap-3 px-3 py-2.5 group">
          {color && <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${color}`}>{ELEM_LABEL[item.type] || item.type}</span>}
          {Icon && !color && <Icon className="w-4 h-4 text-orange-400 flex-shrink-0" />}
          <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
          {extraContent}
          {isAdmin && (
            <div className="flex gap-1 transition-opacity">
              <button onClick={startEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={del}       className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
    </div>
  )
}

// ── Inline add row ────────────────────────────────────────────────────────────
function AddRow({ fields, onAdd, placeholder }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const add = async () => {
    setSaving(true)
    try { await onAdd(form); setOpen(false); setForm({}) }
    catch { toast.error('Failed to add.') }
    finally { setSaving(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-400 hover:text-orange-500 hover:border-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors">
      <Plus className="w-4 h-4" /> {placeholder}
    </button>
  )
  return (
    <div className="border border-orange-300 dark:border-orange-500/50 rounded-xl p-3 bg-orange-50/30 dark:bg-orange-500/5 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map(f => (
          f.type === 'select'
            ? <div key={f.key}><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{f.label}</label>
                <select className={sel} value={form[f.key] ?? f.default ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            : f.type === 'checkbox'
              ? <div key={f.key} className="flex items-center gap-2 pt-5"><input type="checkbox" className="accent-orange-500" checked={!!form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))} /><label className="text-sm text-gray-700 dark:text-gray-300">{f.label}</label></div>
              : <div key={f.key}><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{f.label}</label>
                  <input className={inp} placeholder={f.placeholder} value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && add()} autoFocus={f.autoFocus} />
                </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={add} disabled={saving} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition">{saving ? 'Saving…' : 'Add'}</button>
        <button onClick={() => { setOpen(false); setForm({}) }} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-500 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
      </div>
    </div>
  )
}

// ── Checkpoint editor ─────────────────────────────────────────────────────────
function CheckpointPanel({ tradeId, projectId, projectName, tradeName }) {
  const confirm = useConfirm()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isGlobal, setIsGlobal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPhoto, setEditPhoto] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminGetCheckPoints(tradeId, projectId)
      setIsGlobal(res.data.some(cp => !cp.projectId))
      setItems(res.data)
    } finally { setLoading(false) }
  }, [tradeId, projectId])

  useEffect(() => { load() }, [load])

  const startEdit = (cp) => { setEditingId(cp._id); setEditTitle(cp.title); setEditPhoto(cp.photoRequired) }

  const saveEdit = async (id) => {
    if (!editTitle.trim()) return
    setSaving(true)
    try { await adminUpdateCheckPoint(id, { title: editTitle.trim(), photoRequired: editPhoto }); setEditingId(null); await load(); toast.success('Updated.') }
    catch { toast.error('Failed.') }
    finally { setSaving(false) }
  }

  const del = async (id, title) => {
    const ok = await confirm(`Remove "${title}"?`)
    if (!ok) return
    try { await adminDeleteCheckPoint(id); setItems(p => p.filter(c => c._id !== id)); toast.success('Removed.') }
    catch { toast.error('Failed.') }
  }

  if (loading) return <div className="py-6 text-center text-xs text-gray-400">Loading…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{tradeName}</p>
          <p className="text-[11px] mt-0.5">
            {isGlobal
              ? <span className="text-amber-500 flex items-center gap-1"><Info className="w-3 h-3"/>Showing shared items (no project list yet)</span>
              : <span className="text-orange-500 font-semibold">{projectName} · {items.length} items</span>}
          </p>
        </div>
      </div>

      <ol className="space-y-1.5 mb-3">
        {items.map((cp, idx) => (
          <li key={cp._id} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40 group/cp hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors">
            <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 text-[11px] font-bold">{idx + 1}</span>
            {editingId === cp._id ? (
              <>
                <input className={`${inp} flex-1 py-1`} value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit(cp._id)} autoFocus />
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={editPhoto} onChange={e => setEditPhoto(e.target.checked)} className="accent-orange-500" /><Camera className="w-3 h-3"/></label>
                <button onClick={() => saveEdit(cp._id)} disabled={saving} className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition"><Check className="w-3 h-3"/></button>
                <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 transition"><X className="w-3 h-3"/></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">{cp.title}</span>
                {cp.photoRequired && <Camera className="w-3.5 h-3.5 text-blue-400 flex-shrink-0"/>}
                <div className="flex gap-1">
                  <button onClick={() => startEdit(cp)} className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"><Pencil className="w-3 h-3"/></button>
                  <button onClick={() => del(cp._id, cp.title)} className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"><Trash2 className="w-3 h-3"/></button>
                </div>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No checklist items yet.</p>}
      </ol>

      {/* Add item */}
      <AddRow
        placeholder="Add checklist item"
        fields={[
          { key: 'title', label: 'Item name', placeholder: 'e.g. Column Steel Binding', autoFocus: true },
          { key: 'photoRequired', label: 'Photo required', type: 'checkbox' },
        ]}
        onAdd={async (form) => {
          if (!form.title?.trim()) { toast.error('Item name required.'); throw new Error() }
          await adminCreateCheckPoint({ tradeId, projectId, title: form.title.trim(), photoRequired: !!form.photoRequired, order: items.length + 1, standard: '' })
          await load()
          toast.success('Item added.')
        }}
      />
    </div>
  )
}

// ── Room Detail (3rd level) ───────────────────────────────────────────────────
function RoomDetail({ project, room, allTrades, isAdmin }) {
  const confirm = useConfirm()
  const [tab, setTab] = useState('elements')
  const [elements, setElements] = useState([])
  const [tradeElements, setTradeElements] = useState([])
  const [activeChecklist, setActiveChecklist] = useState(null)
  const [bulkTrade, setBulkTrade] = useState('')
  const [bulking, setBulking] = useState(false)
  const [expandedTE, setExpandedTE] = useState({})

  const [elemModal, setElemModal] = useState(false)
  const [elemForm, setElemForm] = useState({ name: '', type: 'WALL', order: '' })

  const saveElement = async () => {
    if (!elemForm.name.trim()) return toast.error('Name required.')
    await adminCreateElement({ 
      name: elemForm.name.trim(), 
      type: elemForm.type || 'WALL', 
      order: Number(elemForm.order) || elements.length + 1, 
      locationId: room._id, 
      floorId: room.floorId, 
      projectId: project._id 
    })
    await loadRoom(); setElemModal(false); toast.success('Element added.')
  }

  const loadRoom = useCallback(async () => {
    const [elRes, teRes] = await Promise.all([
      adminGetElements(room._id),
      adminGetTradeElementsByLocation(room._id),
    ])
    setElements(elRes.data)
    setTradeElements(teRes.data)
  }, [room._id])

  useEffect(() => { loadRoom() }, [loadRoom])

  const assignedTrades = allTrades.filter(t =>
    tradeElements.some(te => String(te.tradeId?._id || te.tradeId) === String(t._id))
  )

  const typeSummary = (tid) => {
    const elems = tradeElements.filter(te => String(te.tradeId?._id || te.tradeId) === String(tid))
    const counts = {}
    elems.forEach(te => { const ty = te.elementId?.type || 'OTHER'; counts[ty] = (counts[ty] || 0) + 1 })
    return Object.entries(counts).map(([t, n]) => `${n} ${ELEM_LABEL[t] || t}`).join(', ') || 'No elements'
  }

  const unassignedCount = bulkTrade
    ? elements.filter(el => !tradeElements.some(te => String(te.elementId?._id || te.elementId) === String(el._id) && String(te.tradeId?._id || te.tradeId) === String(bulkTrade))).length
    : 0

  const bulkAssign = async () => {
    if (!bulkTrade || unassignedCount === 0) return
    const unassigned = elements.filter(el => !tradeElements.some(te => String(te.elementId?._id || te.elementId) === String(el._id) && String(te.tradeId?._id || te.tradeId) === String(bulkTrade)))
    setBulking(true)
    try {
      await Promise.all(unassigned.map(el => adminCreateTradeElement({ tradeId: bulkTrade, elementId: el._id })))
      await loadRoom(); setBulkTrade('')
      toast.success(`Assigned to ${unassigned.length} elements.`)
    } catch { toast.error('Some assignments failed.') }
    finally { setBulking(false) }
  }

  const removeTE = async (id) => {
    const ok = await confirm('Remove this checklist from the element?')
    if (!ok) return
    try { await adminDeleteTradeElement(id); setTradeElements(p => p.filter(te => te._id !== id)); toast.success('Removed.') }
    catch { toast.error('Failed.') }
  }

  const removeAllTE = async (trade) => {
    const teForTrade = tradeElements.filter(te => String(te.tradeId?._id || te.tradeId) === String(trade._id))
    const ok = await confirm(`Remove "${trade.name}" from all ${teForTrade.length} elements in this room?`, 'This cannot be undone.')
    if (!ok) return
    try {
      await Promise.all(teForTrade.map(te => adminDeleteTradeElement(te._id)))
      setTradeElements(p => p.filter(te => String(te.tradeId?._id || te.tradeId) !== String(trade._id)))
      if (activeChecklist?._id === trade._id) setActiveChecklist(null)
      toast.success(`"${trade.name}" removed from all elements.`)
    } catch { toast.error('Some removals failed.') }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          {[['elements','Structural Elements'],['checklists','Checklists & Checkpoints']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === key ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        {isAdmin && tab === 'elements' && (
          <button onClick={() => { setElemForm({ name: '', type: 'WALL', order: '' }); setElemModal(true) }} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-sm transition">
            <Plus className="w-4 h-4" /> Add Element
          </button>
        )}
      </div>

      {/* ── ELEMENTS TAB ─────────────────────────────────── */}
      {tab === 'elements' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Structural Elements · {elements.length}</p>
          </div>
          {elements.map(el => (
            <InlineRow
              key={el._id}
              item={el}
              label={el.name}
              isAdmin={isAdmin}
              color={TYPE_COLOR[el.type] || TYPE_COLOR.OTHER}
              fields={[
                { key: 'name', label: 'Element Name', placeholder: 'e.g. C 001' },
                { key: 'type', label: 'Type', type: 'select', options: ELEM_TYPES.map(t => ({ value: t, label: ELEM_LABEL[t] })) },
                { key: 'order', label: 'Order', placeholder: '1' },
              ]}
              onSave={async (id, form) => {
                await adminUpdateElement(id, { ...form, locationId: room._id })
                await loadRoom(); toast.success('Element updated.')
              }}
              onDelete={async (id) => {
                await adminDeleteElement(id); await loadRoom(); toast.success('Deleted.')
              }}
            />
          ))}
          {elements.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">No elements added yet.</p>}

          {elemModal && (
            <FormModal title="Add Element" onClose={() => setElemModal(false)} onSave={saveElement}>
              <InputField label="Element Name" required value={elemForm.name} onChange={e => setElemForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. C 001" />
              <InputField label="Type" required as="select" value={elemForm.type} onChange={e => setElemForm(f => ({ ...f, type: e.target.value }))}>
                {ELEM_TYPES.map(t => <option key={t} value={t}>{ELEM_LABEL[t]}</option>)}
              </InputField>
              <InputField label="Order" type="number" value={elemForm.order} onChange={e => setElemForm(f => ({ ...f, order: e.target.value }))} placeholder="1" />
            </FormModal>
          )}
        </div>
      )}

      {/* ── CHECKLISTS TAB ───────────────────────────────── */}
      {tab === 'checklists' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left: assign + list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Bulk assign */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl p-4">
              <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5"/> Assign to All {elements.length} Elements
              </p>
              <select className={sel} value={bulkTrade} onChange={e => setBulkTrade(e.target.value)}>
                <option value="">— select checklist —</option>
                {allTrades.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              {bulkTrade && unassignedCount === 0
                ? <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5"/>Already assigned to all elements.</p>
                : <button onClick={bulkAssign} disabled={!bulkTrade || bulking} className="mt-2 w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-2">
                    <Zap className="w-3.5 h-3.5"/>
                    {bulking ? 'Assigning…' : bulkTrade ? `Assign to ${unassignedCount} element(s)` : 'Select checklist above'}
                  </button>
              }
            </div>

            {/* Assigned list */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-orange-400"/>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Assigned Checklists</span>
                <span className="ml-auto text-[10px] text-gray-400">{assignedTrades.length}</span>
              </div>
              {assignedTrades.length === 0
                ? <p className="px-4 py-6 text-xs text-gray-400 text-center">None assigned yet. Use bulk assign above.</p>
                : <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {assignedTrades.map(trade => {
                      const isActive = activeChecklist?._id === trade._id
                      const teForTrade = tradeElements.filter(te => String(te.tradeId?._id || te.tradeId) === String(trade._id))
                      const isExp = expandedTE[trade._id]
                      return (
                        <div key={trade._id}>
                          <div onClick={() => setActiveChecklist(isActive ? null : trade)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-orange-500' : 'bg-orange-100 dark:bg-orange-500/20'}`}>
                              <ClipboardList className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-orange-500'}`}/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>{trade.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{typeSummary(trade._id)}</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); removeAllTE(trade) }}
                              title="Remove from all elements"
                              className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition flex-shrink-0">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                          {isExp && (
                            <div className="px-3 pb-2 space-y-0.5 bg-gray-50/50 dark:bg-gray-700/20 max-h-36 overflow-y-auto">
                              {teForTrade.map(te => (
                                <div key={te._id} className="flex items-center gap-2 py-0.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${TYPE_COLOR[te.elementId?.type] || TYPE_COLOR.OTHER}`}>{ELEM_LABEL[te.elementId?.type] || '?'}</span>
                                  <span className="text-[11px] text-gray-700 dark:text-gray-300 flex-1">{te.elementId?.name}</span>
                                  <button onClick={() => removeTE(te._id)} className="p-0.5 text-gray-300 hover:text-red-400 transition"><X className="w-3 h-3"/></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
              }
            </div>
          </div>

          {/* Right: checkpoint editor */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 min-h-[280px]">
            {activeChecklist
              ? <CheckpointPanel key={`${activeChecklist._id}-${project._id}`} tradeId={activeChecklist._id} projectId={project._id} projectName={project.name} tradeName={activeChecklist.name}/>
              : <div className="flex flex-col items-center justify-center h-full py-12 text-gray-300 dark:text-gray-600">
                  <ListChecks className="w-10 h-10 mb-2"/>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 text-center">
                    {assignedTrades.length > 0 ? 'Click a checklist on the left to edit its items' : 'Assign a checklist first, then click it to edit its items'}
                  </p>
                </div>
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SiteManager() {
  const [searchParams, setSearchParams] = useSearchParams()
  const confirm = useConfirm()
  const { user } = useAuth()
  
  const roles = Array.isArray(user?.role) ? user.role : [user?.role || '']
  const isAdmin = roles.some(r => {
    const roleName = typeof r === 'string' ? r : (r?.name || '')
    return roleName.toUpperCase().includes('ADMIN')
  })

  const pId = searchParams.get('p') || ''
  const fId = searchParams.get('f') || ''
  const rId = searchParams.get('r') || ''

  const [projects,  setProjects]  = useState([])
  const [floors,    setFloors]    = useState([])
  const [rooms,     setRooms]     = useState([])
  const [allTrades, setAllTrades] = useState([])

  const [project, setProject] = useState(null)
  const [floor,   setFloor]   = useState(null)
  const [room,    setRoom]    = useState(null)

  // Project CRUD & Maps
  const [projModal, setProjModal] = useState(null)
  const [projForm, setProjForm] = useState({ name: '', type: 'RESIDENTIAL', description: '' })
  const [savingProj, setSavingProj] = useState(false)
  const [projError, setProjError] = useState('')

  const [mapProject, setMapProject] = useState(null)
  const [mapUploading, setMapUploading] = useState(false)
  const [mapPreview, setMapPreview] = useState(null)
  const [mapIsNewPdf, setMapIsNewPdf] = useState(false)
  const mapFileRef = useRef(null)

  // Floor Maps
  const [floorMapFloor, setFloorMapFloor] = useState(null)
  const [floorMapPreview, setFloorMapPreview] = useState(null)
  const [floorMapUploading, setFloorMapUploading] = useState(false)
  const [floorMapIsNewPdf, setFloorMapIsNewPdf] = useState(false)
  const floorMapFileRef = useRef(null)

  // Modals for Floor & Room
  const [floorModal, setFloorModal] = useState(false)
  const [floorForm, setFloorForm] = useState({ code: '', label: '', order: '' })

  const [roomModal, setRoomModal] = useState(false)
  const [roomForm, setRoomForm] = useState({ name: '', type: 'APARTMENT' })

  const saveFloor = async () => {
    if (!floorForm.code.trim() || !floorForm.label.trim()) return toast.error('Code and label required.')
    await adminCreateFloor({ code: floorForm.code.trim(), label: floorForm.label.trim(), order: Number(floorForm.order) || floors.length + 1, projectId: pId })
    loadFloors(); setFloorModal(false); toast.success('Floor added.')
  }

  const saveRoom = async () => {
    if (!roomForm.name.trim()) return toast.error('Room name required.')
    await adminCreateLocation({ name: roomForm.name.trim(), floorId: fId, projectId: pId, type: roomForm.type || 'APARTMENT' })
    loadRooms(); setRoomModal(false); toast.success('Room added.')
  }

  // Project CRUD
  const openAddProj = () => { setProjForm({ name: '', type: 'RESIDENTIAL', description: '' }); setProjError(''); setProjModal('add') }
  const openEditProj = p => { setProjForm({ name: p.name, type: p.type, description: p.description || '' }); setProjError(''); setProjModal(p._id) }

  const saveProject = async () => {
    if (!projForm.name.trim()) return setProjError('Name is required.')
    setSavingProj(true); setProjError('')
    try {
      projModal === 'add' ? await adminCreateProject(projForm) : await adminUpdateProject(projModal, projForm)
      setProjModal(null)
      const r = await adminGetProjects()
      setProjects(r.data)
      toast.success(projModal === 'add' ? 'Project created' : 'Project updated')
    } catch (e) { setProjError(e.response?.data?.message || 'Save failed.') }
    finally { setSavingProj(false) }
  }

  const toggleHideProject = async (p) => {
    await adminUpdateProject(p._id, { isHidden: !p.isHidden })
    setProjects(prev => prev.map(x => x._id === p._id ? { ...x, isHidden: !x.isHidden } : x))
    toast.success(p.isHidden ? 'Project visible' : 'Project hidden')
  }

  const delProject = async id => {
    const ok = await confirm('Delete this project?', 'This will permanently remove all floors, locations, and inspections linked to it.')
    if (!ok) return
    await adminDeleteProject(id)
    setProjects(prev => prev.filter(p => p._id !== id))
    toast.success('Project deleted')
  }

  // Project Map Upload
  const uploadProjMap = async () => {
    const file = mapFileRef.current?.files?.[0]
    if (!file) return
    setMapUploading(true)
    try {
      const fd = new FormData(); fd.append('photo', file)
      const { data } = await uploadPhoto(fd)
      await adminUpdateProject(mapProject._id, { mapImage: data.url })
      setProjects(prev => prev.map(p => p._id === mapProject._id ? { ...p, mapImage: data.url } : p))
      setMapProject(prev => ({ ...prev, mapImage: data.url }))
      setMapPreview(null); setMapIsNewPdf(false)
      if (mapFileRef.current) mapFileRef.current.value = ''
      toast.success('Project map uploaded')
      setMapProject(null)
    } catch { toast.error('Upload failed. Try again.') }
    finally { setMapUploading(false) }
  }

  const removeProjMap = async () => {
    const ok = await confirm('Remove project map?')
    if (!ok) return
    await adminUpdateProject(mapProject._id, { mapImage: '' })
    setProjects(prev => prev.map(p => p._id === mapProject._id ? { ...p, mapImage: '' } : p))
    setMapProject(prev => ({ ...prev, mapImage: '' }))
    toast.success('Map removed')
  }

  // Floor Map Upload
  const uploadFloorMap = async () => {
    const file = floorMapFileRef.current?.files?.[0]
    if (!file) return
    setFloorMapUploading(true)
    try {
      const fd = new FormData(); fd.append('photo', file)
      const { data } = await uploadPhoto(fd)
      await adminUpdateFloor(floorMapFloor._id, { mapImage: data.url })
      setFloors(prev => prev.map(f => f._id === floorMapFloor._id ? { ...f, mapImage: data.url } : f))
      setFloorMapFloor(prev => ({ ...prev, mapImage: data.url }))
      setFloorMapPreview(null); setFloorMapIsNewPdf(false)
      if (floorMapFileRef.current) floorMapFileRef.current.value = ''
      toast.success('Floor map uploaded')
      setFloorMapFloor(null)
    } catch { toast.error('Upload failed. Try again.') }
    finally { setFloorMapUploading(false) }
  }

  const removeFloorMap = async () => {
    const ok = await confirm('Remove this floor map?')
    if (!ok) return
    await adminUpdateFloor(floorMapFloor._id, { mapImage: '' })
    setFloors(prev => prev.map(f => f._id === floorMapFloor._id ? { ...f, mapImage: '' } : f))
    setFloorMapFloor(prev => ({ ...prev, mapImage: '' }))
    toast.success('Map removed')
  }

  // Navigate helpers (URL-based)
  const go = (params) => setSearchParams(params, { replace: true })
  const goProject = (p) => { setProject(p); setFloor(null); setRoom(null); go({ p: p._id }) }
  const goFloor   = (f) => { setFloor(f);   setRoom(null);  go({ p: pId, f: f._id }) }
  const goRoom    = (r) => { setRoom(r);                    go({ p: pId, f: fId, r: r._id }) }
  const goBack    = (level) => {
    if (level === 0) go({})
    else if (level === 1) { setFloor(null); setRoom(null); go({ p: pId }) }
    else if (level === 2) { setRoom(null); go({ p: pId, f: fId }) }
  }

  // Load projects + trades once
  useEffect(() => {
    adminGetProjects().then(r => setProjects(r.data))
    adminGetTrades().then(r => setAllTrades(r.data.filter(t => !t.isHidden)))
  }, [])

  // Restore state from URL on load / param change
  useEffect(() => {
    if (!pId) { setProject(null); setFloor(null); setRoom(null); return }
    adminGetProjects().then(r => {
      const p = r.data.find(x => x._id === pId)
      setProject(p || null)
      if (!p || !fId) { setFloor(null); setRoom(null); return }
      adminGetFloors(pId).then(fr => {
        setFloors(fr.data)
        const f = fr.data.find(x => x._id === fId)
        setFloor(f || null)
        if (!f || !rId) { setRoom(null); return }
        adminGetLocations(fId).then(lr => {
          setRooms(lr.data)
          setRoom(lr.data.find(x => x._id === rId) || null)
        })
      })
    })
  }, []) // only on mount — URL params restore initial state

  // Load floors when project changes
  const loadFloors = useCallback(() => {
    if (!pId) return
    adminGetFloors(pId).then(r => setFloors(r.data))
  }, [pId])
  useEffect(() => { if (pId) loadFloors() }, [pId])

  // Load rooms when floor changes
  const loadRooms = useCallback(() => {
    if (!fId) return
    adminGetLocations(fId).then(r => setRooms(r.data))
  }, [fId])
  useEffect(() => { if (fId) loadRooms() }, [fId])

  const step = rId ? 3 : fId ? 2 : pId ? 1 : 0

  const crumbs = ['All Projects', project?.name, floor?.label, room?.name].slice(0, step + 1).filter(Boolean)

  const card = (active) =>
    `group relative flex flex-col gap-1 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
      active ? 'border-orange-400 bg-orange-50 dark:bg-orange-500/10 shadow-md'
             : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5'}`

  return (
    <AdminLayout>
      <div className="space-y-2">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Site Manager</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Project → Floor → Room → Elements & Checklists → Checkpoint Items
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && step === 0 && (
              <button onClick={openAddProj} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-sm transition">
                <Plus className="w-4 h-4" /> Add Project
              </button>
            )}
            {isAdmin && step === 1 && (
              <button onClick={() => { setFloorForm({ code: '', label: '', order: '' }); setFloorModal(true) }} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-sm transition">
                <Plus className="w-4 h-4" /> Add Floor
              </button>
            )}
            {isAdmin && step === 2 && (
              <button onClick={() => { setRoomForm({ name: '', type: 'APARTMENT' }); setRoomModal(true) }} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-sm transition">
                <Plus className="w-4 h-4" /> Add Room
              </button>
            )}
          </div>
        </div>

        {step > 0 && <Crumb steps={crumbs} onGo={goBack} />}

        {/* ── STEP 0: Projects ──────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Description</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {projects.map(p => (
                    <tr key={p._id} onClick={() => goProject(p)} className={`hover:bg-gray-50/50 dark:hover:bg-gray-700/20 cursor-pointer transition ${p.isHidden ? 'opacity-50 grayscale' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4 text-orange-500"/></div>
                          <span className={`font-bold text-gray-900 dark:text-white ${p.isHidden ? 'line-through' : ''}`}>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">{p.description || p.location || '—'}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setMapProject(p); setMapPreview(null) }} title="Project Map" className={`p-1.5 rounded-lg transition-colors ${p.mapImage ? 'text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10' : 'text-gray-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10'}`}><Map className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); openEditProj(p) }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); toggleHideProject(p) }} title={p.isHidden ? 'Show' : 'Hide'} className={`p-1.5 rounded-lg transition-colors ${p.isHidden ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}>{p.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                            <button onClick={(e) => { e.stopPropagation(); delProject(p._id) }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {projects.length === 0 && <div className="p-8 text-center text-sm text-gray-400">No projects yet.</div>}
            </div>
          </>
        )}

        {/* ── STEP 1: Floors ────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-orange-400"/> Floors · {floors.length}</p>
            <div className="space-y-2">
              {floors.map(f => (
                <InlineRow
                  key={f._id}
                  item={f}
                  label={f.label}
                  isAdmin={isAdmin}
                  icon={Layers}
                  fields={[
                    { key: 'code', label: 'Code', placeholder: 'e.g. BSMT' },
                    { key: 'label', label: 'Label', placeholder: 'e.g. Basement' },
                    { key: 'order', label: 'Order', placeholder: '1' },
                    { key: 'isProjectLevel', label: 'Project-level floor', type: 'checkbox' },
                  ]}
                  onSave={async (id, form) => {
                    await adminUpdateFloor(id, { ...form, projectId: pId })
                    loadFloors(); toast.success('Floor updated.')
                  }}
                  onDelete={async (id) => {
                    await adminDeleteFloor(id); loadFloors(); toast.success('Floor deleted.')
                  }}
                  extraContent={
                    <div className="flex items-center gap-1 mr-1">
                      {isAdmin && (
                        <button onClick={e => { e.stopPropagation(); setFloorMapFloor(f); setFloorMapPreview(null) }} title="Floor Map" className={`p-1.5 rounded-lg transition-colors ${f.mapImage ? 'text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-teal-500'}`}>
                          <Map className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); goFloor(f) }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 text-[11px] font-bold hover:bg-orange-100 dark:hover:bg-orange-500/20 transition">
                        Open <ChevronRight className="w-3 h-3"/>
                      </button>
                    </div>
                  }
                />
              ))}
              {floors.length === 0 && <p className="text-xs text-gray-400 p-2">No floors added yet.</p>}
            </div>
          </>
        )}

        {/* ── STEP 2: Rooms ─────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><DoorOpen className="w-3.5 h-3.5 text-orange-400"/> Rooms / Areas · {rooms.length}</p>
            <div className="space-y-2">
              {rooms.map(r => (
                <InlineRow
                  key={r._id}
                  item={r}
                  label={r.name}
                  isAdmin={isAdmin}
                  icon={DoorOpen}
                  fields={[
                    { key: 'name', label: 'Room Name', placeholder: 'e.g. Entire Floor (General)' },
                    { key: 'type', label: 'Type', placeholder: 'e.g. APARTMENT' },
                  ]}
                  onSave={async (id, form) => {
                    await adminUpdateLocation(id, { ...form, floorId: fId, projectId: pId })
                    loadRooms(); toast.success('Room updated.')
                  }}
                  onDelete={async (id) => {
                    await adminDeleteLocation(id); loadRooms(); toast.success('Room deleted.')
                  }}
                  extraContent={
                    <button onClick={e => { e.stopPropagation(); goRoom(r) }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 text-[11px] font-bold hover:bg-orange-100 dark:hover:bg-orange-500/20 transition mr-1">
                      Open <ChevronRight className="w-3 h-3"/>
                    </button>
                  }
                />
              ))}
              {rooms.length === 0 && <p className="text-xs text-gray-400 p-2">No rooms added yet.</p>}
            </div>
          </>
        )}

        {/* ── STEP 3: Room Detail ───────────────────────────────────────── */}
        {step === 3 && room && project && (
          <RoomDetail project={project} room={{ ...room, floorId: fId }} allTrades={allTrades} isAdmin={isAdmin} />
        )}

      </div>

      {/* Project Add/Edit Modal */}
      {projModal && (
        <FormModal title={projModal === 'add' ? 'Add Project' : 'Edit Project'} onClose={() => setProjModal(null)} onSave={saveProject} saving={savingProj} error={projError}>
          <InputField label="Project Name" required value={projForm.name} onChange={e => setProjForm(f => ({ ...f, name: e.target.value }))} placeholder="Nature Park Tower" />
          <InputField label="Type" required as="select" value={projForm.type} onChange={e => setProjForm(f => ({ ...f, type: e.target.value }))}>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL_HOSPITALITY">Commercial / Hospitality</option>
          </InputField>
          <InputField label="Description" value={projForm.description} onChange={e => setProjForm(f => ({ ...f, description: e.target.value }))} placeholder="Floors, units summary…" />
        </FormModal>
      )}

      {/* Floor Add Modal */}
      {floorModal && (
        <FormModal title="Add Floor" onClose={() => setFloorModal(false)} onSave={saveFloor}>
          <InputField label="Floor Code" required value={floorForm.code} onChange={e => setFloorForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. BSMT" />
          <InputField label="Floor Label" required value={floorForm.label} onChange={e => setFloorForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Basement" />
          <InputField label="Order" type="number" value={floorForm.order} onChange={e => setFloorForm(f => ({ ...f, order: e.target.value }))} placeholder="1" />
        </FormModal>
      )}

      {/* Room Add Modal */}
      {roomModal && (
        <FormModal title="Add Room / Area" onClose={() => setRoomModal(false)} onSave={saveRoom}>
          <InputField label="Room Name" required value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Room 101" />
          <InputField label="Type" value={roomForm.type} onChange={e => setRoomForm(f => ({ ...f, type: e.target.value }))} placeholder="e.g. APARTMENT" />
        </FormModal>
      )}

      {/* Project Map Drawer */}
      {mapProject && (
        <Modal
          title="Site Map"
          onClose={() => setMapProject(null)}
          footer={
            <div className="flex items-center gap-2">
              <button onClick={uploadProjMap} disabled={!mapPreview || mapUploading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {mapUploading ? 'Uploading…' : 'Save Map'}
              </button>
              {mapProject.mapImage && !mapPreview && (
                <button onClick={removeProjMap} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-semibold transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
              {mapPreview && (
                <button onClick={() => { setMapPreview(null); setMapIsNewPdf(false); if (mapFileRef.current) mapFileRef.current.value = '' }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0"><Map className="w-4 h-4 text-teal-500" /></div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{mapProject.name}</p>
            </div>
            {(() => {
              const src = mapPreview || mapProject.mapImage
              const isPdf = mapPreview ? mapIsNewPdf : (mapProject.mapImage?.toLowerCase().includes('.pdf') || mapProject.mapImage?.includes('/raw/upload/'))
              if (src && isPdf) return (
                <div className="relative flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-500/30 flex items-center justify-center flex-shrink-0 shadow-sm"><FileText className="w-6 h-6 text-red-500" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">PDF Document</p><p className="text-[11px] text-gray-400 mt-0.5">Site map / floor plan</p>
                    {!mapPreview && <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"><ExternalLink className="w-3 h-3" /> Open PDF</a>}
                  </div>
                  {mapPreview && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">New</span>}
                </div>
              )
              if (src) return (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <img src={src} alt="Map" className="w-full max-h-56 object-contain" />
                  {mapPreview && <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">New</div>}
                </div>
              )
              return (
                <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3"><Map className="w-5 h-5 text-gray-400" /></div>
                  <p className="text-sm font-medium text-gray-400">No map uploaded yet</p>
                </div>
              )
            })()}
            <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors"><Upload className="w-4 h-4 text-orange-500" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{mapProject.mapImage ? 'Replace map' : 'Upload map'}</p><p className="text-[11px] text-gray-400 truncate">JPG, PNG, WebP or PDF</p></div>
              <input ref={mapFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => {
                const file = e.target.files?.[0]; if (!file) return; setMapPreview(URL.createObjectURL(file)); setMapIsNewPdf(file.type === 'application/pdf')
              }} />
            </label>
          </div>
        </Modal>
      )}

      {/* Floor Map Drawer */}
      {floorMapFloor && (
        <Modal
          title="Floor Map"
          onClose={() => setFloorMapFloor(null)}
          footer={
            <div className="flex items-center gap-2">
              <button onClick={uploadFloorMap} disabled={!floorMapPreview || floorMapUploading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {floorMapUploading ? 'Uploading…' : 'Save Map'}
              </button>
              {floorMapFloor.mapImage && !floorMapPreview && (
                <button onClick={removeFloorMap} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-semibold transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
              {floorMapPreview && (
                <button onClick={() => { setFloorMapPreview(null); setFloorMapIsNewPdf(false); if (floorMapFileRef.current) floorMapFileRef.current.value = '' }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0"><Map className="w-4 h-4 text-teal-500" /></div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{floorMapFloor.label}</p>
            </div>
            {(() => {
              const src = floorMapPreview || floorMapFloor.mapImage
              const isPdf = floorMapPreview ? floorMapIsNewPdf : (floorMapFloor.mapImage?.toLowerCase().includes('.pdf') || floorMapFloor.mapImage?.includes('/raw/upload/'))
              if (src && isPdf) return (
                <div className="relative flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-500/30 flex items-center justify-center flex-shrink-0 shadow-sm"><FileText className="w-6 h-6 text-red-500" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">PDF Document</p><p className="text-[11px] text-gray-400 mt-0.5">Floor plan</p>
                    {!floorMapPreview && <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"><ExternalLink className="w-3 h-3" /> Open PDF</a>}
                  </div>
                  {floorMapPreview && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">New</span>}
                </div>
              )
              if (src) return (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <img src={src} alt="Map" className="w-full max-h-56 object-contain" />
                  {floorMapPreview && <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">New</div>}
                </div>
              )
              return (
                <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3"><Map className="w-5 h-5 text-gray-400" /></div>
                  <p className="text-sm font-medium text-gray-400">No map uploaded yet</p>
                </div>
              )
            })()}
            <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors"><Upload className="w-4 h-4 text-orange-500" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{floorMapFloor.mapImage ? 'Replace map' : 'Upload map'}</p><p className="text-[11px] text-gray-400 truncate">JPG, PNG, WebP or PDF</p></div>
              <input ref={floorMapFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => {
                const file = e.target.files?.[0]; if (!file) return; setFloorMapPreview(URL.createObjectURL(file)); setFloorMapIsNewPdf(file.type === 'application/pdf')
              }} />
            </label>
          </div>
        </Modal>
      )}

    </AdminLayout>
  )
}
