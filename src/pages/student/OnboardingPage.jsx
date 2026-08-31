import { CheckCircle2, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentOnboardingPanel from '../../components/shared/StudentOnboardingPanel.jsx'
import { logout } from '../../api/services/userService.js'
import { useAuthStore } from '../../store/authStore.js'
import { useOnboardingStore } from '../../store/onboardingStore.js'
import { scholarName } from '../../lib/formatters.js'

// Field/document counts come from the API (status.total_info_fields /
// total_documents) — never hardcode them here. A hardcoded count silently
// drifts out of sync whenever a field is added/removed server-side, which is
// exactly what stuck every scholar at 95% after middle_name was added to
// users without a matching bump here (it was also wrongly required — see
// student-profile.service.js's INFO_FIELDS comment).
const completionPct = (status) => {
  if (!status) return 0
  const total = (status.total_info_fields || 0) + (status.total_documents || 0)
  if (!total) return 0
  const done = total - (status.missing_info_fields?.length || 0) - (status.missing_documents?.length || 0)
  return Math.round((Math.max(done, 0) / total) * 100)
}

// Human-readable labels for the missing-field/slot keys the backend returns,
// so a stuck scholar can actually see what's left instead of just a percent.
const FIELD_LABELS = {
  first_name: 'First name', last_name: 'Last name', phone: 'Mobile number',
  father_name: "Father's name", mother_name: "Mother's name",
  date_of_birth: 'Date of birth', postal_address: 'Postal address', blood_group: 'Blood group',
}
const SLOT_LABELS = {
  cv: 'CV', research_proposal: 'Research proposal', publications_list: 'Publications list',
  research_statement: 'Research statement', passport: 'Passport', aadhar_card: 'Aadhaar card',
  pan_card: 'PAN card', marksheet_graduation: 'Graduation marksheet',
  marksheet_postgraduation: 'Post-graduation marksheet', phd_result: 'PhD result', photo: 'Passport photo',
}

export default function OnboardingPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setStatus = useOnboardingStore((s) => s.setStatus)
  const navigate = useNavigate()
  const [status, setLocalStatus] = useState(null)
  const [redirecting, setRedirecting] = useState(false)

  const handleStatusChange = (s) => {
    setLocalStatus(s)
    setStatus(s)
    if (s?.complete && !redirecting) {
      setRedirecting(true)
      // Small delay so the "you're all set" state is visible before the gate opens.
      setTimeout(() => navigate('/student/dashboard', { replace: true }), 900)
    }
  }

  const handleLogout = async () => {
    await logout()
    clearAuth()
    navigate('/login', { replace: true })
  }

  const pct = completionPct(status)

  return (
    <div className="min-h-screen bg-[color:var(--surface)]">
      <div className="border-b border-[color:var(--border)] bg-[color:var(--card)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <p className="font-semibold text-[color:var(--text)]">DYPERF ERP</p>
          <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--secondary)] hover:text-[color:var(--text)]">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="card p-6">
          <h1 className="text-2xl font-semibold text-[color:var(--text)]">
            Welcome{currentUser?.first_name ? `, ${scholarName({ first_name: currentUser.first_name })}` : ''} — let's finish setting up your profile
          </h1>
          <p className="mt-2 text-sm text-[color:var(--secondary)]">
            Your dashboard unlocks once your personal details and required documents are complete.
            This only needs to be done once.
          </p>
          {status && !status.complete && (
            <>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                  <div className="h-2 rounded-full bg-[color:var(--accent)] transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="shrink-0 font-semibold text-[color:var(--secondary)]">{pct}% complete</span>
              </div>
              {(status.missing_info_fields?.length > 0 || status.missing_documents?.length > 0) && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Still needed:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {status.missing_info_fields?.map((f) => <li key={f}>{FIELD_LABELS[f] || f}</li>)}
                    {status.missing_documents?.map((s) => <li key={s}>{SLOT_LABELS[s] || s}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
          {status?.complete && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} /> All set — taking you to your dashboard…
            </div>
          )}
        </div>

        <StudentOnboardingPanel userId={currentUser?.id} editable onStatusChange={handleStatusChange} />
      </div>
    </div>
  )
}
