import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../api/services/userService.js'
import { useUiStore } from '../../store/uiStore.js'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const addToast = useUiStore((s) => s.addToast)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await resetPassword(token, password)
      addToast({ type: 'success', title: 'Password reset', message: 'Please log in with your new password.' })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'This reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg)] p-6">
        <div className="card w-full max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[color:var(--text)]">Invalid link</h2>
          <p className="mt-3 text-sm text-[color:var(--secondary)]">
            This reset link is missing its token. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn-primary mt-6 flex w-full items-center justify-center">
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg)] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/logo-new.jpg" alt="DYPERF logo" className="mx-auto h-10 w-auto" />
        </div>
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-[color:var(--text)]">Choose a new password</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[color:var(--text)] mb-1.5">New password</label>
              <input
                className="input w-full"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[color:var(--text)] mb-1.5">Confirm password</label>
              <input
                className="input w-full"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
