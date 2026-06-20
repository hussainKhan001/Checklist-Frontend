import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ConfirmProvider } from './context/ConfirmContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
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
import ChecklistMatrix from './pages/admin/ChecklistMatrix'
import SiteProgress from './pages/admin/SiteProgress'
import Profile from './pages/admin/Profile'

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
            error:   { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
          }}
        />
        <Routes>
          {/* ── Public login — redirect away if already logged in ─────────── */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* ── Portal — requires any portal permission ───────────────────── */}
          <Route path="/dashboard"                         element={<ProtectedRoute>                                       <Dashboard />       </ProtectedRoute>} />
          <Route path="/profile"                           element={<ProtectedRoute>                                       <Profile />         </ProtectedRoute>} />
          <Route path="/inspections"                       element={<ProtectedRoute permission="view_inspections">         <Inspections />     </ProtectedRoute>} />
          <Route path="/inspections/:id"                   element={<ProtectedRoute permission="view_inspections">         <InspectionDetail /></ProtectedRoute>} />
          <Route path="/checklist"                         element={<ProtectedRoute permission="view_inspections">         <ChecklistMatrix /> </ProtectedRoute>} />
          <Route path="/progress"                          element={<ProtectedRoute permission="view_inspections">         <SiteProgress />    </ProtectedRoute>} />
          <Route path="/projects"                          element={<ProtectedRoute permission="view_projects">            <Projects />        </ProtectedRoute>} />
          <Route path="/projects/:projectId/floors"        element={<ProtectedRoute permission="view_projects">            <Floors />          </ProtectedRoute>} />
          <Route path="/trades"                            element={<ProtectedRoute permission="view_trades">              <Trades />          </ProtectedRoute>} />
          <Route path="/trades/:tradeId/checkpoints"       element={<ProtectedRoute permission="view_trades">              <CheckPoints />     </ProtectedRoute>} />
          <Route path="/elements/:elementId/trades"        element={<ProtectedRoute permission="view_trades">              <ElementTrades />   </ProtectedRoute>} />
          <Route path="/trades/:tradeId/elements"          element={<ProtectedRoute permission="view_trades">              <TradeElements />   </ProtectedRoute>} />
          <Route path="/users"                             element={<ProtectedRoute permission="manage_users">             <Users />           </ProtectedRoute>} />
          <Route path="/roles"                             element={<ProtectedRoute permission="manage_roles">             <Roles />           </ProtectedRoute>} />

          {/* ── Public inspection form — no login required ────────────────── */}
          <Route path="/*" element={
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
              <Header theme={theme} toggleTheme={toggleTheme} />
              <main className="flex-1">
                <Routes>
                  <Route path="/"                                                        element={<SelectProject />}       />
                  <Route path="/p/:projectId"                                            element={<SelectFloor />}         />
                  <Route path="/p/:projectId/f/:floorId"                                element={<SelectLocation />}      />
                  <Route path="/p/:projectId/f/:floorId/l/:locationId"                  element={<SelectTrade />}         />
                  <Route path="/p/:projectId/f/:floorId/l/:locationId/t/:tradeId"       element={<SelectElementForTrade />}/>
                  <Route path="/c/:tradeId"                                              element={<ChecklistForm />}       />
                </Routes>
              </main>
              <Footer />
            </div>
          } />
        </Routes>
      </ConfirmProvider>
    </AuthProvider>
  )
}
