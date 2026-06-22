import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects } from '../api'
import { Building2, Home, ChevronRight, Map, ZoomIn, ZoomOut, X } from 'lucide-react'

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
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [mapInfo, setMapInfo]   = useState(null)  // { url, name }
  const [mapZoom, setMapZoom]   = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    getProjects()
      .then(r => setProjects(r.data))
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false))
  }, [])

  const isPdfUrl = (url) => url?.toLowerCase().includes('.pdf') || url?.includes('/raw/upload/')

  const openMap = (e, p) => {
    e.stopPropagation()
    if (isPdfUrl(p.mapImage)) {
      const win = window.open('', '_blank')
      fetch(p.mapImage)
        .then(r => r.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
          win.location.href = blobUrl
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
        })
        .catch(() => { win.location.href = p.mapImage })
      return
    }
    setMapZoom(1)
    setMapInfo({ url: p.mapImage, name: p.name })
  }
  const closeMap = () => setMapInfo(null)

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
                onClick={() => navigate(`/p/${p._id}`)}
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

                {/* Map button — only shown if map exists */}
                {p.mapImage && (
                  <button
                    onClick={(e) => openMap(e, p)}
                    className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold
                      bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400
                      border border-teal-200/60 dark:border-teal-500/20
                      hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-colors"
                  >
                    <Map className="w-3 h-3" /> View Site Map
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Full-screen map lightbox ─────────────────────────────────────────── */}
      {mapInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={closeMap}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-black/40 backdrop-blur-sm border-b border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-teal-400" />
              <span className="text-white text-sm font-semibold">{mapInfo.name}</span>
              <span className="text-white/40 text-xs hidden sm:inline">— Site Map</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMapZoom(z => Math.min(+(z + 0.5).toFixed(1), 5))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
              <span className="text-white/50 text-xs w-9 text-center tabular-nums">{Math.round(mapZoom * 100)}%</span>
              <button onClick={() => setMapZoom(z => Math.max(+(z - 0.5).toFixed(1), 0.5))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
              <div className="w-px h-5 bg-white/20 mx-1" />
              <button onClick={closeMap} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Close"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Scrollable / zoomable image area */}
          <div className="flex-1 overflow-auto" style={{ touchAction: 'pan-x pan-y pinch-zoom' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-center p-4 min-h-full">
              <img
                src={mapInfo.url}
                alt={`${mapInfo.name} site map`}
                draggable={false}
                style={{
                  width: mapZoom === 1 ? '100%' : `${mapZoom * 100}%`,
                  maxWidth: mapZoom === 1 ? '100%' : 'none',
                  transition: 'width 0.25s ease',
                  borderRadius: 8,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                  userSelect: 'none',
                }}
              />
            </div>
          </div>

          {/* Bottom hint */}
          <div className="text-center py-2.5 text-[11px] text-white/25 flex-shrink-0 select-none">
            Pinch or use +/− to zoom · Tap outside image to close
          </div>
        </div>
      )}
    </div>
  )
}
