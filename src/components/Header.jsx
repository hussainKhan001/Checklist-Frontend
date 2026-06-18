import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sun, Moon, LogOut, ShieldCheck } from 'lucide-react'

export default function Header({ theme, toggleTheme }) {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 mx-2 mt-2 mb-0 rounded-xl
      bg-white/80 dark:bg-gray-800/90 backdrop-blur-md
      shadow-sm border border-gray-200/50 dark:border-gray-700/50
      transition-colors duration-300">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">

        {/* Left */}
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0 shadow shadow-orange-500/30">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 dark:text-white">Neoteric Site QC</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 hidden md:block truncate max-w-xs">
              Every check point exists because something once cracked, leaked, or collapsed.
            </div>
          </div>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          {hasPermission('admin_access') && (
            <Link
              to="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                text-orange-600 dark:text-orange-400
                bg-orange-50 dark:bg-orange-500/10
                hover:bg-orange-100 dark:hover:bg-orange-500/20
                border border-orange-200/60 dark:border-orange-500/20
                transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Panel
            </Link>
          )}

          {user && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 ml-1">
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-gray-900 dark:text-white leading-none">{user.name}</div>
                <div className="text-[10px] text-orange-500 capitalize font-medium mt-0.5">{user.role}</div>
              </div>
            </div>
          )}

          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {user && (
            <button
              onClick={() => { logout(); navigate('/login') }}
              title="Logout"
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
