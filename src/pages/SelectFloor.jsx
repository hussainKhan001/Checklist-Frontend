import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getFloors, getProject } from '../services/api'
import { ChevronRight, Map, ZoomIn, ZoomOut, X, FileText, ExternalLink } from 'lucide-react'
import Modal from '../components/common/Modal'

export default function SelectFloor() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [floors, setFloors]   = useState([])
  const [loading, setLoading] = useState(true)
  const [mapInfo, setMapInfo] = useState(null)  // { url, label }
  const [mapZoom, setMapZoom] = useState(1)
  const [mapListFloor, setMapListFloor] = useState(null)

  useEffect(() => {
    Promise.all([getProject(projectId), getFloors(projectId)])
      .then(([pRes, fRes]) => { setProject(pRes.data); setFloors(fRes.data) })
      .finally(() => setLoading(false))
  }, [projectId])

  const isPdfUrl = (url) => url?.toLowerCase().includes('.pdf') || url?.includes('/raw/upload/')

  const openSingleMap = (url, label, code) => {
    if (isPdfUrl(url)) {
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return
    }
    setMapZoom(1)
    setMapInfo({ url, label, code })
    setMapListFloor(null)
  }

  const openMap = (e, f) => {
    e.stopPropagation()
    const allMaps = []
    if (f.mapImage) allMaps.push({ name: 'Floor plan', url: f.mapImage })
    if (f.maps && f.maps.length > 0) allMaps.push(...f.maps)

    if (allMaps.length === 1) {
      openSingleMap(allMaps[0].url, f.label, f.code)
    } else if (allMaps.length > 1) {
      setMapListFloor({ ...f, allMaps })
    }
  }
  const closeMap = () => setMapInfo(null)

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading floors…</div>

  const regularFloors      = floors.filter(f => !f.isProjectLevel)
  const projectLevelAreas  = floors.filter(f => f.isProjectLevel)

  const hasAnyMap = (f) => f.mapImage || (f.maps && f.maps.length > 0)

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
          <div
            key={f._id}
            className="group relative flex flex-col items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-orange-400 hover:shadow-md hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-all cursor-pointer"
            onClick={() => navigate(`/p/${projectId}/f/${f._id}`)}
          >
            {/* Code + label */}
            <div className="flex flex-col items-center justify-center px-2 pt-4 pb-4 w-full aspect-square">
              <div className="text-lg font-bold text-orange-500 group-hover:scale-110 transition-transform">{f.code}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 text-center leading-tight">{f.label}</div>
            </div>

            {/* Map icon — top-right corner, only when map exists */}
            {hasAnyMap(f) && (
              <button
                onClick={(e) => openMap(e, f)}
                title="View floor map"
                className="absolute top-1.5 right-1.5 p-1 rounded-md
                  bg-teal-500 hover:bg-teal-600 active:bg-teal-700
                  text-white shadow-sm transition-colors"
              >
                <Map className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Project-level areas */}
      {projectLevelAreas.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Project-Level Areas</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectLevelAreas.map(f => (
              <div key={f._id} className="relative group">
                <div
                  onClick={() => navigate(`/p/${projectId}/f/${f._id}`)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{f.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Project-level area</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasAnyMap(f) && (
                      <button
                        onClick={(e) => openMap(e, f)}
                        title="View floor map"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-colors"
                      >
                        <Map className="w-3 h-3" /> Maps
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Selection Modal */}
      {mapListFloor && (
        <Modal title="Select Map to View" onClose={() => setMapListFloor(null)}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0"><Map className="w-4 h-4 text-teal-500" /></div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{mapListFloor.label} Maps</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mapListFloor.allMaps.map((mapObj, idx) => {
                const isPdf = isPdfUrl(mapObj.url)
                return isPdf ? (
                  <a
                    key={idx}
                    href={mapObj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700 hover:border-teal-400 hover:shadow-sm transition-all text-center no-underline"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 flex items-center justify-center shadow-sm">
                      <FileText className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="w-full">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{mapObj.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">PDF Document — tap to open</p>
                    </div>
                  </a>
                ) : (
                  <button
                    key={idx}
                    onClick={() => openSingleMap(mapObj.url, mapListFloor.label + ' - ' + mapObj.name, mapListFloor.code)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700 hover:border-teal-400 hover:shadow-sm transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 flex items-center justify-center shadow-sm">
                      <Map className="w-6 h-6 text-teal-500" />
                    </div>
                    <div className="w-full text-center">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{mapObj.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Image Map</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Full-screen floor map lightbox */}
      {mapInfo && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={closeMap}>
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-black/40 backdrop-blur-sm border-b border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-teal-400" />
              <span className="text-white text-sm font-semibold">{mapInfo.label}</span>
              <span className="text-white/40 text-xs hidden sm:inline">({mapInfo.code}) — Floor Map</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMapZoom(z => Math.min(+(z + 0.5).toFixed(1), 5))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
              <span className="text-white/50 text-xs w-9 text-center tabular-nums">{Math.round(mapZoom * 100)}%</span>
              <button onClick={() => setMapZoom(z => Math.max(+(z - 0.5).toFixed(1), 0.5))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
              <div className="w-px h-5 bg-white/20 mx-1" />
              <button onClick={closeMap} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Scrollable / zoomable image */}
          <div className="flex-1 overflow-auto" style={{ touchAction: 'pan-x pan-y pinch-zoom' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-center p-4 min-h-full">
              <img
                src={mapInfo.url}
                alt={`${mapInfo.label} floor map`}
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

          <div className="text-center py-2.5 text-[11px] text-white/25 flex-shrink-0 select-none">
            Pinch or use +/− to zoom · Tap outside to close
          </div>
        </div>
      )}
    </div>
  )
}
