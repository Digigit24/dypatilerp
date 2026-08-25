import { Eye, KeyRound, Loader2, Users2, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { impersonateUser, sendCredentials } from '../../api/services/userService.js'
import UploadProgressReportDrawer from '../../components/admin/UploadProgressReportDrawer.jsx'
import ScholarSwitchPanel from '../../components/shared/ScholarSwitchPanel.jsx'
import StudentProfileView from '../../components/shared/StudentProfileView.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useLabels } from '../../store/labelStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { usePermStore } from '../../store/permStore.js'

export default function StudentProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const labels = useLabels()
  // Deep link from the Scholars list count columns, e.g. /admin/students/:id?subtab=assignments
  const [searchParams] = useSearchParams()
  const linkedSubTab = searchParams.get('subtab')
  const addToast = useUiStore((s) => s.addToast)
  const [sending, setSending] = useState(false)
  // After an upload, remount the profile view on its Progress Reports tab so the
  // new report is visible immediately instead of needing a manual refresh.
  const [reloadKey, setReloadKey] = useState(0)
  const [openedFromUpload, setOpenedFromUpload] = useState(false)
  // Institute staff (admin or coordinator) may file a report on a scholar's behalf.
  const canUpload = usePermStore((s) => s.hasRole('admin') || s.hasRole('coordinator'))
  const [uploadOpen, setUploadOpen] = useState(false)
  // Panel state lives here (not inside the panel) so it survives the route's
  // :id changing — picking another scholar navigates without unmounting this
  // page, so the panel stays open across the switch instead of re-opening.
  const [switchOpen, setSwitchOpen] = useState(false)

  // Impersonation is a fixed, admin-only capability (matches the backend's
  // requireRole('admin') gate) — not tied to the editable permissions table.
  const isAdmin = useAuthStore((s) => s.role === 'admin')
  const startImpersonation = useAuthStore((s) => s.startImpersonation)
  const [impersonating, setImpersonating] = useState(false)

  const handleImpersonate = async () => {
    if (!confirm(`View the app as this ${labels.student.toLowerCase()}? You'll be signed in as them for up to 15 minutes, and can return to your own account at any time.`)) return
    setImpersonating(true)
    try {
      const r = await impersonateUser(id)
      const { access_token, target_user } = r.data
      startImpersonation({ targetUser: target_user, accessToken: access_token })
      addToast({
        type: 'success',
        title: `Now viewing as ${target_user.first_name}`,
        message: 'Use the banner at the top of the screen to return to your admin account.',
      })
      navigate('/student/dashboard', { replace: true })
    } catch (err) {
      addToast({ type: 'error', title: 'Could not start impersonation', message: err.response?.data?.message })
    } finally {
      setImpersonating(false)
    }
  }

  const handleSendCredentials = async () => {
    if (!confirm(`Send fresh login credentials by email? This replaces the ${labels.student.toLowerCase()}'s current password.`)) return
    setSending(true)
    try {
      const r = await sendCredentials(id)
      addToast({
        type: r.data?.email_sent ? 'success' : 'error',
        title: r.data?.email_sent ? `Credentials emailed to ${r.data.email}.` : 'Password was reset but the email failed',
        message: r.data?.email_error || undefined,
      })
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to send credentials', message: err.response?.data?.message })
    } finally { setSending(false) }
  }

  return (
    <div className="fade-page">
      <PageHeader
        title={`${labels.student} Profile`}
        subtitle="View and edit the complete profile and research record."
        action={
          <div className="flex gap-2">
            {canUpload && (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => setUploadOpen(true)}
                title="Upload and submit a progress report on behalf of this scholar"
              >
                <UploadCloud size={15} /> Upload Progress Report
              </button>
            )}
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
              onClick={handleSendCredentials}
              disabled={sending}
              title="Generates a new password and emails the login credentials"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              Send Login Credentials
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)]"
              onClick={() => setSwitchOpen(true)}
            >
              <Users2 size={15} /> Switch {labels.student}
            </button>
            {isAdmin && (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                onClick={handleImpersonate}
                disabled={impersonating}
                title={`Sign in as this ${labels.student.toLowerCase()} to see exactly what they see`}
              >
                {impersonating ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                View as {labels.student}
              </button>
            )}
          </div>
        }
      />
      <StudentProfileView
        studentId={id}
        isAdminView={true}
        defaultTab={openedFromUpload ? 'reports' : linkedSubTab ? 'submissions' : 'profile'}
        defaultSubTab={!openedFromUpload ? linkedSubTab : undefined}
        key={reloadKey}
      />
      {uploadOpen && (
        <UploadProgressReportDrawer
          studentUserId={id}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { setOpenedFromUpload(true); setReloadKey((k) => k + 1) }}
        />
      )}
      {switchOpen && (
        <ScholarSwitchPanel
          currentUserId={id}
          onClose={() => setSwitchOpen(false)}
          onSelect={(s) => {
            setOpenedFromUpload(false)
            navigate(`/admin/students/${s.user_id}`, { replace: true })
          }}
        />
      )}
    </div>
  )
}
