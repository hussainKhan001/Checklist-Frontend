import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import FormModal from '../../components/ui/FormModal'
import Modal from '../../components/common/Modal'
import InputField from '../../components/ui/InputField'
import Badge from '../../components/ui/Badge'
import { adminGetProjects, adminCreateProject, adminUpdateProject, adminDeleteProject, uploadPhoto } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Layers, Pencil, Trash2, Eye, EyeOff, Map, Upload, FileText, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const BLANK = { name: '', type: 'RESIDENTIAL', description: '' }

const TYPE_VARIANT = { RESIDENTIAL: 'blue', COMMERCIAL_HOSPITALITY: 'purple' }
const TYPE_LABEL   = { RESIDENTIAL: 'Residential', COMMERCIAL_HOSPITALITY: 'Commercial' }

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Map upload state
  const [mapProject, setMapProject]   = useState(null)  // project being mapped
  const [mapUploading, setMapUploading] = useState(false)
  const [mapPreview, setMapPreview]   = useState(null)   // local preview before upload
  const [mapIsNewPdf, setMapIsNewPdf] = useState(false)
  const mapFileRef = useRef(null)
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { hasPermission } = useAuth()
  const isAdmin = hasPermission('manage_projects')

  const load = () => adminGetProjects().then(r => setProjects(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openAdd  = () => { setForm(BLANK); setError(''); setModal('add') }
  const openEdit = p  => { setForm({ name: p.name, type: p.type, description: p.description || '' }); setError(''); setModal(p._id) }

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required.')
    setSaving(true); setError('')
    try {
      modal === 'add' ? await adminCreateProject(form) : await adminUpdateProject(modal, form)
      setModal(null); load()
      toast.success(modal === 'add' ? 'Project created' : 'Project updated')
    } catch (e) { setError(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  const toggleHide = async (p) => {
    await adminUpdateProject(p._id, { isHidden: !p.isHidden })
    setProjects(prev => prev.map(x => x._id === p._id ? { ...x, isHidden: !x.isHidden } : x))
    toast.success(p.isHidden ? 'Project visible' : 'Project hidden')
  }

  const del = async id => {
    const ok = await confirm('Delete this project?', 'This will permanently remove all floors, locations, and inspections linked to it.')
    if (!ok) return
    await adminDeleteProject(id)
    setProjects(prev => prev.filter(p => p._id !== id))
    toast.success('Project deleted')
  }

  // ── Map upload ────────────────────────────────────────────────────────────────
  const openMapModal = (p) => {
    setMapProject(p)
    setMapPreview(null)
  }

  const handleMapFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMapPreview(URL.createObjectURL(file))
    setMapIsNewPdf(file.type === 'application/pdf')
  }

  const uploadMap = async () => {
    const file = mapFileRef.current?.files?.[0]
    if (!file) return
    setMapUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const { data } = await uploadPhoto(fd)
      await adminUpdateProject(mapProject._id, { mapImage: data.url })
      setProjects(prev => prev.map(p => p._id === mapProject._id ? { ...p, mapImage: data.url } : p))
      setMapProject(prev => ({ ...prev, mapImage: data.url }))
      setMapPreview(null)
      setMapIsNewPdf(false)
      if (mapFileRef.current) mapFileRef.current.value = ''
      toast.success('Project map uploaded')
      setMapProject(null)
    } catch {
      toast.error('Upload failed. Try again.')
    } finally { setMapUploading(false) }
  }

  const removeMap = async () => {
    const ok = await confirm('Remove project map?', 'The map image will be removed from this project.')
    if (!ok) return
    await adminUpdateProject(mapProject._id, { mapImage: '' })
    setProjects(prev => prev.map(p => p._id === mapProject._id ? { ...p, mapImage: '' } : p))
    setMapProject(prev => ({ ...prev, mapImage: '' }))
    toast.success('Map removed')
  }

  const columns = [
    {
      label: 'Name',
      render: p => (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${p.isHidden ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{p.name}</span>
          {p.isHidden && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Hidden</span>}
          {p.mapImage && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center gap-0.5"><Map className="w-2.5 h-2.5" /> Map</span>}
        </div>
      )
    },
    { label: 'Type',        render: p => <Badge variant={TYPE_VARIANT[p.type]}>{TYPE_LABEL[p.type] || p.type}</Badge> },
    { label: 'Description', render: p => <span className="text-gray-500 dark:text-gray-400 max-w-xs truncate block">{p.description || '—'}</span> },
    {
      label: 'Actions',
      render: p => (
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/projects/${p._id}/floors`)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
            <Layers className="w-3.5 h-3.5" /> Floors
          </button>
          {isAdmin && (
            <button
              onClick={() => openMapModal(p)}
              title="Upload project map"
              className={`p-1.5 rounded-lg transition-colors ${p.mapImage ? 'text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10' : 'text-gray-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10'}`}
            >
              <Map className="w-4 h-4" />
            </button>
          )}
          {isAdmin && <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"><Pencil className="w-4 h-4" /></button>}
          {isAdmin && <button onClick={() => toggleHide(p)} title={p.isHidden ? 'Show project' : 'Hide project'} className={`p-1.5 rounded-lg transition-colors ${p.isHidden ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}>
            {p.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>}
          {isAdmin && <button onClick={() => del(p._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>}
        </div>
      )
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-5">
        <PageHeader title="Projects" subtitle={`${projects.length} projects`} onAdd={isAdmin ? openAdd : undefined} addLabel="Add Project" />

        <DataTable columns={columns} data={projects} loading={loading} emptyText="No projects yet." />

        {/* Edit / Add modal */}
        {modal && (
          <FormModal title={modal === 'add' ? 'Add Project' : 'Edit Project'} onClose={() => setModal(null)} onSave={save} saving={saving} error={error}>
            <InputField label="Project Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nature Park Tower" />
            <InputField label="Type" required as="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL_HOSPITALITY">Commercial / Hospitality</option>
            </InputField>
            <InputField label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Floors, units summary…" />
          </FormModal>
        )}

        {/* Map upload drawer */}
        {mapProject && (
          <Modal
            title="Site Map"
            onClose={() => setMapProject(null)}
            footer={
              <div className="flex items-center gap-2">
                <button
                  onClick={uploadMap}
                  disabled={!mapPreview || mapUploading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {mapUploading ? 'Uploading…' : 'Save Map'}
                </button>
                {mapProject.mapImage && !mapPreview && (
                  <button
                    onClick={removeMap}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                {mapPreview && (
                  <button
                    onClick={() => { setMapPreview(null); setMapIsNewPdf(false); if (mapFileRef.current) mapFileRef.current.value = '' }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            }
          >
            <div className="space-y-4">
              {/* Project info */}
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                  <Map className="w-4 h-4 text-teal-500" />
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{mapProject.name}</p>
              </div>

              {/* Preview */}
              {(() => {
                const src   = mapPreview || mapProject.mapImage
                const isPdf = mapPreview ? mapIsNewPdf : (mapProject.mapImage?.toLowerCase().includes('.pdf') || mapProject.mapImage?.includes('/raw/upload/'))
                if (src && isPdf) return (
                  <div className="relative flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-500/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <FileText className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">PDF Document</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Site map / floor plan</p>
                      {!mapPreview && (
                        <a href={src} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                          <ExternalLink className="w-3 h-3" /> Open PDF
                        </a>
                      )}
                    </div>
                    {mapPreview && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">New</span>
                    )}
                  </div>
                )
                if (src) return (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <img src={src} alt="Project map" className="w-full max-h-56 object-contain" />
                    {mapPreview && (
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
                    {mapProject.mapImage ? 'Replace map' : 'Upload map'}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">JPG, PNG, WebP or PDF</p>
                </div>
                <input ref={mapFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleMapFileChange} />
              </label>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  )
}

