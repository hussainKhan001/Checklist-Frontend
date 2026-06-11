import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import Modal from '../../components/Modal'
import { adminGetProjects, adminCreateProject, adminUpdateProject, adminDeleteProject } from '../../api'
import { useConfirm } from '../../context/ConfirmContext'
import { Plus, Pencil, Trash2, Layers } from 'lucide-react'
import toast from 'react-hot-toast'

const BLANK = { name: '', type: 'RESIDENTIAL', description: '' }

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

  const openAdd = () => { setForm(BLANK); setError(''); setModal('add') }
  const openEdit = (p) => { setForm({ name: p.name, type: p.type, description: p.description || '' }); setModal(p._id) }

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

  const del = async (id) => {
    const ok = await confirm('Delete this project?', 'This will permanently remove all floors, locations, and inspections linked to it.')
    if (!ok) return
    await adminDeleteProject(id)
    setProjects(prev => prev.filter(p => p._id !== id))
    toast.success('Project deleted')
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Projects</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{projects.length} projects</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-orange-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Project
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
                    {['Name','Type','Description','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {projects.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          p.type === 'RESIDENTIAL'
                            ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400'
                            : 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400'
                        }`}>
                          {p.type === 'RESIDENTIAL' ? 'Residential' : 'Commercial'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{p.description || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/admin/projects/${p._id}/floors`)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                            title="Manage Floors"
                          >
                            <Layers className="w-3.5 h-3.5" /> Floors
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => del(p._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">No projects yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {modal && (
          <Modal title={modal === 'add' ? 'Add Project' : 'Edit Project'} onClose={() => setModal(null)}>
            {error && <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Project Name *</label>
                <input className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nature Park Tower" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type *</label>
                <select className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL_HOSPITALITY">Commercial / Hospitality</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <input className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Floors, units summary…" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-sm shadow-orange-500/30 transition-colors">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  )
}
