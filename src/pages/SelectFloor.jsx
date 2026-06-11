import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getFloors, getProject } from '../api'
import { ChevronRight } from 'lucide-react'

export default function SelectFloor() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [floors, setFloors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProject(projectId), getFloors(projectId)])
      .then(([pRes, fRes]) => { setProject(pRes.data); setFloors(fRes.data) })
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading floors…</div>

  const regularFloors = floors.filter(f => !f.isProjectLevel)
  const projectLevelAreas = floors.filter(f => f.isProjectLevel)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/" className="hover:text-orange-500 transition-colors font-medium">{project?.name || '…'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Select Floor</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Select Floor</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Or jump straight to a project-level area.</p>
      </div>

      {/* Floor grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3">
        {regularFloors.map(f => (
          <button
            key={f._id}
            onClick={() => navigate(`/project/${projectId}/floor/${f._id}/locations`)}
            className="group flex flex-col items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:shadow-md hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-all aspect-square"
          >
            <div className="text-lg font-bold text-orange-500 group-hover:scale-110 transition-transform">{f.code}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 text-center leading-tight">{f.label}</div>
          </button>
        ))}
      </div>

      {/* Project-level areas */}
      {projectLevelAreas.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Project-Level Areas</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectLevelAreas.map(f => (
              <div
                key={f._id}
                onClick={() => navigate(`/project/${projectId}/floor/${f._id}/locations`)}
                className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{f.label}</div>
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
