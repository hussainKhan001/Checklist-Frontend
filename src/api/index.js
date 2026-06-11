import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 15000,
})

// ── Request: attach JWT ───────────────────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: handle 401 (expired / invalid token) ───────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      // Redirect to login only if not already there
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginUser = (email, password) => api.post('/auth/login', { email, password })
export const getMe = () => api.get('/auth/me')

// ── Public data (user flow) ───────────────────────────────────────────────────
export const getProjects = () => api.get('/projects')
export const getProject = (id) => api.get(`/projects/${id}`)
export const getFloors = (projectId) => api.get(`/floors?projectId=${projectId}`)
export const getFloor = (id) => api.get(`/floors/${id}`)
export const getLocations = (floorId) => api.get(`/locations?floorId=${floorId}`)
export const getTrades = () => api.get('/trades')
export const getTrade = (id) => api.get(`/trades/${id}`)
export const getCheckPoints = (tradeId) => api.get(`/checkpoints?tradeId=${tradeId}`)
export const getInspections = () => api.get('/inspections')
export const createInspection = (data) => api.post('/inspections', data)
export const updateInspection = (id, data) => api.put(`/inspections/${id}`, data)
export const submitInspection = (id, data) => api.post(`/inspections/${id}/submit`, data)
export const uploadPhoto = (formData) =>
  api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminGetStats = () => api.get('/admin/stats')

export const adminGetProjects = () => api.get('/admin/projects')
export const adminCreateProject = (data) => api.post('/admin/projects', data)
export const adminUpdateProject = (id, data) => api.put(`/admin/projects/${id}`, data)
export const adminDeleteProject = (id) => api.delete(`/admin/projects/${id}`)

export const adminGetFloors = (projectId) => api.get(`/admin/floors${projectId ? `?projectId=${projectId}` : ''}`)
export const adminCreateFloor = (data) => api.post('/admin/floors', data)
export const adminUpdateFloor = (id, data) => api.put(`/admin/floors/${id}`, data)
export const adminDeleteFloor = (id) => api.delete(`/admin/floors/${id}`)

export const adminGetLocations = (floorId) => api.get(`/admin/locations${floorId ? `?floorId=${floorId}` : ''}`)
export const adminCreateLocation = (data) => api.post('/admin/locations', data)
export const adminUpdateLocation = (id, data) => api.put(`/admin/locations/${id}`, data)
export const adminDeleteLocation = (id) => api.delete(`/admin/locations/${id}`)

export const adminGetTrades = () => api.get('/admin/trades')
export const adminCreateTrade = (data) => api.post('/admin/trades', data)
export const adminUpdateTrade = (id, data) => api.put(`/admin/trades/${id}`, data)
export const adminDeleteTrade = (id) => api.delete(`/admin/trades/${id}`)

export const adminGetCheckPoints = (tradeId) => api.get(`/admin/checkpoints${tradeId ? `?tradeId=${tradeId}` : ''}`)
export const adminCreateCheckPoint = (data) => api.post('/admin/checkpoints', data)
export const adminUpdateCheckPoint = (id, data) => api.put(`/admin/checkpoints/${id}`, data)
export const adminDeleteCheckPoint = (id) => api.delete(`/admin/checkpoints/${id}`)

export const adminGetInspections = (status) => api.get(`/admin/inspections${status ? `?status=${status}` : ''}`)
export const adminGetInspection = (id) => api.get(`/admin/inspections/${id}`)
export const adminUpdateInspection = (id, data) => api.put(`/admin/inspections/${id}`, data)
export const adminDeleteInspection = (id) => api.delete(`/admin/inspections/${id}`)

export const adminGetUsers = () => api.get('/admin/users')
export const adminCreateUser = (data) => api.post('/admin/users', data)
export const adminUpdateUser = (id, data) => api.put(`/admin/users/${id}`, data)
export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`)
