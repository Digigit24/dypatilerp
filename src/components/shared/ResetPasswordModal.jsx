import { Copy, KeyRound, Loader2 as Spinner } from 'lucide-react'
import { useState } from 'react'
import { resetUserPassword } from '../../api/services/userService.js'
import { useUiStore } from '../../store/uiStore.js'

/**
 * Admin: set a custom password (or auto-generate one) for a user, with an
 * optional "email it to them" toggle. The new password is shown exactly
 * once — never persisted beyond this render.
 *
 * Props:
 *   user     — { id, first_name, last_name, email } of the target account
 *   onClose()
 */
export default function ResetPasswordModal({ user, onClose }) {
  const addToast = useUiStore((s) => s.addToast)
  const [custom, setCustom] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)   // { password, email_sent }

  const run = async () => {
    setBusy(true)
    try {
      const r = await resetUserPassword(user.id, {
        ...(custom.trim() ? { password: custom.trim() } : {}),
        send_email: sendEmail,
      })
      setResult(r.data)
      addToast({ type: 'success', title: `Password reset for ${user.email}${r.data?.email_sent ? ' · credentials emailed' : ''}` })
    } catch (err) {
      addToast({ type: 'error', title: 'Reset failed', message: err.response?.data?.message })
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-[color:var(--card)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Reset Password</h2>
        <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{user.first_name} {user.last_name} · {user.email}</p>

        {!result ? (
          <>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-[color:var(--text)]">New password</span>
              <input
                className="input mt-1.5 w-full"
                placeholder="Leave blank to auto-generate"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
              <span className="mt-1 block text-[10px] text-[color:var(--muted)]">Min 8 characters when typed manually.</span>
            </label>
            <label className="mt-3 flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" className="h-4 w-4 accent-[color:var(--accent)]" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              <span className="text-sm text-[color:var(--text)]">Email the new credentials to the user</span>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={onClose}>Cancel</button>
              <button className="btn-primary inline-flex items-center gap-2 text-sm" disabled={busy || (custom.trim() !== '' && custom.trim().length < 8)} onClick={run}>
                {busy ? <Spinner size={14} className="animate-spin" /> : <KeyRound size={14} />} Reset Password
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-800">New password (shown only once):</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm text-emerald-900">{result.password}</code>
                <button
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => { navigator.clipboard.writeText(result.password); addToast({ type: 'success', title: 'Password copied' }) }}
                ><Copy size={14} /></button>
              </div>
              <p className="mt-2 text-[11px] text-emerald-700">{result.email_sent ? '✓ Credentials were also emailed to the user.' : 'Email not sent — share this password securely.'}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn-primary text-sm" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
