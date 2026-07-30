import { ArrowLeft, KeyRound, Loader2, UploadCloud, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sendCredentials } from '../../api/services/userService.js'
import { getStudentById } from '../../api/services/studentService.js'
import { createSubmissionOnBehalf, submitForReviewOnBehalf, uploadSubmissionAttachment } from '../../api/services/submissionService.js'
import { getApprovalsBySubmission, reviewSubmission } from '../../api/services/approvalService.js'
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
  // Only an institute admin may upload/submit a progress report on behalf.
  const isAdmin = usePermStore((s) => s.hasRole('admin'))
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
            {isAdmin && (
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => setUploadOpen(true)}
                title="Upload and submit a progress report on behalf of this scholar"
              >
                <UploadCloud size={15} /> Upload Progress Report
              </button>
            )}
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
              onClick={handleSendCredentials}
              disabled={sending}
              title="Generates a new password and emails the login credentials"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              Send Login Credentials
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)]"
              onClick={() => navigate('/admin/students')}
            >
              <ArrowLeft size={15} /> All {labels.studentPlural}
            </button>
          </div>
        }
      />
      <StudentProfileView studentId={id} isAdminView={true} />
      {uploadOpen && (
        <UploadProgressReportModal studentUserId={id} onClose={() => setUploadOpen(false)} />
      )}
    </div>
  )
}

function UploadProgressReportModal({ studentUserId, onClose }) {
  const addToast = useUiStore((s) => s.addToast)
  const [student, setStudent] = useState(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getStudentById(studentUserId).then((r) => setStudent(r.data)).catch(() => setStudent(null))
  }, [studentUserId])

  const scholarName = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : ''
  const canSubmit = student?.batch_id && title.trim().length >= 2 && file && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      // 1. Create the draft, owned by the scholar (admin recorded as creator).
      const created = await createSubmissionOnBehalf({
        student_user_id: student.id || studentUserId,
        batch_id: student.batch_id,
        title: title.trim(),
      })
      const submissionId = created.data?.id
      if (!submissionId) throw new Error('Could not create the submission')

      // 2. Upload the file through our own API (backend streams it to storage).
      await uploadSubmissionAttachment(submissionId, file)

      // 3. Submit for review on behalf of the scholar.
      await submitForReviewOnBehalf(submissionId)

      // 4. Optional: if the admin entered feedback, approve now — this records the
      //    institute feedback, marks the report approved/completed, and notifies
      //    the scholar. If feedback is blank the report stays submitted (pending).
      const note = feedback.trim()
      if (note) {
        try {
          const appr = await getApprovalsBySubmission(submissionId)
          const pending = (appr.data || []).find((a) => a.status === 'pending') || (appr.data || [])[0]
          if (!pending?.id) throw new Error('No review stage found to approve')
          await reviewSubmission(pending.id, { action: 'approve', comments: note })
          addToast({ type: 'success', title: `Progress report approved with feedback for ${scholarName || 'the scholar'}.` })
        } catch (approveErr) {
          // The report is still saved & submitted — only the approve step failed.
          addToast({ type: 'error', title: 'Report submitted, but the feedback/approval step failed', message: approveErr.response?.data?.message || approveErr.message })
        }
      } else {
        addToast({ type: 'success', title: `Progress report submitted for ${scholarName || 'the scholar'}.` })
      }
      onClose()
    } catch (err) {
      addToast({ type: 'error', title: 'Upload failed', message: err.response?.data?.message || err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="safe-row">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">Upload Progress Report</h2>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--surface)]" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="mt-1 text-sm text-[color:var(--secondary)]">
          On behalf of <span className="font-semibold text-[color:var(--text)]">{scholarName || '…'}</span>. The report is owned by the scholar and follows the batch's approval workflow.
        </p>

        {student && !student.batch_id && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">This scholar has no active batch enrollment — cannot create a submission.</p>
        )}

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-[color:var(--text)]">Report title</span>
          <input className="input mt-2 w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. First Progress Report" />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-[color:var(--text)]">File (PDF, PPT, PPTX — max 25MB)</span>
          <input
            className="mt-2 block w-full text-sm text-[color:var(--secondary)] file:mr-3 file:rounded-xl file:border-0 file:bg-[color:var(--accent-tint)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--accent)]"
            type="file"
            accept=".pdf,.ppt,.pptx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {file && <p className="mt-2 text-xs text-[color:var(--secondary)]">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-[color:var(--text)]">Feedback to scholar <span className="font-normal text-[color:var(--muted)]">(optional)</span></span>
          <textarea
            className="textarea mt-2 h-24 w-full"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add feedback to approve and complete now, or leave blank to submit for review."
          />
        </label>

        <div className="safe-actions mt-6 justify-end">
          <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={onClose}>Cancel</button>
          <button className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" disabled={!canSubmit} onClick={submit}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {busy ? 'Uploading…' : (feedback.trim() ? 'Upload, Submit & Approve' : 'Upload & Submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
