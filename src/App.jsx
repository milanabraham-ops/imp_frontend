import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RequireRole from './components/auth/RequireRole'
import LoginPage from './components/auth/LoginPage'
import ChangePasswordPage from './components/auth/ChangePasswordPage'
import Dashboard from './components/dashboard/Dashboard'
import StatsOverview from './components/dashboard/StatsOverview'
import AdminUsers from './components/dashboard/AdminUsers'
import AdminSettings from './components/dashboard/AdminSettings'
import FormWizard from './components/form/FormWizard'
import NewSubmissionEntry from './components/form/NewSubmissionEntry'
import GroupDetail from './components/form/GroupDetail'
import ActivityLog from './components/dashboard/ActivityLog'
import PipelineBoard from './components/dashboard/PipelineBoard'
import IntegrationBoard from './components/dashboard/IntegrationBoard'
import IntegrationGroupDetail from './components/dashboard/IntegrationGroupDetail'
import ForwardingNumbersPage from './components/dashboard/ForwardingNumbersPage'
import IntegrationDocsPage from './components/dashboard/IntegrationDocsPage'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <NotificationProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <StatsOverview />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <RequireRole roles={['poc', 'admin']}>
                      <Dashboard />
                    </RequireRole>
                  }
                />
                <Route
                  path="/new"
                  element={
                    <RequireRole roles={['poc', 'admin']}>
                      <NewSubmissionEntry />
                    </RequireRole>
                  }
                />
                <Route
                  path="/groups/:id"
                  element={
                    <RequireRole roles={['poc', 'admin']}>
                      <GroupDetail />
                    </RequireRole>
                  }
                />
                <Route
                  path="/groups/:groupId/new"
                  element={
                    <RequireRole roles={['poc', 'admin']}>
                      <FormWizard mode="create" />
                    </RequireRole>
                  }
                />
                <Route
                  path="/submissions/:id"
                  element={
                    <ProtectedRoute>
                      <FormWizard mode="edit" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pipeline"
                  element={
                    <RequireRole roles={['specialist', 'qa', 'admin']}>
                      <PipelineBoard />
                    </RequireRole>
                  }
                />
                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute>
                      <IntegrationBoard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations/groups/:id"
                  element={
                    <ProtectedRoute>
                      <IntegrationGroupDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forwarding-numbers"
                  element={
                    <ProtectedRoute>
                      <ForwardingNumbersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integration-docs"
                  element={
                    <ProtectedRoute>
                      <IntegrationDocsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RequireRole roles={['admin']}>
                      <AdminUsers />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <RequireRole roles={['admin']}>
                      <AdminSettings />
                    </RequireRole>
                  }
                />
                <Route
                  path="/activity"
                  element={
                    <ProtectedRoute>
                      <ActivityLog />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
