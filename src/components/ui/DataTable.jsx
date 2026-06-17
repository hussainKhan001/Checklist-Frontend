export default function DataTable({ columns, data, keyField = '_id', emptyText = 'No data yet.', loading = false, colSpan }) {
  const span = colSpan || columns.length

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
  )

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              {columns.map(col => (
                <th key={col.label} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {data.map((row, i) => (
              <tr key={row[keyField] || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                {columns.map(col => (
                  <td key={col.label} className="px-4 py-3">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={span} className="px-4 py-12 text-center text-sm text-gray-400">{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
