import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'

const ADMIN_ROLES = ['admin', 'coordinator', 'academic_guide', 'industry_mentor']

export default function ProtectedRoute({ children, allowedRoles }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const role = useAuthStore((s) => s.role)
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const dashboard = ADMIN_ROLES.includes(role) ? '/admin' : '/student/dashboard'
    return <Navigate to={dashboard} replace />
  }

  return children
}
