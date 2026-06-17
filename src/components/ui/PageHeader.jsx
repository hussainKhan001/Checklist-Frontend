import { Plus } from 'lucide-react'

export default function PageHeader({ title, subtitle, onAdd, addLabel = 'Add' }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-orange-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      )}
    </div>
  )
}
