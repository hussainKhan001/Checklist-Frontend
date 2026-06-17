import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getTrades, getCheckPoints, getProject, getFloor, getLocations, getTradeElements } from '../api'
import { ChevronRight, AlertTriangle, Clock, Layers } from 'lucide-react'

export default function SelectTrade() {
  const { projectId, floorId, locationId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [floor, setFloor] = useState(null)
  const [location, setLocation] = useState(null)
  const [trades, setTrades] = useState([])
  const [cpCounts, setCpCounts] = useState({})
  const [elemCounts, setElemCounts] = useState({}) // how many eligible elements per trade
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProject(projectId), getFloor(floorId), getLocations(floorId), getTrades()])
      .then(async ([pRes, fRes, lRes, tRes]) => {
        setProject(pRes.data); setFloor(fRes.data)
        setLocation(lRes.data.find(l => l._id === locationId) || null)
        const tradeList = tRes.data
        setTrades(tradeList)

        const counts = {}
        const eCounts = {}
        await Promise.all(tradeList.filter(t => !t.isPending).map(async t => {
          const [cpRes, teRes] = await Promise.all([
            getCheckPoints(t._id),
            getTradeElements(t._id, locationId),
          ])
          counts[t._id] = cpRes.data.length
          eCounts[t._id] = teRes.data.length
        }))
        setCpCounts(counts)
        setElemCounts(eCounts)
      })
      .finally(() => setLoading(false))
  }, [projectId, floorId, locationId])

  const handleTradeClick = (trade) => {
    if (trade.isPending) return
    if (elemCounts[trade._id] > 0) {
      // Has eligible elements — go to element selection for this trade
      navigate(`/p/${projectId}/f/${floorId}/l/${locationId}/t/${trade._id}`)
    } else {
      // No elements — go directly to checklist (general inspection)
      sessionStorage.setItem('checklistCtx', JSON.stringify({ projectId, floorId, locationId, elementId: null }))
      navigate(`/c/${trade._id}`)
    }
  }

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
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Select Work</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Select Work / Checklist</h1>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          HOLD POINT trades freeze the next activity until this sheet is fully signed.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trades.map(trade => (
          <div
            key={trade._id}
            onClick={() => handleTradeClick(trade)}
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
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {cpCounts[trade._id] !== undefined ? `${cpCounts[trade._id]} check points` : '…'}
                  </span>
                  {elemCounts[trade._id] > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                      <Layers className="w-3 h-3" />
                      {elemCounts[trade._id]} element{elemCounts[trade._id] > 1 ? 's' : ''} to inspect
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
