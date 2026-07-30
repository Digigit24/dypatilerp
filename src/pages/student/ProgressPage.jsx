import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UploadCloud, FileText } from 'lucide-react'
import { getSubmissionsByStudent } from '../../api/services/submissionService.js'
import { getApprovalsBySubmission } from '../../api/services/approvalService.js'
import { getProgressReportByStudent } from '../../api/services/progressReportService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import SubmissionFileLink from '../../components/shared/SubmissionFileLink.jsx'
import { formatDate } from '../../lib/formatters.js'
import { useAuthStore } from '../../store/authStore.js'

export default function ProgressPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const [reports, setReports] = useState(null)
  const [modules, setModules] = useState([])

  useEffect(() => {
    if (!currentUser?.id) return
    // Primary: the scholar's progress-report submissions + their institute feedback.
    getSubmissionsByStudent(currentUser.id).then(async (r) => {
      const prs = (r.data || []).filter((s) => s.submission_type === 'progress_report')
      const withFeedback = await Promise.all(prs.map(async (s) => {
        let approvals = []
        try { approvals = (await getApprovalsBySubmission(s.id)).data || [] } catch { /* feedback is non-fatal */ }
        return { ...s, approvals }
      }))
      setReports(withFeedback)
    }).catch(() => setReports([]))
    // Secondary: module-completion tracker (retained — also used by admin views).
    getProgressReportByStudent(currentUser.id).then((r) => setModules(r.data || [])).catch(() => setModules([]))
  }, [currentUser])

  if (!reports) return <SkeletonCard rows={5} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Progress Reports"
        subtitle="Upload your progress reports and track institute feedback."
        action={
          <Link to="/student/submit" className="btn-primary inline-flex items-center gap-2">
            <UploadCloud size={16} /> Upload Progress Report
          </Link>
        }
      />

      {reports.length === 0 ? (
        <div className="card grid place-items-center p-10 text-center">
          <div>
            <FileText className="mx-auto text-[color:var(--accent)]" size={30} />
            <p className="mt-3 text-[color:var(--secondary)]">No progress reports yet — click Upload Progress Report to add one.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {reports.map((s) => {
            const feedback = (s.approvals || []).filter((a) => a.comments)
            const file = Array.isArray(s.file_urls) ? s.file_urls[0] : null
            return (
              <div className="card p-6" key={s.id}>
                <div className="safe-row items-start">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[color:var(--text)]">{s.title}</h2>
                    <p className="mt-1 text-xs text-[color:var(--secondary)]">Submitted {formatDate(s.submitted_at)}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                {file && (
                  <div className="mt-4 flex items-center gap-3">
                    <span className="truncate text-sm text-[color:var(--secondary)]">{file.name}</span>
                    <SubmissionFileLink file={file} />
                  </div>
                )}
                {feedback.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-[color:var(--surface)] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Institute Feedback</p>
                    {feedback.map((a) => (
                      <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]" key={a.id}>{a.comments}</p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Secondary — module completion (kept for continuity with the admin views) */}
      {modules.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[color:var(--muted)]">Module Completion</h3>
          <div className="mt-3 space-y-2">
            {modules.map((m) => (
              <div className="card flex items-center justify-between p-4" key={m.id}>
                <span className="truncate text-sm font-medium text-[color:var(--text)]">{m.module_name || m.period_label || 'Module'}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm text-[color:var(--secondary)]">{m.completion_percentage ?? 0}%</span>
                  <StatusBadge status={m.status || 'in_progress'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
