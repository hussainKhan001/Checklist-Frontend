import { useAuth } from '../context/AuthContext'

export function usePermission(permission) {
  const { user } = useAuth()
  return user?.permissions?.includes(permission) ?? false
}

export function useAnyPermission(permissions) {
  const { user } = useAuth()
  return permissions.some(p => user?.permissions?.includes(p))
}
