import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getTradeElements, getProject, getFloor, getLocations, getTrade } from '../services/api'
import { ChevronRight, Layers } from 'lucide-react'

const TYPE_COLOR = {
  WALL:              'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
  COLUMN:            'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400',
  BEAM:              'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  SLAB:              'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  DOOR_WINDOW_FRAME: 'bg-pink-100 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400',
  STAIRCASE:         'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400',
  OTHER:             'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
}
const TYPE_LABEL = {
  WALL: 'Wall', COLUMN: 'Column', BEAM: 'Beam', SLAB: 'Slab',
  DOOR_WINDOW_FRAME: 'Door/Window Frame', STAIRCASE: 'Staircase', OTHER: 'Other',
}

export default function SelectElementForTrade() {
  const { projectId, floorId, locationId, tradeId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [floor, setFloor] = useState(null)
  const [location, setLocation] = useState(null)
  const [trade, setTrade] = useState(null)
  const [elements, setElements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getProject(projectId),
      getFloor(floorId),
      getLocations(floorId),
      getTrade(tradeId),
      getTradeElements(tradeId, locationId),
    ]).then(([pRes, fRes, lRes, tRes, eRes]) => {
      setProject(pRes.data)
      setFloor(fRes.data)
      setLocation(lRes.data.find(l => l._id === locationId) || null)
      setTrade(tRes.data)
      setElements(eRes.data)
    }).finally(() => setLoading(false))
  }, [projectId, floorId, locationId, tradeId])

  const goChecklist = (elementId) => {
    const ctx = JSON.stringify({ projectId, floorId, locationId, elementId })
    sessionStorage.setItem('checklistCtx', ctx)
    localStorage.setItem(`checklistCtx_${tradeId}`, ctx)
    navigate(`/c/${tradeId}`)
  }

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>

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
        <Link to={`/p/${projectId}/f/${floorId}/l/${locationId}`} className="hover:text-orange-500 transition-colors font-medium">{trade?.name || '…'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Select Element</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {trade?.name} — Select Element
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose which structural element to inspect for this work.
        </p>
      </div>

      {elements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Layers className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No elements assigned for this work yet.</p>
          <p className="text-xs mt-1">Ask your admin to configure eligible elements.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {elements.map(el => (
            <div
              key={el._id}
              onClick={() => goChecklist(el._id)}
              className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{el.name}</div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${TYPE_COLOR[el.type] || TYPE_COLOR.OTHER}`}>
                  <Layers className="w-3 h-3" />
                  {TYPE_LABEL[el.type] || el.type}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
