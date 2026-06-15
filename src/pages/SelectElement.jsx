import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getElements, getLocations, getFloor, getProject } from '../api'
import { ChevronRight, Layers, SkipForward } from 'lucide-react'

const TYPE_META = {
  WALL:             { label: 'Wall',              color: 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  COLUMN:           { label: 'Column',            color: 'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  BEAM:             { label: 'Beam',              color: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  SLAB:             { label: 'Slab',              color: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  DOOR_WINDOW_FRAME:{ label: 'Door/Window Frame', color: 'bg-pink-100 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400' },
  STAIRCASE:        { label: 'Staircase',         color: 'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  OTHER:            { label: 'Other',             color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
}

const TYPE_ORDER = ['WALL', 'COLUMN', 'BEAM', 'SLAB', 'DOOR_WINDOW_FRAME', 'STAIRCASE', 'OTHER']

export default function SelectElement() {
  const { projectId, floorId, locationId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [floor, setFloor] = useState(null)
  const [location, setLocation] = useState(null)
  const [elements, setElements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getProject(projectId),
      getFloor(floorId),
      getLocations(floorId),
      getElements(locationId),
    ]).then(([pRes, fRes, lRes, eRes]) => {
      setProject(pRes.data)
      setFloor(fRes.data)
      setLocation(lRes.data.find(l => l._id === locationId) || null)
      const elems = eRes.data
      if (elems.length === 0) {
        sessionStorage.setItem('elementCtx', '')
        navigate(`/p/${projectId}/f/${floorId}/l/${locationId}/trade`, { replace: true })
        return
      }
      setElements(elems)
    }).finally(() => setLoading(false))
  }, [projectId, floorId, locationId, navigate])

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
  )

  const goElement = (elementId) => {
    sessionStorage.setItem('elementCtx', elementId === 'skip' ? '' : elementId)
    navigate(`/p/${projectId}/f/${floorId}/l/${locationId}/trade`)
  }

  const grouped = TYPE_ORDER
    .map(type => ({ type, items: elements.filter(e => e.type === type) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
        <Link to="/" className="hover:text-orange-500 transition-colors font-medium">{project?.name || '…'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/p/${projectId}`} className="hover:text-orange-500 transition-colors font-medium">{floor?.label || '…'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/p/${projectId}/f/${floorId}`} className="hover:text-orange-500 transition-colors font-medium">{location?.name || '…'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Select Element</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {location?.name} — Select Structural Element
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose the structural element you want to inspect, or skip for a general room inspection.
        </p>
      </div>

      {/* Skip / General option */}
      <div
        onClick={() => goElement('skip')}
        className="group flex items-center justify-between bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <SkipForward className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">General / Whole Room Inspection</div>
            <div className="text-xs text-gray-400 mt-0.5">No specific structural element</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
      </div>

      {/* Elements grouped by type */}
      {grouped.map(({ type, items }) => {
        const meta = TYPE_META[type] || TYPE_META.OTHER
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${meta.color}`}>
                <Layers className="w-3 h-3" />
                {meta.label}s
              </span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(el => (
                <div
                  key={el._id}
                  onClick={() => goElement(el._id)}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{el.name}</div>
                    <span className={`inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
