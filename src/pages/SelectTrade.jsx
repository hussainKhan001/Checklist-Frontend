import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getTrades, getCheckPoints, getProject, getFloor, getLocations, getElements } from '../api'
import { ChevronRight, AlertTriangle, Clock } from 'lucide-react'

export default function SelectTrade() {
  const { projectId, floorId, locationId } = useParams()
  const elementId = sessionStorage.getItem('elementCtx') || null
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [floor, setFloor] = useState(null)
  const [location, setLocation] = useState(null)
  const [element, setElement] = useState(null)
  const [trades, setTrades] = useState([])
  const [cpCounts, setCpCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProject(projectId), getFloor(floorId), getLocations(floorId), getElements(locationId)])
      .then(async ([pRes, fRes, lRes, eRes]) => {
        setProject(pRes.data); setFloor(fRes.data)
        setLocation(lRes.data.find(l => l._id === locationId) || null)
        if (elementId) setElement(eRes.data.find(e => e._id === elementId) || null)

        // If element selected: load element-specific trades; fall back to global if none
        let tradesRes = elementId ? await getTrades(elementId) : await getTrades()
        if (elementId && tradesRes.data.length === 0) tradesRes = await getTrades()
        const tradeList = tradesRes.data
        setTrades(tradeList)

        const counts = {}
        await Promise.all(tradeList.filter(t => !t.isPending).map(async t => {
          const res = await getCheckPoints(t._id); counts[t._id] = res.data.length
        }))
        setCpCounts(counts)
      })
      .finally(() => setLoading(false))
  }, [projectId, floorId, locationId])

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading trades…</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
        <Link to="/" className="hover:text-orange-500 transition-colors font-medium">{project?.name || '…'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/p/${projectId}`} className="hover:text-orange-500 transition-colors font-medium">{floor?.label || '…'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/p/${projectId}/f/${floorId}`} className="hover:text-orange-500 transition-colors font-medium">{location?.name || '…'}</Link>
        {element && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-500 dark:text-gray-400 font-medium">{element.name}</span>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Select Trade</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Select Checklist</h1>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          HOLD POINT trades freeze the next activity until this sheet is fully signed.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trades.map(trade => (
          <div
            key={trade._id}
            onClick={() => {
              if (!trade.isPending) {
                sessionStorage.setItem('checklistCtx', JSON.stringify({
                  projectId, floorId, locationId,
                  elementId: elementId || null,
                }))
                navigate(`/c/${trade._id}`)
              }
            }}
            className={`group relative bg-white dark:bg-gray-800 border rounded-xl p-5 transition-all
              ${trade.isPending
                ? 'border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                : 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-orange-400 hover:shadow-md'
              }
              ${trade.isHoldPoint ? 'border-l-4 border-l-red-400' : ''}`}
          >
            {trade.isHoldPoint && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 rounded text-[11px] font-semibold bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-3 h-3" /> Hold Point
              </span>
            )}
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{trade.name}</div>
            {trade.isPending ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-500">
                <Clock className="w-3.5 h-3.5" /> Checklist content pending
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {cpCounts[trade._id] !== undefined ? `${cpCounts[trade._id]} check points` : '…'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
