import { Link } from 'react-router-dom'
import { HardHat, ClipboardCheck, PenLine, FileText } from 'lucide-react'

const CARDS = [
  {
    icon: HardHat,
    bg: 'bg-orange-500',
    glow: 'group-hover:shadow-orange-500/20',
    title: 'Daily Labour Report',
    desc: 'Submit daily labour count, shift type, and work details for the site.',
    to: '/labour-form',
  },
  {
    icon: ClipboardCheck,
    bg: 'bg-blue-500',
    glow: 'group-hover:shadow-blue-500/20',
    title: 'QC Inspection',
    desc: 'Start a quality control inspection — select project, floor, and location.',
    to: '/',
  },
  {
    icon: PenLine,
    bg: 'bg-violet-600',
    glow: 'group-hover:shadow-violet-500/20',
    title: 'Drawing Request',
    desc: 'Submit a new drawing request — architectural, structural, MEP, and more.',
    to: '/drawing-request-form',
  },
  {
    icon: FileText,
    bg: 'bg-emerald-600',
    glow: 'group-hover:shadow-emerald-500/20',
    title: 'Daily Site Report',
    desc: 'Record today\'s site activity — work type, description, and photos.',
    to: '/site-report-form',
  },
]

export default function PublicPortal() {
  return (
    <div className="min-h-[80vh] bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3">
            Neoteric Site QC
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            Public <span className="text-orange-500">Access</span> Portal
          </h1>
          <p className="text-gray-500 text-sm">
            Select a form to continue. No login required.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARDS.map(card => (
            <Link
              key={card.to}
              to={card.to}
              className={`group bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4 hover:border-gray-600 hover:shadow-xl ${card.glow} transition-all duration-200`}
            >
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0 shadow-md`}>
                <card.icon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <h2 className="text-white font-semibold text-sm">{card.title}</h2>
                <p className="text-gray-500 text-xs leading-relaxed">{card.desc}</p>
              </div>
              <span className="text-orange-500 text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                Open Form <span>→</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-gray-700 text-xs mt-8">
          Powered by Neoteric Group · All submissions are recorded and tracked
        </p>
      </div>
    </div>
  )
}
