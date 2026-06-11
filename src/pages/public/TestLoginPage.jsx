import { Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { testLogin } from '../../api/services/testService.js'
import { useTestStore } from '../../store/testStore.js'

export default function TestLoginPage() {
  const [params] = useSearchParams()
  // Sanitize: valid tokens are 64-char hex — strip any accidental trailing junk
  // (e.g. " | u: email | pw: pass" appended by copy-all features or plain-text mailers)
  const rawToken = params.get('token') || ''
  const token = rawToken.split(/[\s|]/)[0].trim()
  const navigate = useNavigate()

  const login = useTestStore((s) => s.login)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) setError('Invalid test link. Please check your email.')
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username || !password) { setError('Please enter your username and password.'); return }
    setLoading(true)
    try {
      const res = await testLogin({ token, username, password })
      login(res.data)
      navigate(`/test/${res.data.test_id}/instructions`, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--bg)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img src="/logo-new.jpg" alt="DYPERF" className="h-14 w-auto rounded-2xl object-contain" />
        </div>

        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-tint)]">
              <Lock size={22} className="text-[color:var(--accent)]" />
            </div>
            <h1 className="text-xl font-semibold text-[color:var(--text)]">Test Portal Login</h1>
            <p className="mt-1 text-sm text-[color:var(--secondary)]">Use the credentials sent to your email.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <label>
              <span className="text-sm font-semibold text-[color:var(--text)]">Username / Email</span>
              <input
                className="input mt-1.5 w-full"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your@email.com"
                disabled={loading || !token}
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-[color:var(--text)]">Password</span>
              <div className="relative mt-1.5">
                <input
                  className="input w-full pr-10"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading || !token}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--secondary)]"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <button
              type="submit"
              disabled={loading || !token}
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : 'Enter Test'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[color:var(--secondary)]">
          DY Patil Research Institute · Exam Portal
        </p>
      </div>
    </div>
  )
}
