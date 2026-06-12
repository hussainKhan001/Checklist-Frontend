import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import FormModal from '../../components/ui/FormModal'
import InputField from '../../components/ui/InputField'
import Badge from '../../components/ui/Badge'
import { adminGetUsers, adminCreateUser, adminUpdateUser, adminDeleteUser } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const BLANK = { name: '', email: '', password: '', role: 'user' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { user: me } = useAuth()
  const confirm = useConfirm()

  const load = () => adminGetUsers().then(r => setUsers(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openAdd  = () => { setForm(BLANK); setError(''); setModal('add') }
  const openEdit = u  => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setError(''); setModal(u._id) }

  const save = async () => {
    if (!form.name || !form.email) return setError('Name and email are required.')
    if (modal === 'add' && !form.password) return setError('Password is required for new users.')
    setSaving(true); setError('')
    try {
      const payload = { ...form }
      if (modal !== 'add' && !payload.password) delete payload.password
      modal === 'add' ? await adminCreateUser(payload) : await adminUpdateUser(modal, payload)
      setModal(null); load()
      toast.success(modal === 'add' ? 'User created' : 'User updated')
    } catch (e) { setError(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  const del = async id => {
    if (id === me?._id) return toast.error('You cannot delete your own account.')
    const ok = await confirm('Delete this user?', 'This action cannot be undone.')
    if (!ok) return
    await adminDeleteUser(id)
    setUsers(prev => prev.filter(u => u._id !== id))
    toast.success('User deleted')
  }

  const columns = [
    {
      label: 'Name',
      render: u => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {u.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{u.name}</div>
            {u._id === me?._id && <div className="text-[10px] text-orange-500 font-medium">You</div>}
          </div>
        </div>
      )
    },
    { label: 'Email',   render: u => <span className="text-gray-500 dark:text-gray-400">{u.email}</span> },
    { label: 'Role',    render: u => <Badge variant={u.role === 'admin' ? 'orange' : 'gray'}>{u.role}</Badge> },
    { label: 'Created', render: u => <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString('en-IN')}</span> },
    {
      label: 'Actions',
      render: u => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => del(u._id)} disabled={u._id === me?._id} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-5">
        <PageHeader title="Users" subtitle={`${users.length} members`} onAdd={openAdd} addLabel="Add User" />

        <DataTable columns={columns} data={users} loading={loading} emptyText="No users yet." />

        {modal && (
          <FormModal title={modal === 'add' ? 'Add User' : 'Edit User'} onClose={() => setModal(null)} onSave={save} saving={saving} error={error}>
            <InputField label="Full Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Raza Ahmed" />
            <InputField label="Email" required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="raza@neotericgrp.in" />
            <InputField label={modal === 'add' ? 'Password' : 'New Password (leave blank to keep)'} required={modal === 'add'} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            <InputField label="Role" as="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">User (Site Engineer)</option>
              <option value="admin">Admin</option>
            </InputField>
          </FormModal>
        )}
      </div>
    </AdminLayout>
  )
}
