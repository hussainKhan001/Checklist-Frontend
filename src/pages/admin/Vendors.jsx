import { useState, useEffect, useRef } from 'react'
import { Store, Plus, Search, Pencil, Trash2, Loader2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminGetVendors, adminCreateVendor, adminUpdateVendor, adminDeleteVendor } from '../../services/api'
import { useConfirm } from '../../context/ConfirmContext'
import AdminLayout from '../../components/layout/AdminLayout'

const EMPTY = { vendorCode: '', companyName: '', ownerName: '' }

export default function Vendors() {
  const confirm = useConfirm()

  const [vendors, setVendors]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)  // null = create, object = update
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const debounceRef = useRef(null)

  const load = async (q = search) => {
    setLoading(true)
    try {
      const r = await adminGetVendors({ search: q })
      setVendors(r.data.data || [])
    } catch {
      toast.error('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('') }, [])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(val), 350)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setFormErrors({})
    setShowForm(true)
  }

  const openEdit = (v) => {
    setEditing(v)
    setForm({ vendorCode: v.vendorCode, companyName: v.companyName, ownerName: v.ownerName })
    setFormErrors({})
    setShowForm(true)
  }

  const validateForm = () => {
    const e = {}
    if (!form.vendorCode.trim())  e.vendorCode  = 'Required'
    if (!form.companyName.trim()) e.companyName = 'Required'
    if (!form.ownerName.trim())   e.ownerName   = 'Required'
    return e
  }

  const handleSave = async () => {
    const e = validateForm()
    if (Object.keys(e).length) { setFormErrors(e); return }
    setSaving(true)
    try {
      if (editing) {
        const r = await adminUpdateVendor(editing._id, form)
        setVendors(prev => prev.map(v => v._id === editing._id ? r.data.data : v))
        toast.success('Vendor updated')
      } else {
        const r = await adminCreateVendor(form)
        setVendors(prev => [...prev, r.data.data])
        toast.success('Vendor created')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (v) => {
    try {
      const r = await adminUpdateVendor(v._id, { active: !v.active })
      setVendors(prev => prev.map(x => x._id === v._id ? r.data.data : x))
      toast.success(r.data.data.active ? 'Vendor activated' : 'Vendor deactivated')
    } catch {
      toast.error('Failed to update vendor')
    }
  }

  const handleDelete = async (v) => {
    const ok = await confirm({ title: 'Delete Vendor', message: `Delete "${v.companyName}"? This cannot be undone.`, confirmLabel: 'Delete', variant: 'danger' })
    if (!ok) return
    try {
      await adminDeleteVendor(v._id)
      setVendors(prev => prev.filter(x => x._id !== v._id))
      toast.success('Vendor deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  const setF = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }))
    if (formErrors[k]) setFormErrors(prev => ({ ...prev, [k]: '' }))
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Vendors</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{vendors.length} contractor{vendors.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, code, or owner…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Company Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400 dark:text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading vendors…</p>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Store className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-400">{search ? 'No vendors match your search' : 'No vendors yet'}</p>
                  </td>
                </tr>
              ) : vendors.map((v, i) => (
                <tr key={v._id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded">
                      {v.vendorCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.companyName}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">{v.ownerName}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(v)}
                      title={v.active ? 'Click to deactivate' : 'Click to activate'}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        v.active
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {v.active
                        ? <><ToggleRight className="w-3.5 h-3.5" /> Active</>
                        : <><ToggleLeft  className="w-3.5 h-3.5" /> Inactive</>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(v)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {editing ? 'Edit Vendor' : 'Add Vendor'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <MField label="Vendor Code *" error={formErrors.vendorCode}>
                <input
                  type="text"
                  value={form.vendorCode}
                  onChange={e => setF('vendorCode', e.target.value)}
                  placeholder="e.g. VC-0001"
                  className={mInputCls(formErrors.vendorCode)}
                />
              </MField>
              <MField label="Company Name *" error={formErrors.companyName}>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => setF('companyName', e.target.value)}
                  placeholder="Company or contractor name"
                  className={mInputCls(formErrors.companyName)}
                />
              </MField>
              <MField label="Owner Name *" error={formErrors.ownerName}>
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={e => setF('ownerName', e.target.value)}
                  placeholder="Owner / contact person"
                  className={mInputCls(formErrors.ownerName)}
                />
              </MField>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editing ? 'Save Changes' : 'Create Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function MField({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function mInputCls(err) {
  return `w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors ${
    err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-500'
  }`
}
