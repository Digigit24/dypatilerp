import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { changeMyPassword } from '../../api/services/userService.js'
import { useUiStore } from '../../store/uiStore.js'

export default function OnboardPage() {
  const [step, setStep] = useState(0)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [changed, setChanged] = useState(false)
  const addToast = useUiStore((s) => s.addToast)

  const savePassword = async () => {
    if (newPassword.length < 8) {
      addToast({ type: 'error', title: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirm) {
      addToast({ type: 'error', title: 'Passwords do not match.' })
      return
    }
    setSaving(true)
    try {
      await changeMyPassword(currentPassword, newPassword)
      setChanged(true)
      addToast({ type: 'success', title: 'Password updated.' })
      setStep(2)
    } catch (err) {
      addToast({ type: 'error', title: 'Could not change password', message: err.response?.data?.message || 'Check your current password and try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-8">
      <div className="card max-w-2xl p-10 text-center">
        <div className="mb-6 flex justify-center gap-2">
          {[0, 1, 2, 3].map((n) => (
            <span key={n} className={`h-2 w-16 rounded-full ${step >= n ? 'bg-rose-500' : 'bg-stone-200'}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <h1 className="text-3xl font-semibold text-rose-500">Welcome aboard 🎉</h1>
            <p className="mt-4 text-muted">Let&apos;s get your account set up. First, choose a password you&apos;ll remember.</p>
          </>
        )}

        {step === 1 && (
          <div className="text-left">
            <h1 className="text-3xl font-semibold text-center">Set Your Password</h1>
            <p className="mt-2 mb-6 text-center text-muted">Enter the temporary password from your email, then choose a new one.</p>
            <label className="block">
              <span className="text-sm font-semibold">Current / temporary password</span>
              <input className="input mt-1.5 w-full" type="password" autoComplete="current-password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="From your invitation email" />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold">New password</span>
              <input className="input mt-1.5 w-full" type="password" autoComplete="new-password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold">Confirm new password</span>
              <input className="input mt-1.5 w-full" type="password" autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" />
            </label>
          </div>
        )}

        {step === 2 && (
          <>
            <h1 className="text-3xl font-semibold">{changed ? 'Password Set ✓' : 'All Set'}</h1>
            <p className="mt-2 text-muted">You can now log in with your new password.</p>
          </>
        )}

        {step === 1 ? (
          <button className="btn-primary mt-8 inline-flex items-center gap-2" disabled={saving} onClick={savePassword}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save Password'}
          </button>
        ) : (
          <button className="btn-primary mt-8" onClick={() => (step < 2 ? setStep(step + 1) : location.assign('/student/dashboard'))}>
            {step === 0 ? 'Begin Setup →' : 'Go to Dashboard →'}
          </button>
        )}
      </div>
    </main>
  )
}
