import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import AppLayout from './layout/AppLayout.jsx'
import LoadingState from './components/LoadingState.jsx'
import { useAuth } from './context/useAuth.jsx'
import AchievementsPage from './pages/AchievementsPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import EmployeesPage from './pages/EmployeesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MetadataPage from './pages/MetadataPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import TeamsPage from './pages/TeamsPage.jsx'

/**
 * Gate protected routes behind the current authentication state.
 *
 * @returns {JSX.Element}
 */
function ProtectedRoutes() {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return <LoadingState message="Restoring your workshop session..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

/**
 * Render the routed application shell.
 *
 * @returns {JSX.Element}
 */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoutes />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/metadata" element={<MetadataPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}

export default App
