import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { applyThemeConfig } from './api/services/themeService.js'
import ToastHost from './components/shared/ToastHost.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import PublicLayout from './layouts/PublicLayout.jsx'
import StudentLayout from './layouts/StudentLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import ApplicantsPage from './pages/admin/ApplicantsPage.jsx'
import ApprovalsPage from './pages/admin/ApprovalsPage.jsx'
import BatchesPage from './pages/admin/BatchesPage.jsx'
import BatchStudentsPage from './pages/admin/BatchStudentsPage.jsx'
import FeesPage from './pages/admin/FeesPage.jsx'
import AdminNotificationsPage from './pages/admin/NotificationsPage.jsx'
import SettingsPage from './pages/admin/SettingsPage.jsx'
import StudentsPage from './pages/admin/StudentsPage.jsx'
import TestBuilderPage from './pages/admin/TestBuilderPage.jsx'
import UserManagementPage from './pages/admin/UserManagementPage.jsx'
import ApplyPage from './pages/public/ApplyPage.jsx'
import ConfirmationPage from './pages/public/ConfirmationPage.jsx'
import LandingPage from './pages/public/LandingPage.jsx'
import OnboardPage from './pages/public/OnboardPage.jsx'
import PublicProfilePage from './pages/public/PublicProfilePage.jsx'
import TestPage from './pages/public/TestPage.jsx'
import DashboardPage from './pages/student/DashboardPage.jsx'
import StudentFeesPage from './pages/student/FeesPage.jsx'
import NotificationsPage from './pages/student/NotificationsPage.jsx'
import ProfilePage from './pages/student/ProfilePage.jsx'
import ProgressPage from './pages/student/ProgressPage.jsx'
import ResearchProfilePage from './pages/student/ResearchProfilePage.jsx'
import SubmissionsPage from './pages/student/SubmissionsPage.jsx'
import SubmitPage from './pages/student/SubmitPage.jsx'
import { useUiStore } from './store/uiStore.js'

export default function App() {
  const location = useLocation()
  const theme = useUiStore((s) => s.theme)
  const themeConfig = useUiStore((s) => s.themeConfig)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    applyThemeConfig(themeConfig)
  }, [theme, themeConfig])

  return <>
    <div key={location.pathname} className="fade-page">
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
        </Route>
        <Route path="/test/:testId" element={<TestPage />} />
        <Route path="/onboard" element={<OnboardPage />} />
        <Route path="/p/:slug" element={<PublicProfilePage />} />
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="submit" element={<SubmitPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="fees" element={<StudentFeesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/research" element={<ResearchProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="applicants" element={<ApplicantsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:id/progress" element={<ProgressPage />} />
          <Route path="batches" element={<BatchesPage />} />
          <Route path="batches/students" element={<BatchStudentsPage />} />
          <Route path="batches/:batchId/students" element={<BatchStudentsPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="test-builder" element={<TestBuilderPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </div>
    <ToastHost />
  </>
}
