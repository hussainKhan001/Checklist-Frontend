const STATUS_MAP = {
  DRAFT:     { label: 'Draft',           cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  SUBMITTED: { label: 'Awaiting Review', cls: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  APPROVED:  { label: 'Approved ✓',      cls: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  REJECTED:  { label: 'Rework Needed',   cls: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400' },
}

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.DRAFT
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  )
}
