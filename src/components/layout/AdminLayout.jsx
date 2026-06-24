import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, ClipboardList, FolderOpen, Layers, Users,
  ArrowLeft, LogOut, Menu, Building2, ShieldCheck, LayoutGrid,
  Sun, Moon, ExternalLink, TrendingUp, ClipboardCheck, MapPin,
  Settings2,
} from 'lucide-react'

const ALL_NAV = [
  { to: '/dashboard',   label: 'Dashboard',         icon: LayoutDashboard, end: true                          },
  { to: '/inspections', label: 'Inspections',       icon: ClipboardList,   permission: 'view_inspections'    },
  { to: '/checklist',   label: 'Overview Matrix',   icon: LayoutGrid,      permission: 'view_inspections'    },
  { to: '/progress',    label: 'Site Progress',     icon: TrendingUp,      permission: 'view_inspections'    },
  { to: '/manage',      label: 'Site Manager',      icon: Settings2,       permission: 'view_trades'         },
  { to: '/trades',      label: 'Checklist Templates', icon: ClipboardCheck, permission: 'view_trades'         },
  { to: '/users',       label: 'Users',             icon: Users,           permission: 'manage_users'        },
  { to: '/roles',       label: 'Roles',             icon: ShieldCheck,     permission: 'manage_roles'        },
]

const ROLE_CHIP_CLS = [
  'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
  'bg-blue-100   dark:bg-blue-500/20   text-blue-600   dark:text-blue-400',
  'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
  'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  'bg-gray-100   dark:bg-gray-700      text-gray-500   dark:text-gray-400',
]
// Pick a colour based on the role name so every role gets a consistent chip colour
function roleCls(name = '') {
  const idx = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % ROLE_CHIP_CLS.length
  return ROLE_CHIP_CLS[idx]
}

function SidebarContent({ collapsed, mobile, onClose, user, onLogout, onNavigate }) {
  const nav = ALL_NAV.filter(n => !n.permission || user?.permissions?.includes(n.permission))
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
            <div className="text-[10px] text-orange-500 font-semibold">Portal</div>
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
        {nav.map(({ to, label, icon: Icon, end }) => (
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
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow" />
              : <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow">{user?.name?.[0]?.toUpperCase()}</div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user?.name}</div>
                {user?.role && (Array.isArray(user.role) ? user.role : [user.role]).map(r => (
                  <span key={r} className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${roleCls(r)}`}>
                    {r}
                  </span>
                ))}
              </div>
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
  const navigate   = useNavigate()
  const location   = useLocation()
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const menuRef = useRef(null)

  const handleLogout = () => { logout(); navigate('/login') }

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const currentNav = ALL_NAV.find(n =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )
  const pageLabel = currentNav?.label || 'Portal'
  const roles = user?.role ? (Array.isArray(user.role) ? user.role : [user.role]) : []

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 z-20
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
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] flex flex-col
          bg-white dark:bg-gray-800 shadow-2xl transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent mobile user={user} onLogout={handleLogout} onNavigate={navigate} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top Navbar ───────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 lg:px-6 h-16 flex-shrink-0 z-40
          bg-white dark:bg-gray-900
          border-b border-gray-200 dark:border-gray-700/60
          shadow-sm">

          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — desktop: collapse sidebar | mobile: open drawer */}
            <button
              onClick={() => { if (window.innerWidth >= 1024) setCollapsed(c => !c); else setMobileOpen(true) }}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-400 dark:text-gray-500 truncate hidden sm:block">
              Neoteric QC&nbsp;
              <span className="text-gray-900 dark:text-white font-bold">/ {pageLabel}</span>
            </span>
            <span className="text-sm text-gray-900 dark:text-white font-bold sm:hidden">{pageLabel}</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
            </button>

            {/* Site form link */}
            <button
              onClick={() => navigate('/')}
              title="Go to inspection form"
              className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ExternalLink className="w-[18px] h-[18px]" />
            </button>

            {/* Divider */}
            <div className="h-7 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* User avatar + dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-colors
                  ${userMenuOpen
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm" />
                  : <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">{user?.name?.[0]?.toUpperCase()}</div>
                }
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white leading-none truncate max-w-[110px]">{user?.name}</div>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {roles.map(r => (
                      <span key={r} className={`px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wide ${roleCls(r)}`}>{r}</span>
                    ))}
                  </div>
                </div>
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-68 w-64
                  bg-white dark:bg-gray-900
                  border border-gray-200 dark:border-gray-700
                  rounded-2xl shadow-2xl overflow-hidden z-[100]">

                  {/* User info header */}
                  <div className="px-4 py-4 flex items-center gap-3 bg-gray-50 dark:bg-gray-800/60">
                    <div className="relative flex-shrink-0">
                      {user?.avatar
                        ? <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-full object-cover shadow" />
                        : <div className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow">{user?.name?.[0]?.toUpperCase()}</div>
                      }
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</div>
                      <div className="flex flex-wrap gap-1 my-0.5">
                        {roles.map(r => (
                          <span key={r} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${roleCls(r)}`}>{r}</span>
                        ))}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-700/60" />

                  {/* Menu items */}
                  <div className="py-1.5 px-1.5">
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/profile') }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Users className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      Profile
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/') }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      Go to Inspection Form
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); toggleTheme() }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {theme === 'light'
                        ? <Moon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                        : <Sun  className="w-4 h-4 flex-shrink-0 text-gray-400" />}
                      {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    </button>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-700/60" />

                  {/* Sign out */}
                  <div className="py-1.5 px-1.5">
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout() }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

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

