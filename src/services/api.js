import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 10000,
  headers: { 'Accept-Encoding': 'gzip, deflate, br' },
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
export const loginUser      = (email, password) => api.post('/auth/login', { email, password })
export const getMe          = () => api.get('/auth/me')
export const updateProfile  = (data) => api.patch('/auth/profile', data)
export const updatePassword = (data) => api.patch('/auth/password', data)
export const uploadAvatar   = (formData) => api.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// ── Public data (user flow) ───────────────────────────────────────────────────
export const getProjects = () => api.get('/projects')
export const getProject = (id) => api.get(`/projects/${id}`)
export const getFloors = (projectId) => api.get(`/floors?projectId=${projectId}`)
export const getFloor = (id) => api.get(`/floors/${id}`)
export const getLocations = (floorId) => api.get(`/locations?floorId=${floorId}`)
export const getElements = (locationId) => api.get(`/elements?locationId=${locationId}`)
export const getTrades = (elementId) => api.get(`/trades${elementId ? `?elementId=${elementId}` : ''}`)
export const getTrade = (id) => api.get(`/trades/${id}`)
export const getCheckPoints = (tradeId, projectId, elementId) => api.get(`/checkpoints?tradeId=${tradeId}${projectId ? `&projectId=${projectId}` : ''}${elementId ? `&elementId=${elementId}` : ''}`)
export const getInspections = (params = {}) => api.get('/inspections', { params })
export const getDraftInspection = (params) => api.get('/inspections/draft', { params })
export const checkDuplicateInspection = (params) => api.get('/inspections/check-duplicate', { params })
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

export const adminGetElements = (locationId) => api.get(`/admin/elements${locationId ? `?locationId=${locationId}` : ''}`)
export const adminGetElement  = (id) => api.get(`/admin/elements/${id}`)

export const getTradeElements = (tradeId, locationId) => api.get(`/trade-elements?tradeId=${tradeId}${locationId ? `&locationId=${locationId}` : ''}`)
export const adminGetTradeElements = (tradeId) => api.get(`/admin/trade-elements?tradeId=${tradeId}`)
export const adminGetTradeElementsByLocation = (locationId) => api.get(`/admin/trade-elements?locationId=${locationId}`)
export const adminCreateTradeElement = (data) => api.post('/admin/trade-elements', data)
export const adminDeleteTradeElement = (id) => api.delete(`/admin/trade-elements/${id}`)
export const adminCreateElement = (data) => api.post('/admin/elements', data)
export const adminUpdateElement = (id, data) => api.put(`/admin/elements/${id}`, data)
export const adminDeleteElement = (id) => api.delete(`/admin/elements/${id}`)

export const adminGetTrades = (elementId) => api.get(`/admin/trades${elementId ? `?elementId=${elementId}` : ''}`)
export const adminCreateTrade = (data) => api.post('/admin/trades', data)
export const adminUpdateTrade = (id, data) => api.put(`/admin/trades/${id}`, data)
export const adminDeleteTrade = (id) => api.delete(`/admin/trades/${id}`)

export const adminGetCheckPoints = (tradeId, projectId, elementId) => api.get(`/admin/checkpoints${tradeId ? `?tradeId=${tradeId}${projectId ? `&projectId=${projectId}` : ''}${elementId ? `&elementId=${elementId}` : ''}` : ''}`)
export const adminCreateCheckPoint = (data) => api.post('/admin/checkpoints', data)
export const adminUpdateCheckPoint = (id, data) => api.put(`/admin/checkpoints/${id}`, data)
export const adminDeleteCheckPoint = (id) => api.delete(`/admin/checkpoints/${id}`)

export const adminGetInspections = (params = {}) => {
  const p = typeof params === 'string' ? { status: params } : params
  return api.get('/admin/inspections', { params: p })
}
export const adminGetInspection      = (id)       => api.get(`/admin/inspections/${id}`)
export const adminUpdateInspection   = (id, data) => api.put(`/admin/inspections/${id}`, data)
export const adminApproveInspection  = (id, data) => api.post(`/admin/inspections/${id}/approve`, data)
export const adminRejectInspection   = (id, data) => api.post(`/admin/inspections/${id}/reject`, data)
export const adminDeleteInspection   = (id)       => api.delete(`/admin/inspections/${id}`)

export const adminGetMatrix        = (params)    => api.get('/admin/matrix',         { params: { ...params, _t: Date.now() } })
export const adminGetProjectMatrix = (projectId) => api.get('/admin/project-matrix', { params: { projectId, _t: Date.now() } })

export const adminGetUsers = () => api.get('/admin/users')
export const adminCreateUser = (data) => api.post('/admin/users', data)
export const adminUpdateUser = (id, data) => api.put(`/admin/users/${id}`, data)
export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`)

export const adminGetRoles = () => api.get('/admin/roles')
export const adminCreateRole = (data) => api.post('/admin/roles', data)
export const adminUpdateRole = (id, data) => api.put(`/admin/roles/${id}`, data)
export const adminDeleteRole = (id) => api.delete(`/admin/roles/${id}`)

// ── Site Progress ─────────────────────────────────────────────────────────────
export const adminGetProgressSummary  = (projectId) => api.get('/admin/progress/summary',  { params: { projectId, _t: Date.now() } })
export const adminGetProgressPlans    = (projectId) => api.get('/admin/progress/plans',    { params: { projectId } })
export const adminUpsertProgressPlan  = (data)      => api.put('/admin/progress/plans', data)
export const adminDeleteProgressPlan  = (id)        => api.delete(`/admin/progress/plans/${id}`)
export const adminGetMilestones       = (projectId) => api.get('/admin/progress/milestones', { params: { projectId } })
export const adminCreateMilestone     = (data)      => api.post('/admin/progress/milestones', data)
export const adminUpdateMilestone     = (id, data)  => api.put(`/admin/progress/milestones/${id}`, data)
export const adminDeleteMilestone     = (id)        => api.delete(`/admin/progress/milestones/${id}`)

// ── Contractor Reports ─────────────────────────────────────────────────────────
export const submitContractorReport      = (data)               => api.post('/contractor-reports', data)
export const adminGetContractorReports   = (params = {}, signal) => api.get('/admin/contractor-reports', { params, signal })
export const adminUpdateContractorReport = (id, data)           => api.patch(`/contractor-reports/${id}`, data)
export const adminDeleteContractorReport = (id)                 => api.delete(`/admin/contractor-reports/${id}`)

// ── Drawing Requests ───────────────────────────────────────────────────────────
export const submitDrawingRequest        = (data)               => api.post('/drawing-requests', data)
export const adminGetDrawingRequests     = (params = {}, signal) => api.get('/drawing-requests', { params, signal })
export const adminUpdateDrawingRequest   = (id, data)           => api.patch(`/drawing-requests/${id}`, data)
export const adminDeleteDrawingRequest   = (id)                 => api.delete(`/drawing-requests/${id}`)

// ── Daily Site Reports ─────────────────────────────────────────────────────────
export const submitDailySiteReport       = (data)               => api.post('/site-reports', data)
export const adminGetDailySiteReports    = (params = {}, signal) => api.get('/site-reports', { params, signal })
export const adminUpdateDailySiteReport  = (id, data)           => api.patch(`/site-reports/${id}`, data)
export const adminDeleteDailySiteReport  = (id)                 => api.delete(`/site-reports/${id}`)
