import { KeyRound, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { changeMyPassword } from '../../api/services/userService.js'
import StudentProfileView from '../../components/shared/StudentProfileView.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

export default function ProfilePage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  return (
    <div className="fade-page">
      <PageHeader title="My Profile" subtitle="Manage your academic profile, certificates, and research record." />
      <ChangePasswordCard />
      {currentUser?.id && <StudentProfileView studentId={currentUser.id} isAdminView={false} />}
    </div>
  )
}

// ─── Self-service password change ────────────────────────────────────────────────
function ChangePasswordCard() {
  const addToast = useUiStore((s) => s.addToast)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)

  const valid = form.current && form.next.length >= 8 && form.next === form.confirm

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    try {
      await changeMyPassword(form.current, form.next)
      addToast({ type: 'success', title: 'Password changed. Use the new password next time you log in.' })
      setForm({ current: '', next: '', confirm: '' })
      setOpen(false)
    } catch (err) {
      addToast({ type: 'error', title: 'Could not change password', message: err.response?.data?.message })
    } finally { setBusy(false) }
  }

  return (
    <div className="card mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><KeyRound size={17} /></span>
          <div>
            <p className="text-sm font-semibold text-[color:var(--text)]">Password</p>
            <p className="text-xs text-[color:var(--secondary)]">Change the password you use to log in</p>
          </div>
        </div>
        {!open && (
          <button className="rounded-2xl border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]" onClick={() => setOpen(true)}>
            Change Password
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input className="input" type="password" required placeholder="Current password" autoComplete="current-password"
            value={form.current} onChange={(e) => setForm((p) => ({ ...p, current: e.target.value }))} />
          <input className="input" type="password" required minLength={8} placeholder="New password (min 8 chars)" autoComplete="new-password"
            value={form.next} onChange={(e) => setForm((p) => ({ ...p, next: e.target.value }))} />
          <input className="input" type="password" required placeholder="Confirm new password" autoComplete="new-password"
            value={form.confirm} onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))} />
          {form.confirm && form.next !== form.confirm && (
            <p className="text-xs font-semibold text-red-500 sm:col-span-3">Passwords don't match.</p>
          )}
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className="btn-primary inline-flex items-center gap-2 text-sm" disabled={!valid || busy}>
              {busy && <Loader2 size={14} className="animate-spin" />} Save New Password
            </button>
            <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
