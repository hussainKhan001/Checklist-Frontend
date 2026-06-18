import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ConfirmProvider } from './context/ConfirmContext'
import ProtectedRoute from './components/ProtectedRoute'
import Header from './components/Header'
import Footer from './components/Footer'
import Login from './pages/Login'
import SelectProject from './pages/SelectProject'
import SelectFloor from './pages/SelectFloor'
import SelectLocation from './pages/SelectLocation'
import SelectTrade from './pages/SelectTrade'
import SelectElementForTrade from './pages/SelectElementForTrade'
import ChecklistForm from './pages/ChecklistForm'
import Dashboard from './pages/admin/Dashboard'
import Inspections from './pages/admin/Inspections'
import InspectionDetail from './pages/admin/InspectionDetail'
import Projects from './pages/admin/Projects'
import Floors from './pages/admin/Floors'
import Trades from './pages/admin/Trades'
import CheckPoints from './pages/admin/CheckPoints'
import ElementTrades from './pages/admin/ElementTrades'
import TradeElements from './pages/admin/TradeElements'
import Users from './pages/admin/Users'
import Roles from './pages/admin/Roles'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  return (
    <AuthProvider>
      <ConfirmProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', fontSize: '14px', fontWeight: 500 },
          success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
          error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Admin routes — each requires admin_access + page-specific permission */}
        <Route path="/admin"                             element={<ProtectedRoute permission="admin_access">    <Dashboard />       </ProtectedRoute>} />
        <Route path="/admin/inspections"                 element={<ProtectedRoute permission="view_inspections"><Inspections />      </ProtectedRoute>} />
        <Route path="/admin/inspections/:id"             element={<ProtectedRoute permission="view_inspections"><InspectionDetail /> </ProtectedRoute>} />
        <Route path="/admin/projects"                    element={<ProtectedRoute permission="view_projects">   <Projects />         </ProtectedRoute>} />
        <Route path="/admin/projects/:projectId/floors"  element={<ProtectedRoute permission="view_projects">   <Floors />           </ProtectedRoute>} />
        <Route path="/admin/trades"                      element={<ProtectedRoute permission="view_trades">     <Trades />           </ProtectedRoute>} />
        <Route path="/admin/trades/:tradeId/checkpoints" element={<ProtectedRoute permission="view_trades">     <CheckPoints />      </ProtectedRoute>} />
        <Route path="/admin/elements/:elementId/trades"  element={<ProtectedRoute permission="view_trades">     <ElementTrades />    </ProtectedRoute>} />
        <Route path="/admin/trades/:tradeId/elements"    element={<ProtectedRoute permission="view_trades">     <TradeElements />    </ProtectedRoute>} />
        <Route path="/admin/users"                       element={<ProtectedRoute permission="manage_users">    <Users />            </ProtectedRoute>} />
        <Route path="/admin/roles"                       element={<ProtectedRoute permission="manage_roles">    <Roles />            </ProtectedRoute>} />

        {/* Site flow — requires any site permission (view_sites / submit_forms / upload_photo) */}
        <Route path="/*" element={
          <ProtectedRoute permission="site">
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
              <Header theme={theme} toggleTheme={toggleTheme} />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<SelectProject />} />
                  <Route path="/p/:projectId" element={<SelectFloor />} />
                  <Route path="/p/:projectId/f/:floorId" element={<SelectLocation />} />
                  <Route path="/p/:projectId/f/:floorId/l/:locationId" element={<SelectTrade />} />
                  <Route path="/p/:projectId/f/:floorId/l/:locationId/t/:tradeId" element={<SelectElementForTrade />} />
                  <Route path="/c/:tradeId" element={<ChecklistForm />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
      </Routes>
      </ConfirmProvider>
    </AuthProvider>
  )
}
