import { Link } from 'react-router-dom'

export default function StatCard({ label, value, icon: Icon, bg, text, border, to }) {
  const inner = (
    <>
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${text}`} />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value ?? 0}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{label}</div>
    </>
  )
  const cls = `rounded-xl border ${border} bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow block`
  return to
    ? <Link to={to} className={`${cls} hover:-translate-y-0.5 transition-all duration-200`}>{inner}</Link>
    : <div className={cls}>{inner}</div>
}
