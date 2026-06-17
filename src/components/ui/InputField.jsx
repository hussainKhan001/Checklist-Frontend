const cls = "w-full px-3 py-2 text-sm bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"

export default function InputField({ label, required, as = 'input', children, className = '', ...props }) {
  const Tag = as
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}{required && ' *'}
        </label>
      )}
      <Tag className={`${cls} ${className}`} {...props}>
        {children}
      </Tag>
    </div>
  )
}
