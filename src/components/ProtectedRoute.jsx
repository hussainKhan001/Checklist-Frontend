import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SITE_PERMS = ['view_sites', 'submit_forms', 'upload_photo']

export default function ProtectedRoute({ children, permission }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // ── Site flow gate ────────────────────────────────────────────────────────────
  // Any site permission grants access to the site flow UI.
  // Users with ONLY admin_access (no site perms) get sent to the admin panel.
  if (permission === 'site') {
    const hasSiteAccess = user.permissions?.some(p => SITE_PERMS.includes(p))
    if (!hasSiteAccess) {
      return user.permissions?.includes('admin_access')
        ? <Navigate to="/admin" replace />
        : <Navigate to="/login" replace />
    }
    return children
  }

  // ── Admin gate ────────────────────────────────────────────────────────────────
  // Level 1: must have admin_access to enter the panel
  if (!user.permissions?.includes('admin_access')) {
    return <Navigate to="/" replace />
  }

  // Level 2: page-specific permission within the panel
  if (permission && permission !== 'admin_access' && !user.permissions?.includes(permission)) {
    return <Navigate to="/admin" replace />
  }

  return children
}
