import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ClipboardList, FolderOpen, Layers, Users,
  ArrowLeft, LogOut, Menu, ChevronRight, Building2
} from 'lucide-react'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/inspections', label: 'Inspections', icon: ClipboardList },
  { to: '/admin/projects', label: 'Projects', icon: FolderOpen },
  { to: '/admin/trades', label: 'Trades & Checklists', icon: Layers },
  { to: '/admin/users', label: 'Users', icon: Users },
]

function SidebarContent({ collapsed, mobile, onClose, user, onLogout, onNavigate }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-gray-100 dark:border-gray-700/50 flex-shrink-0 ${collapsed && !mobile ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">Neoteric QC</div>
            <div className="text-[10px] text-orange-500 font-semibold">Admin Panel</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {(!collapsed || mobile) && (
          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-3">
            Menu
          </div>
        )}
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => mobile && onClose()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative
              ${isActive
                ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500 font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
              } ${collapsed && !mobile ? 'justify-center' : ''}`
            }
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            {(!collapsed || mobile) && <span className="truncate">{label}</span>}
            {collapsed && !mobile && (
              <div className="absolute left-full ml-3 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-medium whitespace-nowrap z-[9999] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
                {label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-white dark:border-r-gray-800" />
              </div>
            )}
          </NavLink>
        ))}

        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700/50">
          <button
            onClick={() => { onNavigate('/'); mobile && onClose() }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200 ${collapsed && !mobile ? 'justify-center' : ''}`}
          >
            <ArrowLeft className="w-[18px] h-[18px] flex-shrink-0" />
            {(!collapsed || mobile) && <span>Back to Site</span>}
          </button>
        </div>
      </nav>

      {/* User footer */}
      <div className={`p-3 border-t border-gray-100 dark:border-gray-700/50 flex-shrink-0 ${collapsed && !mobile ? 'flex justify-center' : ''}`}>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            title="Logout"
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 relative z-[60]
          bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl
          border-r border-gray-100 dark:border-gray-700/50
          shadow-[0_8px_30px_rgb(0,0,0,0.04)]
          my-1 ml-1 rounded-xl
          ${collapsed ? 'w-[72px]' : 'w-64'}`}
      >
        <SidebarContent
          collapsed={collapsed}
          user={user}
          onLogout={handleLogout}
          onNavigate={navigate}
          onClose={() => {}}
        />
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-[72px] w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all text-gray-400 hover:text-orange-500"
        >
          <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] w-72 max-w-[85vw] flex flex-col
          bg-white dark:bg-gray-800 shadow-2xl
          transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent
          mobile
          user={user}
          onLogout={handleLogout}
          onNavigate={navigate}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 h-14 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 lg:hidden flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Neoteric QC</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-4">
          <div className="bg-white/60 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-700/30 rounded-xl shadow-sm min-h-full p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
