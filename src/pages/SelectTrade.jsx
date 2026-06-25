import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getTrades, getCheckPoints, getProject, getFloor, getLocations, getTradeElements, getInspections } from '../services/api'
import { ChevronRight, AlertTriangle, Clock, Layers, ClipboardCheck } from 'lucide-react'

const fmtDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function SelectTrade() {
  const { projectId, floorId, locationId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [floor, setFloor] = useState(null)
  const [location, setLocation] = useState(null)
  const [trades, setTrades] = useState([])
  const [cpCounts, setCpCounts] = useState({})
  const [elemCounts, setElemCounts] = useState({})
  const [inspHistory, setInspHistory] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getProject(projectId),
      getFloor(floorId),
      getLocations(floorId),
      getTrades(),
      getInspections({ locationId }),
    ])
      .then(async ([pRes, fRes, lRes, tRes, iRes]) => {
        setProject(pRes.data); setFloor(fRes.data)
        setLocation(lRes.data.find(l => l._id === locationId) || null)
        const tradeList = tRes.data

        // Build per-trade inspection history for this location
        const hist = {}
        for (const insp of iRes.data) {
          const tid = insp.tradeId?._id || insp.tradeId
          if (!tid) continue
          if (!hist[tid]) hist[tid] = { count: 0, lastDate: null, lastStatus: null }
          hist[tid].count++
          if (!hist[tid].lastDate || insp.dateOfCheck > hist[tid].lastDate) {
            hist[tid].lastDate = insp.dateOfCheck
            hist[tid].lastStatus = insp.status
          }
        }
        setInspHistory(hist)

        const counts = {}
        const eCounts = {}
        for (const t of tradeList.filter(t => !t.isPending)) {
          const [cpRes, teRes] = await Promise.all([
            getCheckPoints(t._id, projectId),
            getTradeElements(t._id, locationId),
          ])
          counts[t._id] = cpRes.data.length
          eCounts[t._id] = teRes.data.length
        }
        setCpCounts(counts)
        setElemCounts(eCounts)

        const projectDisabled = (pRes.data.disabledTrades || []).map(String)
        setTrades(tradeList.filter(t => eCounts[t._id] > 0 && !projectDisabled.includes(String(t._id))))
      })
      .finally(() => setLoading(false))
  }, [projectId, floorId, locationId])

  const handleTradeClick = (trade) => {
    if (trade.isPending) return
    if (elemCounts[trade._id] > 0) {
      navigate(`/p/${projectId}/f/${floorId}/l/${locationId}/t/${trade._id}`)
    } else {
      const ctx = JSON.stringify({ projectId, floorId, locationId, elementId: null })
      sessionStorage.setItem('checklistCtx', ctx)
      localStorage.setItem(`checklistCtx_${trade._id}`, ctx)
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
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Each submission is saved separately — fill daily as work progresses.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trades.map(trade => {
          const hist = inspHistory[trade._id]
          return (
            <div
              key={trade._id}
              onClick={() => handleTradeClick(trade)}
              className={`group relative bg-white dark:bg-gray-800 border rounded-xl p-5 transition-all
                ${trade.isPending
                  ? 'border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                  : hist
                    ? 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-orange-400 hover:shadow-md'
                    : 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-orange-400 hover:shadow-md'
                }
                ${trade.isHoldPoint ? 'border-l-4 border-l-red-400' : ''}`}
            >
              {trade.isHoldPoint && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 rounded text-[11px] font-semibold bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" /> Hold Point
                </span>
              )}

              <div className="flex items-start justify-between mb-1.5">
                <div className="text-sm font-bold text-gray-900 dark:text-white leading-snug pr-2">{trade.name}</div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-orange-400 transition-colors shrink-0 mt-0.5" />
              </div>

              {trade.isPending ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <Clock className="w-3.5 h-3.5" /> Checklist content pending
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {cpCounts[trade._id] !== undefined ? `${cpCounts[trade._id]} check points` : '…'}
                  </span>

                  {elemCounts[trade._id] > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                      <Layers className="w-3 h-3" />
                      {elemCounts[trade._id]} element{elemCounts[trade._id] > 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Inspection history for this location */}
                  {hist ? (
                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold mt-1 pt-1 border-t
                      ${hist.lastStatus === 'SUBMITTED'
                        ? 'text-green-500 border-green-100 dark:border-green-500/15'
                        : 'text-orange-400 border-orange-100 dark:border-orange-500/15'
                      }`}
                    >
                      <ClipboardCheck className="w-3 h-3 shrink-0" />
                      <span>{hist.count} fill{hist.count > 1 ? 's' : ''}</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>Last: {fmtDate(hist.lastDate)}</span>
                      {hist.lastStatus === 'SUBMITTED' && (
                        <span className="ml-auto px-1.5 py-0 rounded text-[9px] font-bold bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400 uppercase">
                          done
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-gray-300 dark:text-gray-600 mt-1 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                      <ClipboardCheck className="w-3 h-3" />
                      Not started
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
