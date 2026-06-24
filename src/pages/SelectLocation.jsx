import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getLocations, getFloor, getProject } from '../services/api'
import { ChevronRight } from 'lucide-react'

export default function SelectLocation() {
  const { projectId, floorId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [floor, setFloor] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProject(projectId), getFloor(floorId), getLocations(floorId)])
      .then(([pRes, fRes, lRes]) => { setProject(pRes.data); setFloor(fRes.data); setLocations(lRes.data) })
      .finally(() => setLoading(false))
  }, [projectId, floorId])

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading locations…</div>

  const apartments = locations.filter(l => l.type === 'APARTMENT')
  const commonAreas = locations.filter(l => l.type === 'COMMON_AREA')
  const projectLevel = locations.filter(l => l.type === 'PROJECT_LEVEL')
  const go = (locationId) => navigate(`/p/${projectId}/f/${floorId}/l/${locationId}`)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
        <Link to="/" className="hover:text-orange-500 transition-colors font-medium">{project?.name || '…'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/p/${projectId}`} className="hover:text-orange-500 transition-colors font-medium">{floor?.label || '…'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Select Location</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{floor?.label} — Select Location</h1>

      {apartments.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Apartments</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
            {apartments.map(l => (
              <button
                key={l._id}
                onClick={() => go(l._id)}
                className="group flex flex-col items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 cursor-pointer hover:border-orange-400 hover:shadow-md hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-all aspect-square"
              >
                <div className="text-sm font-bold text-orange-500 group-hover:scale-105 transition-transform">{l.name}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Apt</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {commonAreas.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Floor Common Areas</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {commonAreas.map(l => (
              <div
                key={l._id}
                onClick={() => go(l._id)}
                className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all flex items-center justify-between"
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{l.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {projectLevel.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Project Areas</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectLevel.map(l => (
              <div
                key={l._id}
                onClick={() => go(l._id)}
                className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{l.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Project-level area</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
