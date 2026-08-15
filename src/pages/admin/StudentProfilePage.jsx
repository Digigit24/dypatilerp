import { ArrowLeft, KeyRound, Loader2, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sendCredentials } from '../../api/services/userService.js'
import UploadProgressReportDrawer from '../../components/admin/UploadProgressReportDrawer.jsx'
import StudentProfileView from '../../components/shared/StudentProfileView.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { useLabels } from '../../store/labelStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { usePermStore } from '../../store/permStore.js'

export default function StudentProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const labels = useLabels()
  const addToast = useUiStore((s) => s.addToast)
  const [sending, setSending] = useState(false)
  // After an upload, remount the profile view on its Progress Reports tab so the
  // new report is visible immediately instead of needing a manual refresh.
  const [reloadKey, setReloadKey] = useState(0)
  const [openedFromUpload, setOpenedFromUpload] = useState(false)
  // Institute staff (admin or coordinator) may file a report on a scholar's behalf.
  const canUpload = usePermStore((s) => s.hasRole('admin') || s.hasRole('coordinator'))
  const [uploadOpen, setUploadOpen] = useState(false)

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
              onClick={() => navigate('/admin/students')}
            >
              <ArrowLeft size={15} /> All {labels.studentPlural}
            </button>
          </div>
        }
      />
      <StudentProfileView studentId={id} isAdminView={true} defaultTab={openedFromUpload ? 'reports' : 'profile'} key={reloadKey} />
      {uploadOpen && (
        <UploadProgressReportDrawer
          studentUserId={id}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { setOpenedFromUpload(true); setReloadKey((k) => k + 1) }}
        />
      )}
    </div>
  )
}
