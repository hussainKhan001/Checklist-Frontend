import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Building2, Mail, Lock, LogIn, ClipboardList } from 'lucide-react'
import { PORTAL_PERMS, getPortalRoute } from '../constants/permissions'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const { login }   = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()

  // Where the user was trying to go before being sent to login
  const intendedPath = location.state?.from

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user  = await login(email, password)
      const perms = user.permissions || []

      if (!perms.length) {
        setError('Your account has no active permissions. Contact your administrator.')
        return
      }

      // If the user was redirected here from a specific portal page, send them back
      if (intendedPath && intendedPath !== '/login') {
        navigate(intendedPath, { replace: true })
        return
      }

      // Route based on what the user can access
      const hasPortal = perms.some(p => PORTAL_PERMS.includes(p))
      if (hasPortal) navigate(getPortalRoute(perms), { replace: true })
      else           navigate('/', { replace: true }) // form-only user
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/80 dark:border-gray-700/50 p-8">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Neoteric Site QC</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={inputCls}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@neotericgrp.in"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={inputCls}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Single sign-in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg shadow-sm shadow-orange-500/30 transition-colors mt-2"
            >
              {loading ? 'Signing in…' : <><LogIn className="w-4 h-4" /> Sign In</>}
            </button>
          </form>

          {/* Non-auth link — routes to site flow; ProtectedRoute will bounce back here if not logged in */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              Go to Inspection Form
            </Link>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-5">
            Neoteric Group · Quality records are legal-grade documents.
          </p>
        </div>
      </div>
    </div>
  )
}
