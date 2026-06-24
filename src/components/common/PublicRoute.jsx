import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PORTAL_PERMS, getPortalRoute } from '../../constants/permissions'

// Only renders children when the user is NOT logged in.
// If a session is already active, redirect to the appropriate destination.
export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  if (user) {
    const perms = user.permissions || []
    const hasPortal = perms.some(p => PORTAL_PERMS.includes(p))
    if (hasPortal) return <Navigate to={getPortalRoute(perms)} replace />
    // Logged in but only has site perms — send to form
    return <Navigate to="/" replace />
  }

  return children
}

