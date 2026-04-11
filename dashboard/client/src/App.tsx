import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './api/client'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import LogsPage from './pages/LogsPage'
import BackupPage from './pages/BackupPage'
import AutomationPage from './pages/AutomationPage'
import ActionsPage from './pages/ActionsPage'
import IncidentsPage from './pages/IncidentsPage'
import LoginPage from './pages/LoginPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="/backup" element={<BackupPage />} />
                  <Route path="/automation" element={<AutomationPage />} />
                  <Route path="/actions" element={<ActionsPage />} />
                  <Route path="/incidents" element={<IncidentsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
