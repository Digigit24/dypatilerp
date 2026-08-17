import { Bell, Calendar, Clock, MessageSquare, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import http from '../../api/http.js'
import { USE_MOCK } from '../../api/config.js'
import { getApprovalsBySubmission } from '../../api/services/approvalService.js'
import { getNotifications, markAllAsRead } from '../../api/services/notificationService.js'
import { getSubmissionsByStudent } from '../../api/services/submissionService.js'
import { getStudentById } from '../../api/services/studentService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate, timeAgo } from '../../lib/formatters.js'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

// How many of the scholar's most recent submissions to pull approval history
// for, on the dashboard. Bounded on purpose — this is N extra requests (one
// per submission) run in parallel, not meant to scan the whole history.
const FEEDBACK_LOOKBACK = 6

/**
 * Reduce a submission's approval rows to the single most recent "feedback
 * event" worth surfacing on the dashboard: a document-style feedback note,
 * a revision request, or a plain approval — whichever happened most
 * recently. Returns null if nothing has actually happened yet (still
 * pending, no reviewer action taken).
 */
const latestFeedbackEvent = (submission, approvals) => {
  let best = null
  for (const a of approvals || []) {
    const at = a.feedback_updated_at || a.action_at
    if (!at) continue
    if (a.feedback_html) {
      if (!best || new Date(at) > new Date(best.at)) best = { at, kind: 'feedback', text: a.feedback_html, stage: a.stage }
    }
    if (a.status === 'needs_revision' && a.comments) {
      if (!best || new Date(at) > new Date(best.at)) best = { at, kind: 'revision', text: a.comments, stage: a.stage }
    } else if (a.status === 'approved') {
      if (!best || new Date(at) > new Date(best.at)) best = { at, kind: 'approved', text: a.comments || null, stage: a.stage }
    }
  }
  if (!best) return null
  return { submission, ...best }
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const currentUser = useAuthStore((s) => s.currentUser)
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    const load = async () => {
      try {
        if (!USE_MOCK && currentUser?.id) {
          // Also fetch the scholar's real submissions (with titles + statuses) —
          // the dashboard endpoint only returns a count-by-status aggregate.
          const [{ data: res }, subs] = await Promise.all([
            http.get('/dashboard/student'),
            getSubmissionsByStudent(currentUser.id),
          ])
          const submissionsList = subs.data ?? []
          // Feedback digest: pull approval history for the most recent
          // submissions (progress reports + milestones carry a chain;
          // assignments have none and simply won't produce an event).
          const recent = submissionsList.slice(0, FEEDBACK_LOOKBACK)
          const approvalLists = await Promise.all(
            recent.map((s) => getApprovalsBySubmission(s.id).then((r) => r.data || []).catch(() => []))
          )
          const feedbackItems = recent
            .map((s, i) => latestFeedbackEvent(s, approvalLists[i]))
            .filter(Boolean)
            .sort((a, b) => new Date(b.at) - new Date(a.at))
            .slice(0, 5)
          setData({ dashboard: res.data, submissionsList, feedbackItems, isMock: false })
          return
        }
        const [student, submissions, notifications] = await Promise.all([
          getStudentById('stu_001'),
          getSubmissionsByStudent('stu_001'),
          getNotifications(),
        ])
        setData({ student: student.data, submissions: submissions.data, notifications: notifications.data.filter((n) => !n.is_read).slice(0, 5), isMock: true })
      } catch (err) {
        addToast({ type: 'error', title: 'Failed to load dashboard', message: err.response?.data?.message || 'Something went wrong' })
        setData({})
      }
    }
    load()
  }, [currentUser])

  if (!data) return <SkeletonCard rows={6} />

  // Real API dashboard
  if (!data.isMock && data.dashboard) {
    const d = data.dashboard
    const completion = d.progress?.completion_percentage ?? 0
    const submissions = data.submissionsList ?? []
    const feedbackItems = data.feedbackItems ?? []
    const notifications = d.unread_notifications ?? 0

    // "Pending" = awaiting review (submitted or under_review). needs_revision is
    // the scholar's own to-do and is surfaced separately, never counted as pending.
    const pending = submissions.filter((s) => s.status === 'submitted' || s.status === 'under_review').length
    const needsRevision = submissions.filter((s) => s.status === 'needs_revision').length

    const stats = [
      [d.enrollment?.batch_name ?? 'Fellowship', <Calendar size={20} />],
      [`Overall Progress: ${completion}%`, <ProgressRing value={completion} />],
      [`${pending} Pending Approvals`, <Clock size={20} />],
      [`${needsRevision} Needs your revision`, <RotateCcw size={20} />],
      [`${notifications} Unread Notifications`, <Bell size={20} />],
    ]

    return (
      <div className="fade-page">
        <PageHeader title="Student Dashboard" subtitle="Your fellowship work, approvals, and next steps." />
        <div className="responsive-kpis">
          {stats.map(([label, icon]) => (
            <div className="card card-hover safe-row p-6" key={label}>
              <p className="font-semibold text-[color:var(--text)]">{label}</p>
              <span className="shrink-0 text-[color:var(--accent)]">{icon}</span>
            </div>
          ))}
        </div>

        <div className="responsive-two mt-6">
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-[color:var(--text)]">Recent Submissions</h2>
              {submissions.length === 0
                ? <p className="mt-4 text-sm text-[color:var(--secondary)]">No submissions yet.</p>
                : submissions.slice(0, 3).map((s) => (
                  <Link to={`/student/submissions/${s.id}/preview`} className="safe-row border-b border-[color:var(--border)] py-4 last:border-0 hover:opacity-80" key={s.id}>
                    <div>
                      <p className="line-clamp-2 font-medium text-[color:var(--text)]">{s.title}</p>
                      <p className="text-xs text-[color:var(--secondary)]">{formatDate(s.submitted_at ?? s.created_at)}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </Link>
                ))
              }
            </div>
            <div className="card p-6">
              <div className="safe-row">
                <h2 className="text-xl font-semibold text-[color:var(--text)]">Recent Feedback</h2>
                <MessageSquare size={17} className="text-[color:var(--accent)] opacity-60" />
              </div>
              {feedbackItems.length === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--secondary)]">
                  No feedback yet — reviewer comments and decisions on your progress reports, assignments and milestones will show up here.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {feedbackItems.map((f) => (
                    <Link
                      to={`/student/submissions/${f.submission.id}/preview`}
                      key={`${f.submission.id}-${f.at}`}
                      className="block rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3.5 transition hover:border-[color:var(--accent)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-[color:var(--text)]">{f.submission.title}</p>
                        {f.kind === 'approved'
                          ? <StatusBadge status="approved" />
                          : f.kind === 'revision'
                            ? <StatusBadge status="needs_revision" />
                            : <span className="shrink-0 rounded-full bg-[color:var(--accent-tint)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent)]">Feedback</span>}
                      </div>
                      <p className="mt-1 text-[11px] font-medium capitalize text-[color:var(--muted)]">
                        {f.submission.submission_type?.replaceAll('_', ' ')}{f.stage ? ` · ${f.stage.replaceAll('_', ' ')}` : ''} · {timeAgo(f.at)}
                      </p>
                      {f.text ? (
                        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-[color:var(--secondary)]">{f.text}</p>
                      ) : (
                        <p className="mt-2 text-xs text-[color:var(--secondary)]">Approved with no additional comments.</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-[color:var(--text)]">Quick Actions</h2>
              <div className="safe-actions mt-4">
                <Link className="btn-primary inline-flex items-center" to="/student/submissions">Submit Progress Report</Link>
                <Link className="rounded-lg bg-[color:var(--surface)] px-4 py-3 font-semibold text-[color:var(--secondary)]" to="/student/submissions">Progress Reports</Link>
                <Link className="rounded-lg bg-[color:var(--surface)] px-4 py-3 font-semibold text-[color:var(--secondary)]" to="/student/profile/research">Research Profile</Link>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-[color:var(--text)]">Assigned Guides</h2>
              <div className="mt-4 space-y-4">
                <GuideRow label="Academic Guide" guide={(d.guides ?? []).find((g) => g.guide_type === 'academic')} />
                <GuideRow label="Industry Mentor" guide={(d.guides ?? []).find((g) => g.guide_type === 'industry')} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mock fallback
  const { student, submissions = [], notifications: notifs = [] } = data

  const stats = [
    ['Batch 2024-A', <Calendar size={20} />],
    [`Overall Progress: ${student?.progress_summary?.completion_percentage ?? 0}%`, <ProgressRing value={student?.progress_summary?.completion_percentage ?? 0} />],
    ['2 Pending Approvals', <Clock size={20} />],
    ['Next Report: Report 2', <Bell size={20} />],
  ]

  return (
    <div className="fade-page">
      <PageHeader title="Student Dashboard" subtitle="Your fellowship work, approvals, and next steps." />
      <div className="responsive-kpis">
        {stats.map(([label, icon]) => (
          <div className="card card-hover safe-row p-6" key={label}>
            <p className="font-semibold text-[color:var(--text)]">{label}</p>
            <span className="shrink-0 text-[color:var(--accent)]">{icon}</span>
          </div>
        ))}
      </div>

      <div className="responsive-two mt-6">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">Recent Submissions</h2>
            {submissions.slice(0, 3).map((s) => (
              <div className="safe-row border-b border-[color:var(--border)] py-4" key={s.id}>
                <div>
                  <p className="line-clamp-2 font-medium text-[color:var(--text)]">{s.title}</p>
                  <p className="text-xs text-[color:var(--secondary)]">{formatDate(s.submitted_at)}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">Quick Actions</h2>
            <div className="safe-actions mt-4">
              <Link className="btn-primary inline-flex items-center" to="/student/submissions">Submit Progress Report</Link>
              <Link className="rounded-lg bg-[color:var(--surface)] px-4 py-3 font-semibold text-[color:var(--secondary)]" to="/student/submissions">Progress Reports</Link>
              <Link className="rounded-lg bg-[color:var(--surface)] px-4 py-3 font-semibold text-[color:var(--secondary)]" to="/student/profile/research">Research Profile</Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="safe-row">
              <h2 className="text-xl font-semibold text-[color:var(--text)]">Notifications</h2>
              <button className="text-xs font-semibold text-[color:var(--accent)]" onClick={() => markAllAsRead()}>Mark all read</button>
            </div>
            {notifs.map((n) => <p className="border-b border-[color:var(--border)] py-3 text-sm text-[color:var(--secondary)]" key={n.id}>{n.message}<span className="block text-xs text-[color:var(--muted)]">{timeAgo(n.created_at)}</span></p>)}
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">Assigned Guides</h2>
            {['Research Guide', 'Academic Guide', 'Industry Mentor'].map((r) => <div className="mt-4 flex min-w-0 items-center gap-3" key={r}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)]">DP</div><div className="min-w-0"><p className="truncate font-medium text-[color:var(--text)]">{r}</p><p className="truncate text-xs text-[color:var(--secondary)]">guide@dypatil.edu</p></div></div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

function GuideRow({ label, guide }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
      {guide ? (
        <div className="mt-2 flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
            {(guide.first_name?.[0] ?? 'G')}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-[color:var(--text)]">{`${guide.first_name ?? ''} ${guide.last_name ?? ''}`.trim()}</p>
            <p className="truncate text-xs text-[color:var(--secondary)]">{guide.email}</p>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-[color:var(--secondary)]">Not assigned</p>
      )}
    </div>
  )
}

function ProgressRing({ value }) {
  return <svg viewBox="0 0 40 40" className="h-10 w-10"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--surface-strong)" strokeWidth="5" /><circle cx="20" cy="20" r="16" fill="none" stroke="var(--accent)" strokeWidth="5" strokeDasharray={`${value} 100`} strokeLinecap="round" /></svg>
}
