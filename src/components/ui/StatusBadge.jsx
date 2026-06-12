const STATUS_MAP = {
  SUBMITTED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  DRAFT:     'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  APPROVED:  'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  REJECTED:  'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
}

export default function StatusBadge({ status }) {
  const cls = STATUS_MAP[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  )
}
