import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, getInspections } from '../api'
import { Building2, Home, ChevronRight } from 'lucide-react'

const TYPE_LABELS = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL_HOSPITALITY: 'Commercial / Hospitality',
}

const TYPE_COLORS = {
  RESIDENTIAL: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20',
  COMMERCIAL_HOSPITALITY: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-500/20',
}

export default function SelectProject() {
  const [projects, setProjects] = useState([])
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getProjects(), getInspections()])
      .then(([pRes, iRes]) => { setProjects(pRes.data); setInspections(iRes.data) })
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading projects…</div>
  )

  const grouped = projects.reduce((acc, p) => {
    acc[p.type] = acc[p.type] || []; acc[p.type].push(p); return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Select Project</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">The checklist instance is tied to the exact project and location — never generic.</p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Projects grouped by type */}
      {Object.entries(grouped).map(([type, list]) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-3">
            {type === 'RESIDENTIAL' ? <Home className="w-4 h-4 text-gray-400" /> : <Building2 className="w-4 h-4 text-gray-400" />}
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{TYPE_LABELS[type] || type}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(p => (
              <div
                key={p._id}
                onClick={() => navigate(`/project/${p._id}/floors`)}
                className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-orange-300 dark:hover:border-orange-500/40 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${TYPE_COLORS[p.type]}`}>
                    {TYPE_LABELS[p.type] || p.type}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-orange-400 transition-colors" />
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-white mb-1">{p.name}</div>
                {p.description && <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{p.description}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Recent inspections */}
      {inspections.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Recent Inspections (this device)</div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-700/50">
            {inspections.slice(0, 5).map(ins => (
              <div key={ins._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{ins.tradeId?.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {ins.projectId?.name} · {ins.floorId?.label} · {ins.locationId?.name}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold flex-shrink-0 ${
                  ins.status === 'SUBMITTED'
                    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                }`}>{ins.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
