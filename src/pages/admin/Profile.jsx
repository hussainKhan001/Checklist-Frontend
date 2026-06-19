import { useState, useRef } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { updateProfile, updatePassword, uploadAvatar } from '../../api'
import { Camera, Mail, ShieldCheck, Save, Lock, Eye, EyeOff, User } from 'lucide-react'
import toast from 'react-hot-toast'

function Avatar({ user, size = 'lg' }) {
  const dim = size === 'xl' ? 'w-24 h-24 sm:w-32 sm:h-32 text-4xl sm:text-5xl' : size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-10 h-10 text-sm'
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} className={`${dim} rounded-full object-cover shadow-inner`} />
  }
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-inner`}>
      {user?.name?.[0]?.toUpperCase()}
    </div>
  )
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const fileRef = useRef(null)
  const roles = user?.role ? (Array.isArray(user.role) ? user.role : [user.role]) : []

  const [name,        setName]        = useState(user?.name || '')
  const [nameLoading, setNameLoading] = useState(false)

  const [pw, setPw]         = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [pwLoading, setPwLoading] = useState(false)

  const [avatarLoading, setAvatarLoading] = useState(false)

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('avatar', file)
    setAvatarLoading(true)
    try {
      const res = await uploadAvatar(fd)
      updateUser({ avatar: res.data.avatar })
      toast.success('Profile photo updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setAvatarLoading(false)
      e.target.value = ''
    }
  }

  const handleNameSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setNameLoading(true)
    try {
      await updateProfile({ name: name.trim() })
      updateUser({ name: name.trim() })
      toast.success('Name updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update name')
    } finally {
      setNameLoading(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) { toast.error('New passwords do not match'); return }
    if (pw.next.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setPwLoading(true)
    try {
      await updatePassword({ currentPassword: pw.current, newPassword: pw.next })
      setPw({ current: '', next: '', confirm: '' })
      toast.success('Password changed successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  const inputCls = 'w-full pl-11 pr-4 py-3 text-sm bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 shadow-sm'

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        
        {/* Identity Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0 self-start">
            {avatarLoading ? (
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <Avatar user={user} size="lg" />
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg text-white transition-colors disabled:opacity-50"
              title="Change photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h1>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {roles.map(r => (
                <span key={r} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-500/20">
                  <ShieldCheck className="w-3 h-3" />{r}
                </span>
              ))}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              {user?.avatar ? 'Change photo' : 'Upload photo'}
            </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Edit Name Card */}
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors duration-500 pointer-events-none" />
            
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3 relative z-10">
              <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 rounded-xl text-orange-500">
                <User className="w-5 h-5" />
              </div>
              Display Identity
            </h2>
            
            <form onSubmit={handleNameSave} className="space-y-5 relative z-10">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider pl-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required />
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={nameLoading || name.trim() === user?.name}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Save className="w-4 h-4" />
                  {nameLoading ? 'Saving changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl group-hover:bg-pink-500/10 transition-colors duration-500 pointer-events-none" />
            
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3 relative z-10">
              <div className="p-2.5 bg-pink-50 dark:bg-pink-500/10 rounded-xl text-pink-500">
                <Lock className="w-5 h-5" />
              </div>
              Security Settings
            </h2>
            
            <form onSubmit={handlePasswordSave} className="space-y-5 relative z-10">
              {[
                { key: 'current', label: 'Current Password',     placeholder: 'Enter current password' },
                { key: 'next',    label: 'New Password',          placeholder: 'At least 6 characters'  },
                { key: 'confirm', label: 'Confirm New Password',  placeholder: 'Repeat new password'    },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider pl-1">{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className={`${inputCls} pr-12`}
                      type={showPw[key] ? 'text' : 'password'}
                      value={pw[key]}
                      onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwLoading || !pw.current || !pw.next || !pw.confirm}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-600 hover:from-gray-900 hover:to-black dark:hover:from-gray-600 dark:hover:to-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Lock className="w-4 h-4" />
                  {pwLoading ? 'Updating Security…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
          
        </div>
      </div>
    </AdminLayout>
  )
}
