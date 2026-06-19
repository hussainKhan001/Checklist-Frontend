import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PORTAL_PERMS } from '../constants/permissions'

export default function ProtectedRoute({ children, permission }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
    </div>
  )

  // Not logged in → save intended URL so login redirects back after sign-in
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  // ── Portal gate ────────────────────────────────────────────────────────────
  // Any user with at least one portal permission can access the portal.
  // Users with only site permissions (view_sites / submit_forms / upload_photo)
  // are sent back to the public form.
  const hasPortalAccess = user.permissions?.some(p => PORTAL_PERMS.includes(p))
  if (!hasPortalAccess) return <Navigate to="/" replace />

  // ── Page-specific permission gate ─────────────────────────────────────────
  if (permission && !user.permissions?.includes(permission)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
