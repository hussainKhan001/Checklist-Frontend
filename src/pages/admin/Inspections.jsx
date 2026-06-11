import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { adminGetInspections, adminDeleteInspection } from '../../api'
import { StatusBadge } from './Dashboard'
import { useConfirm } from '../../context/ConfirmContext'
import { Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Inspections() {
  const [inspections, setInspections] = useState([])
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const confirm = useConfirm()

  const load = (status) => {
    setLoading(true)
    adminGetInspections(status).then(r => setInspections(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load(filter) }, [filter])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    const ok = await confirm('Delete this inspection?', 'This cannot be undone.')
    if (!ok) return
    await adminDeleteInspection(id)
    setInspections(prev => prev.filter(i => i._id !== id))
    toast.success('Inspection deleted')
  }

  const filtered = inspections.filter(i =>
    !search ||
    i.projectId?.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.tradeId?.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.contractorAgency?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inspections</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{inspections.length} total records</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
              placeholder="Search project, trade, contractor…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 self-start">
            {['', 'SUBMITTED', 'DRAFT'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filter === s
                    ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {['Project','Floor › Location','Trade','Date','Contractor','Engineer','Status','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map(ins => (
                    <tr
                      key={ins._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/inspections/${ins._id}`)}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{ins.projectId?.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{ins.floorId?.label} › {ins.locationId?.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{ins.tradeId?.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(ins.dateOfCheck).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{ins.contractorAgency || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{ins.checkedBy || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={ins.status} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => handleDelete(ins._id, e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No inspections found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
