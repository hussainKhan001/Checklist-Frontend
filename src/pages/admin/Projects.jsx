import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import FormModal from '../../components/ui/FormModal'
import InputField from '../../components/ui/InputField'
import Badge from '../../components/ui/Badge'
import { adminGetProjects, adminCreateProject, adminUpdateProject, adminDeleteProject } from '../../api'
import { useConfirm } from '../../context/ConfirmContext'
import { Layers, Pencil, Trash2 } from 'lucide-react'
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
  const navigate = useNavigate()
  const confirm = useConfirm()

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

  const del = async id => {
    const ok = await confirm('Delete this project?', 'This will permanently remove all floors, locations, and inspections linked to it.')
    if (!ok) return
    await adminDeleteProject(id)
    setProjects(prev => prev.filter(p => p._id !== id))
    toast.success('Project deleted')
  }

  const columns = [
    { label: 'Name',        render: p => <span className="font-semibold text-gray-900 dark:text-white">{p.name}</span> },
    { label: 'Type',        render: p => <Badge variant={TYPE_VARIANT[p.type]}>{TYPE_LABEL[p.type] || p.type}</Badge> },
    { label: 'Description', render: p => <span className="text-gray-500 dark:text-gray-400 max-w-xs truncate block">{p.description || '—'}</span> },
    {
      label: 'Actions',
      render: p => (
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/admin/projects/${p._id}/floors`)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
            <Layers className="w-3.5 h-3.5" /> Floors
          </button>
          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => del(p._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-5">
        <PageHeader title="Projects" subtitle={`${projects.length} projects`} onAdd={openAdd} addLabel="Add Project" />

        <DataTable columns={columns} data={projects} loading={loading} emptyText="No projects yet." />

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
      </div>
    </AdminLayout>
  )
}
