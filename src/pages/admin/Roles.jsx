import { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import Modal from '../../components/common/Modal'
import {
  adminGetRoles, adminCreateRole, adminUpdateRole, adminDeleteRole,
} from '../../services/api'
import {
  PERMISSIONS, PERMISSION_SECTIONS, COLOR_OPTIONS,
  NODE_TYPE_LABELS, NODE_TYPE_STYLES,
} from '../../constants/permissions'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import {
  Plus, Pencil, Trash2, Lock, Users, ShieldCheck,
  ArrowLeft, Search, ChevronUp, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Reusable toggle switch ────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={e => { e.stopPropagation(); if (!disabled) onChange(!checked) }}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
        checked ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Permission Matrix (full-page role-permission editor) ──────────────────────
function PermissionMatrix({ role, onBack, onSave, myPermissions }) {
  const [perms,    setPerms]    = useState([...(role.permissions || [])])
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')
  const [collapsed, setCollapsed] = useState({})

  const canGrant = key => myPermissions.includes(key)

  const togglePerm = key => {
    if (!canGrant(key)) return
    setPerms(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])
  }

  const toggleSection = sectionKey => {
    const sec   = PERMISSION_SECTIONS.find(s => s.key === sectionKey)
    if (!sec) return
    const keys  = sec.permissions.map(p => p.key).filter(canGrant)
    const allOn = keys.every(k => perms.includes(k))
    setPerms(p => allOn ? p.filter(k => !keys.includes(k)) : [...new Set([...p, ...keys])])
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(role._id, perms) }
    finally { setSaving(false) }
  }

  const q = search.toLowerCase()
  const visibleSections = PERMISSION_SECTIONS.map(s => ({
    ...s,
    permissions: q ? s.permissions.filter(p => p.label.toLowerCase().includes(q)) : s.permissions,
  })).filter(s => s.permissions.length > 0)

  const colorCls = COLOR_OPTIONS.find(c => c.value === role.color)?.cls || 'bg-gray-400'

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Roles</span>
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold ${colorCls}`}>
              {role.displayName?.[0]?.toUpperCase()}
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-100">{role.displayName}</span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Sub-header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Role permission matrix</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Assigned authorizations:{' '}
            <span className="font-semibold text-orange-500">{perms.length}</span>
            <span className="text-gray-400">/{PERMISSIONS.length}</span>
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search permissions…"
            className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 w-52 transition"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {visibleSections.map(section => {
          const isOpen      = !collapsed[section.key]
          const grantable   = section.permissions.filter(p => canGrant(p.key))
          const activeCount = section.permissions.filter(p => perms.includes(p.key)).length
          const allOn       = grantable.length > 0 && grantable.every(p => perms.includes(p.key))
          const someOn      = section.permissions.some(p => perms.includes(p.key))

          return (
            <div
              key={section.key}
              className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Section header */}
              <div
                className={`flex items-center justify-between px-5 py-3.5 ${
                  someOn
                    ? 'bg-orange-50 dark:bg-orange-500/10 border-b border-orange-100 dark:border-orange-500/20'
                    : 'bg-gray-50 dark:bg-gray-800/70 border-b border-gray-100 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck
                    className={`w-4 h-4 flex-shrink-0 ${someOn ? 'text-orange-500' : 'text-gray-400'}`}
                  />
                  <span
                    className={`font-semibold text-sm ${
                      someOn ? 'text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {section.label}
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums">
                    ({activeCount}/{section.permissions.length} nodes)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 select-none">
                    <span>Select unit</span>
                    <Toggle
                      checked={allOn}
                      onChange={() => toggleSection(section.key)}
                      disabled={grantable.length === 0}
                    />
                  </div>
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [section.key]: !c[section.key] }))}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Permission cards grid */}
              {isOpen && (
                <div className="p-4 bg-white dark:bg-gray-800/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.permissions.map(perm => {
                    const active     = perms.includes(perm.key)
                    const grantableP = canGrant(perm.key)
                    const typeLabel  = NODE_TYPE_LABELS[perm.type] || perm.type
                    const typeStyle  = NODE_TYPE_STYLES[perm.type] || 'text-gray-400'

                    return (
                      <div
                        key={perm.key}
                        onClick={() => togglePerm(perm.key)}
                        className={`flex items-start justify-between gap-3 p-3.5 rounded-lg border transition-all ${
                          active
                            ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
                            : 'bg-gray-50/70 dark:bg-gray-700/40 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                        } ${grantableP ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium leading-snug ${
                              active ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {perm.label}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {!grantableP && <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                            <span
                              className={`text-[11px] font-medium ${
                                grantableP ? typeStyle : 'text-gray-400'
                              }`}
                            >
                              • {grantableP ? typeLabel : 'Requires higher access'}
                            </span>
                          </div>
                        </div>
                        <Toggle
                          checked={active}
                          onChange={() => togglePerm(perm.key)}
                          disabled={!grantableP}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Roles List (card grid) ────────────────────────────────────────────────────
const BLANK_FORM = { displayName: '', color: 'gray' }

export default function Roles() {
  const [roles,      setRoles]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [matrixRole, setMatrixRole] = useState(null)   // null = list view, role obj = matrix view
  const [nameModal,  setNameModal]  = useState(null)   // null | 'add' | roleId
  const [form,       setForm]       = useState(BLANK_FORM)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const { user: me, refreshUser, hasPermission } = useAuth()
  const confirm = useConfirm()

  const myPermissions = me?.permissions || []

  const load = () => {
    setLoading(true)
    adminGetRoles().then(r => setRoles(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd  = () => { setForm(BLANK_FORM); setError(''); setNameModal('add') }
  const openEdit = r  => { setForm({ displayName: r.displayName, color: r.color || 'gray' }); setError(''); setNameModal(r._id) }

  const saveNameColor = async () => {
    if (!form.displayName.trim()) return setError('Display name is required.')
    setSaving(true); setError('')
    try {
      if (nameModal === 'add') {
        const autoKey = form.displayName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        await adminCreateRole({ name: autoKey, displayName: form.displayName, color: form.color, permissions: [] })
        toast.success('Role created')
      } else {
        await adminUpdateRole(nameModal, { displayName: form.displayName, color: form.color })
        toast.success('Role updated')
      }
      setNameModal(null); load(); refreshUser()
    } catch (e) { setError(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  const savePermissions = async (id, permissions) => {
    await adminUpdateRole(id, { permissions })
    load(); refreshUser()
    toast.success('Permissions saved')
  }

  const del = async role => {
    if (role.isSystem) return toast.error('System roles cannot be deleted.')
    const ok = await confirm(
      `Delete "${role.displayName}"?`,
      role.userCount > 0 ? `${role.userCount} user(s) will lose this role.` : 'This cannot be undone.',
    )
    if (!ok) return
    try {
      await adminDeleteRole(role._id)
      setRoles(prev => prev.filter(r => r._id !== role._id))
      toast.success('Role deleted')
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed.') }
  }

  // ── Matrix view ─────────────────────────────────────────────────────────────
  if (matrixRole) {
    return (
      <AdminLayout>
        <PermissionMatrix
          role={matrixRole}
          myPermissions={myPermissions}
          onBack={() => { setMatrixRole(null); load() }}
          onSave={savePermissions}
        />
      </AdminLayout>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">System Access Control</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {roles.length} roles · {PERMISSIONS.length} total permissions
            </p>
          </div>
          {hasPermission('manage_roles') && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Define New Role
            </button>
          )}
        </div>

        {/* Role cards */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {roles.map(role => {
              const colorCls = COLOR_OPTIONS.find(c => c.value === role.color)?.cls || 'bg-gray-400'
              const pct      = Math.round(((role.permissions?.length || 0) / PERMISSIONS.length) * 100)

              return (
                <div
                  key={role._id}
                  className="flex flex-col gap-4 p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Top row: avatar · node count · actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm ${colorCls}`}
                    >
                      {role.displayName?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                        {role.permissions?.length || 0} Auth Nodes
                      </span>
                      {hasPermission('manage_roles') && !role.isSystem && (
                        <>
                          <button
                            onClick={() => openEdit(role)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                            title="Rename / recolor"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => del(role)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Delete role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {role.isSystem && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400">
                          <Lock className="w-2.5 h-2.5" /> System
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role name + subtitle */}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white leading-snug">{role.displayName}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Configure global access rights for this role type.</p>
                  </div>

                  {/* Permission progress bar + user count */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${colorCls}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="w-3 h-3" />
                      <span>{role.userCount || 0}</span>
                    </div>
                  </div>

                  {/* Manage Permissions button */}
                  <button
                    onClick={() => setMatrixRole(role)}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Manage Permissions
                  </button>
                </div>
              )
            })}

            {roles.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2">
                <ShieldCheck className="w-8 h-8 opacity-30" />
                No roles yet. Create one to get started.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Name + Color drawer ─────────────────────────────────────────────── */}
      {nameModal && (
        <Modal
          title={nameModal === 'add' ? 'New Role' : 'Edit Role'}
          onClose={() => setNameModal(null)}
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setNameModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveNameColor}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition"
              >
                {saving ? 'Saving…' : nameModal === 'add' ? 'Create Role' : 'Save'}
              </button>
            </div>
          }
        >
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Role Name *
              </label>
              <input
                autoFocus
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveNameColor()}
                placeholder="e.g. Site Lead"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                Badge Color
              </label>
              <div className="flex gap-3">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    title={c.label}
                    className={`w-7 h-7 rounded-full ${c.cls} transition-all ${
                      form.color === c.value
                        ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110'
                        : 'opacity-50 hover:opacity-90'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}

