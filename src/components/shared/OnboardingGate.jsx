/**
 * OnboardingGate — sits between ProtectedRoute and every /student/* page.
 *
 * Applies to ALL students, including scholars enrolled before this feature
 * shipped (V4-FEATURE-PLAN.md §7 — decided explicitly, no grandfathering).
 * Renders nothing but <Outlet/> once a student's onboarding is complete;
 * otherwise redirects everything (including a direct URL hit) to
 * /student/onboarding, which sits OUTSIDE the <StudentLayout> route group in
 * App.jsx — so the sidenav/dashboard chrome never renders while incomplete,
 * not just individual nav links being hidden.
 *
 * The completeness check is cached in onboardingStore for the session (see
 * that store's comment) so this gate does not re-fetch on every navigation.
 */
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { useOnboardingStore } from '../../store/onboardingStore.js'

const ONBOARDING_PATH = '/student/onboarding'

export default function OnboardingGate() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const status = useOnboardingStore((s) => s.status)
  const checked = useOnboardingStore((s) => s.checked)
  const checkOnboarding = useOnboardingStore((s) => s.checkOnboarding)
  const location = useLocation()

  useEffect(() => {
    if (currentUser?.id) checkOnboarding(currentUser.id)
  }, [currentUser?.id])

  // Brief blank frame while the once-per-session check resolves — avoids a
  // flash of the real dashboard before an incomplete profile gets redirected.
  if (!checked) return null

  const onOnboardingRoute = location.pathname === ONBOARDING_PATH

  if (!status?.complete && !onOnboardingRoute) {
    return <Navigate to={ONBOARDING_PATH} replace />
  }
  if (status?.complete && onOnboardingRoute) {
    return <Navigate to="/student/dashboard" replace />
  }
  return <Outlet />
}
