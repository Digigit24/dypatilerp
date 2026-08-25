import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api/services/userService.js'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword(email)
    } catch {
      // The backend only ever replies with the generic message for this
      // endpoint — a rejection here means a network/5xx failure, not an
      // invalid email. Show the same generic state either way so this can
      // never be used to probe which addresses are registered.
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg)] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/logo-new.jpg" alt="DYPERF logo" className="mx-auto h-10 w-auto" />
          <h1 className="mt-3 text-xl font-bold text-[color:var(--accent)]">Applied Business Research</h1>
        </div>

        <div className="card p-8">
          {submitted ? (
            <>
              <h2 className="text-2xl font-bold text-[color:var(--text)]">Check your email</h2>
              <p className="mt-3 text-sm text-[color:var(--secondary)]">
                If <strong>{email}</strong> is registered, we&rsquo;ve sent a password reset link. It expires in 30 minutes.
              </p>
              <Link to="/login" className="btn-primary mt-6 flex w-full items-center justify-center">
                Back to Sign In
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[color:var(--text)]">Forgot your password?</h2>
              <p className="mt-2 text-sm text-[color:var(--secondary)]">
                Enter your account email and we&rsquo;ll send you a link to reset it.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                <button type="submit" className="btn-primary w-full" disabled={loading || !email}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p className="mt-6 text-sm text-center text-[color:var(--secondary)]">
                <Link to="/login" className="font-semibold text-[color:var(--accent)] hover:underline">
                  ← Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
