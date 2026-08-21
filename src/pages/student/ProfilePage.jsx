import { CheckCircle2, Download, Eye, FileText, KeyRound, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { changeMyPassword } from '../../api/services/userService.js'
import { downloadOfficialLetter, getOfficialLetters, previewOfficialLetter } from '../../api/services/studentService.js'
import StudentProfileView from '../../components/shared/StudentProfileView.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { formatDate } from '../../lib/formatters.js'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

export default function ProfilePage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  return (
    <div className="fade-page">
      <PageHeader title="Profile" subtitle="Manage your academic profile, certificates, and research record." />
      <ChangePasswordCard />
      {currentUser?.id && <OfficialLettersCard userId={currentUser.id} />}
      {currentUser?.id && <StudentProfileView studentId={currentUser.id} isAdminView={false} />}
    </div>
  )
}

// ─── Official letters — issued by staff, view/preview/download only ─────────
const fmtBytes = (b) => !b ? '—' : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(Math.round(b / 1e3))} KB`

function OfficialLettersCard({ userId }) {
  const addToast = useUiStore((s) => s.addToast)
  const [letters, setLetters] = useState(null)
  const [actionSlot, setActionSlot] = useState(null)

  useEffect(() => {
    getOfficialLetters(userId).then((r) => setLetters(r.data || [])).catch(() => setLetters([]))
  }, [userId])

  if (letters && letters.every((l) => !l.present)) return null // nothing issued yet — keep the profile page uncluttered

  const handlePreview = async (slot) => {
    setActionSlot(`preview:${slot}`)
    try { await previewOfficialLetter(userId, slot) }
    catch (err) { addToast({ type: 'error', title: 'Preview failed', message: err.response?.data?.message || err.message }) }
    finally { setActionSlot(null) }
  }
  const handleDownload = async (slot, filename) => {
    setActionSlot(`download:${slot}`)
    try { await downloadOfficialLetter(userId, slot, filename) }
    catch (err) { addToast({ type: 'error', title: 'Download failed', message: err.response?.data?.message || err.message }) }
    finally { setActionSlot(null) }
  }

  return (
    <div className="card mb-6 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><FileText size={17} /></span>
        <div>
          <p className="text-sm font-semibold text-[color:var(--text)]">Official Letters</p>
          <p className="text-xs text-[color:var(--secondary)]">Issued by the program office — view, preview or download</p>
        </div>
      </div>

      {letters === null ? (
        <div className="mt-4 flex justify-center py-4"><Loader2 size={18} className="animate-spin text-[color:var(--accent)]" /></div>
      ) : (
        <div className="mt-4 space-y-2">
          {letters.filter((l) => l.present).map((l) => (
            <div key={l.slot} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--text)]">
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-500" /> {l.label}
                </p>
                <p className="mt-0.5 truncate text-xs text-[color:var(--secondary)]">{fmtBytes(l.file_size)} · Issued {formatDate(l.uploaded_at)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={actionSlot === `preview:${l.slot}`}
                  onClick={() => handlePreview(l.slot)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white disabled:opacity-60"
                >
                  {actionSlot === `preview:${l.slot}` ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Preview
                </button>
                <button
                  type="button"
                  disabled={actionSlot === `download:${l.slot}`}
                  onClick={() => handleDownload(l.slot, l.filename)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                >
                  {actionSlot === `download:${l.slot}` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><KeyRound size={17} /></span>
          <div>
            <p className="text-sm font-semibold text-[color:var(--text)]">Password</p>
            <p className="text-xs text-[color:var(--secondary)]">Change the password you use to log in</p>
          </div>
        </div>
        {!open && (
          <button className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]" onClick={() => setOpen(true)}>
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
