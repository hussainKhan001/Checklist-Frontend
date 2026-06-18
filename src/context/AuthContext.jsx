import { createContext, useContext, useState, useEffect } from 'react'
import { getMe, loginUser } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      getMe()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await loginUser(email, password)
    const { token, user: u } = res.data
    localStorage.setItem('token', token)
    setUser(u)
    return u
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const res = await getMe()
      setUser(res.data)
    } catch {
      // token expired etc — leave user state as-is
    }
  }

  const hasPermission = (perm) => !!(user?.permissions?.includes(perm))

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
