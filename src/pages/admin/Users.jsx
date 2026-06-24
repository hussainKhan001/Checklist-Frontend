import { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import FormModal from '../../components/ui/FormModal'
import InputField from '../../components/ui/InputField'
import { adminGetUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, adminGetRoles } from '../../services/api'
import { ROLE_BADGE_CLS, COLOR_OPTIONS } from '../../constants/permissions'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const BLANK = { name: '', email: '', password: '', role: ['user'] }

// Multi-role selector — click to toggle roles on/off
function RoleSelector({ value = [], onChange, roles }) {
  const toggle = (name) =>
    onChange(value.includes(name) ? value.filter(r => r !== name) : [...value, name])

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Roles <span className="text-red-500">*</span>
        <span className="ml-1.5 text-xs font-normal text-gray-400">(select one or more)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {roles.map(r => {
          const on     = value.includes(r.name)
          const dotCls = COLOR_OPTIONS.find(c => c.value === r.color)?.cls || 'bg-gray-400'
          return (
            <button
              key={r._id}
              type="button"
              onClick={() => toggle(r.name)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all select-none ${
                on
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 shadow-sm'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${on ? dotCls : 'bg-gray-300 dark:bg-gray-500'}`} />
              {r.displayName}
            </button>
          )
        })}
      </div>
      {value.length === 0 && (
        <p className="mt-1.5 text-xs text-red-500">At least one role is required.</p>
      )}
    </div>
  )
}

export default function Users() {
  const [users,   setUsers]   = useState([])
  const [roles,   setRoles]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(BLANK)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const { user: me } = useAuth()
  const confirm = useConfirm()

  const load = () => {
    setLoading(true)
    Promise.all([adminGetUsers(), adminGetRoles()])
      .then(([u, r]) => { setUsers(u.data); setRoles(r.data) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openAdd  = () => { setForm(BLANK); setError(''); setModal('add') }
  const openEdit = u  => {
    setForm({
      name:     u.name,
      email:    u.email,
      password: '',
      role:     Array.isArray(u.role) ? [...u.role] : [u.role],
    })
    setError('')
    setModal(u._id)
  }

  const save = async () => {
    if (!form.name || !form.email)            return setError('Name and email are required.')
    if (modal === 'add' && !form.password)    return setError('Password is required for new users.')
    if (!form.role || form.role.length === 0) return setError('At least one role is required.')
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

  const renderRoleBadges = (user) => {
    const userRoles = Array.isArray(user.role) ? user.role : [user.role]
    return (
      <div className="flex flex-wrap gap-1">
        {userRoles.map(roleName => {
          const r   = roles.find(x => x.name === roleName)
          const cls = ROLE_BADGE_CLS[r?.color] || ROLE_BADGE_CLS.gray
          return (
            <span key={roleName} className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
              {r?.displayName || roleName}
            </span>
          )
        })}
      </div>
    )
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
      ),
    },
    { label: 'Email',   render: u => <span className="text-gray-500 dark:text-gray-400">{u.email}</span> },
    { label: 'Roles',   render: renderRoleBadges },
    { label: 'Created', render: u => <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString('en-IN')}</span> },
    {
      label: 'Actions',
      render: u => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              if (u._id === me?._id) return toast.error('You cannot delete your own account.')
              const ok = await confirm('Delete this user?', 'This action cannot be undone.')
              if (!ok) return
              await adminDeleteUser(u._id)
              setUsers(prev => prev.filter(x => x._id !== u._id))
              toast.success('User deleted')
            }}
            disabled={u._id === me?._id}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-5">
        <PageHeader title="Users" subtitle={`${users.length} members`} onAdd={openAdd} addLabel="Add User" />

        <DataTable columns={columns} data={users} loading={loading} emptyText="No users yet." />

        {modal && (
          <FormModal
            title={modal === 'add' ? 'Add User' : 'Edit User'}
            onClose={() => setModal(null)}
            onSave={save}
            saving={saving}
            error={error}
          >
            <InputField
              label="Full Name" required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Raza Ahmed"
            />
            <InputField
              label="Email" required type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="raza@neotericgrp.in"
            />
            <InputField
              label={modal === 'add' ? 'Password' : 'New Password (leave blank to keep)'}
              required={modal === 'add'} type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
            />
            <RoleSelector
              value={form.role}
              onChange={role => setForm(f => ({ ...f, role }))}
              roles={roles}
            />
          </FormModal>
        )}
      </div>
    </AdminLayout>
  )
}

