const VARIANTS = {
  orange:  'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
  blue:    'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  purple:  'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  green:   'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  amber:   'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  red:     'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
  gray:    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
}

export default function Badge({ children, variant = 'gray' }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${VARIANTS[variant] || VARIANTS.gray}`}>
      {children}
    </span>
  )
}
