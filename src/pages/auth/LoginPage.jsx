import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login } from '../../api/services/userService.js'
import { getUserPreferences } from '../../api/services/settingsService.js'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

const ADMIN_ROLES = ['admin', 'coordinator', 'academic_guide', 'industry_mentor']

function redirectForRole(role) {
  if (ADMIN_ROLES.includes(role)) return '/admin'
  if (role === 'student') return '/student/dashboard'
  return '/'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const addToast = useUiStore((s) => s.addToast)
  const applyUserPreferences = useUiStore((s) => s.applyUserPreferences)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.error) {
        setError(result.error)
        return
      }
      const { user, access_token, refresh_token } = result.data
      setAuth(user, access_token, refresh_token)
      // Load and apply saved user preferences (dark mode, accent colour)
      getUserPreferences().then((r) => applyUserPreferences(r.data)).catch(() => {})
      const role = user?.roles?.[0]
      const dest = from && from !== '/login' ? from : redirectForRole(role)
      navigate(dest, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password'
      setError(msg)
      addToast({ type: 'error', title: 'Login failed', message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[color:var(--bg)]">
      {/* Brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between overflow-y-auto p-12"
        style={{ background: 'var(--accent)' }}
      >
        <div>
          {/* DYPERF logo (white card for contrast on the accent background) */}
          <span className="inline-block rounded-xl bg-white p-2.5 shadow-sm">
            <img src="/logo-new.jpg" alt="DYPERF logo" className="h-11 w-auto" />
          </span>

          <p className="mt-6 text-lg font-bold leading-snug text-white">
            Dr. D. Y. Patil Education and Research Foundation, India
          </p>
          <p className="mt-4 text-sm italic text-white/70">A Postdoctoral Program in</p>
          <h1 className="mt-1 text-4xl font-bold leading-tight text-white">
            Applied Business<br />Research
          </h1>

          {/* In collaboration with Texas State University */}
          <p className="mt-6 text-sm font-semibold text-white/80">In Collaboration with</p>
          <div className="mt-3 flex items-center gap-3">
            <img
              src="/texas-state-logo.png"
              alt="Texas State University"
              className="h-16 w-16 shrink-0 object-contain"
            />
            <span className="text-base font-bold text-white">Texas State University, USA</span>
          </div>
          <p className="mt-4 italic text-white/70">
            Empowering researchers to bridge industry and academia.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              'End-to-end fellowship management',
              'Multi-stage approval workflows',
              'Research profile &amp; progress tracking',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-white/90 text-sm">
                <span className="h-2 w-2 rounded-full bg-white/60 shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: f }} />
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-white/40 text-xs">© {new Date().getFullYear()} DYPERF</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="lg:hidden mb-8 text-center">
            <img src="/logo-new.jpg" alt="DYPERF logo" className="mx-auto h-10 w-auto" />
            <h1 className="mt-3 text-xl font-bold text-[color:var(--accent)]">Applied Business Research</h1>
            <div className="mt-2 flex items-center justify-center gap-2">
              <img
                src="/texas-state-logo.png"
                alt="Texas State University"
                className="h-7 w-7 shrink-0 object-contain"
              />
              <span className="text-[11px] leading-tight text-[color:var(--secondary)]">
                In collaboration with Texas State University, USA
              </span>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-[color:var(--text)]">Welcome back</h2>
          <p className="mt-2 text-[color:var(--secondary)] text-sm">Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[color:var(--text)] mb-1.5">
                Email address
              </label>
              <input
                className="input w-full"
                type="email"
                autoComplete="email"
                required
                placeholder="you@dypatil.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--text)] mb-1.5">
                Password
              </label>
              <input
                className="input w-full"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>
            )}

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-[color:var(--secondary)]">
            New applicant?{' '}
            <Link to="/apply" className="font-semibold text-[color:var(--accent)] hover:underline">
              Apply here →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
