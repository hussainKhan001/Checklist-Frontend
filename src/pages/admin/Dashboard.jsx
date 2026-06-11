import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { adminGetStats, adminGetInspections } from '../../api'
import {
  ClipboardList, CheckCircle2, Clock, FolderOpen, Layers, Users, ArrowRight
} from 'lucide-react'

const STAT_DEFS = [
  { key: 'totalInspections', label: 'Total Inspections', icon: ClipboardList, bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-200/60 dark:border-orange-500/20' },
  { key: 'submitted',        label: 'Submitted',         icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-200/60 dark:border-emerald-500/20' },
  { key: 'draft',            label: 'Draft',             icon: Clock,        bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-200/60 dark:border-amber-500/20' },
  { key: 'totalProjects',    label: 'Projects',          icon: FolderOpen,   bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-200/60 dark:border-blue-500/20' },
  { key: 'totalTrades',      label: 'Trades',            icon: Layers,       bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-200/60 dark:border-purple-500/20' },
  { key: 'totalUsers',       label: 'Users',             icon: Users,        bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200/60 dark:border-gray-700' },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminGetStats(), adminGetInspections()])
      .then(([s, i]) => { setStats(s.data); setRecent(i.data.slice(0, 8)) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Overview of all site inspections</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAT_DEFS.map(({ key, label, icon: Icon, bg, text, border }) => (
            <div key={key} className={`rounded-xl border ${border} bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow`}>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4.5 h-4.5 ${text}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{stats?.[key] ?? 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Recent inspections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Inspections</h2>
            <Link
              to="/admin/inspections"
              className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Project</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Floor › Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Trade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Contractor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {recent.map(ins => (
                    <tr key={ins._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{ins.projectId?.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{ins.floorId?.label} › {ins.locationId?.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{ins.tradeId?.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(ins.dateOfCheck).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{ins.contractorAgency || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={ins.status} /></td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No inspections yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold
      ${status === 'SUBMITTED'
        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
        : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
      }`}>
      {status}
    </span>
  )
}
