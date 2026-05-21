import { Bell, Calendar, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications, markAllAsRead } from '../../api/services/notificationService.js'
import { getSubmissionsByStudent } from '../../api/services/submissionService.js'
import { getStudentById } from '../../api/services/studentService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate, timeAgo } from '../../lib/formatters.js'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  useEffect(() => {
    Promise.all([getStudentById('stu_001'), getSubmissionsByStudent('stu_001'), getNotifications()])
      .then(([student, submissions, notifications]) => setData({ student: student.data, submissions: submissions.data, notifications: notifications.data.filter((n) => !n.is_read).slice(0, 5) }))
  }, [])
  if (!data) return <SkeletonCard rows={6} />

  const stats = [
    ['Batch 2024-A', <Calendar size={20} />],
    [`Overall Progress: ${data.student.progress_summary.completion_percentage}%`, <ProgressRing value={data.student.progress_summary.completion_percentage} />],
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
            {data.submissions.slice(0, 3).map((s) => (
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
              <Link className="btn-primary inline-flex items-center" to="/student/submit">Submit Title</Link>
              <Link className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 font-semibold text-[color:var(--secondary)]" to="/student/progress">Progress Reports</Link>
              <Link className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 font-semibold text-[color:var(--secondary)]" to="/student/profile/research">Research Profile</Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="safe-row">
              <h2 className="text-xl font-semibold text-[color:var(--text)]">Notifications</h2>
              <button className="text-xs font-semibold text-[color:var(--accent)]" onClick={() => markAllAsRead()}>Mark all read</button>
            </div>
            {data.notifications.map((n) => <p className="border-b border-[color:var(--border)] py-3 text-sm text-[color:var(--secondary)]" key={n.id}>{n.message}<span className="block text-xs text-[color:var(--muted)]">{timeAgo(n.created_at)}</span></p>)}
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

function ProgressRing({ value }) {
  return <svg viewBox="0 0 40 40" className="h-10 w-10"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--surface-strong)" strokeWidth="5" /><circle cx="20" cy="20" r="16" fill="none" stroke="var(--accent)" strokeWidth="5" strokeDasharray={`${value} 100`} strokeLinecap="round" /></svg>
}
