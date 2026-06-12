import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import StatCard from '../../components/ui/StatCard'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import { adminGetStats, adminGetInspections } from '../../api'
import { ClipboardList, CheckCircle2, Clock, FolderOpen, Layers, Users, ArrowRight } from 'lucide-react'

const STAT_DEFS = [
  { key: 'totalInspections', label: 'Total Inspections', icon: ClipboardList, bg: 'bg-orange-50 dark:bg-orange-500/10',  text: 'text-orange-500',                    border: 'border-orange-200/60 dark:border-orange-500/20'  },
  { key: 'submitted',        label: 'Submitted',         icon: CheckCircle2,  bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500',                   border: 'border-emerald-200/60 dark:border-emerald-500/20' },
  { key: 'draft',            label: 'Draft',             icon: Clock,         bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-500',                     border: 'border-amber-200/60 dark:border-amber-500/20'    },
  { key: 'totalProjects',    label: 'Projects',          icon: FolderOpen,    bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-500',                      border: 'border-blue-200/60 dark:border-blue-500/20'      },
  { key: 'totalTrades',      label: 'Trades',            icon: Layers,        bg: 'bg-purple-50 dark:bg-purple-500/10',   text: 'text-purple-500',                    border: 'border-purple-200/60 dark:border-purple-500/20'  },
  { key: 'totalUsers',       label: 'Users',             icon: Users,         bg: 'bg-gray-100 dark:bg-gray-700/50',      text: 'text-gray-500 dark:text-gray-400',   border: 'border-gray-200/60 dark:border-gray-700'         },
]

const RECENT_COLS = [
  { label: 'Project',         render: r => <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{r.projectId?.name}</span> },
  { label: 'Floor › Location',render: r => <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.floorId?.label} › {r.locationId?.name}</span> },
  { label: 'Trade',           render: r => <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.tradeId?.name}</span> },
  { label: 'Date',            render: r => <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(r.dateOfCheck).toLocaleDateString('en-IN')}</span> },
  { label: 'Contractor',      render: r => <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.contractorAgency || '—'}</span> },
  { label: 'Status',          render: r => <StatusBadge status={r.status} /> },
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
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Overview of all site inspections</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAT_DEFS.map(def => (
            <StatCard key={def.key} {...def} value={stats?.[def.key]} />
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Inspections</h2>
            <Link to="/admin/inspections" className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <DataTable columns={RECENT_COLS} data={recent} emptyText="No inspections yet." />
        </div>
      </div>
    </AdminLayout>
  )
}
