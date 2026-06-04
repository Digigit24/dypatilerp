import { Bell, Calendar, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import http from '../../api/http.js'
import { USE_MOCK } from '../../api/config.js'
import { getNotifications, markAllAsRead } from '../../api/services/notificationService.js'
import { getSubmissionsByStudent } from '../../api/services/submissionService.js'
import { getStudentById } from '../../api/services/studentService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate, timeAgo } from '../../lib/formatters.js'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const currentUser = useAuthStore((s) => s.currentUser)
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    const load = async () => {
      try {
        if (!USE_MOCK && currentUser?.id) {
          const { data: res } = await http.get('/dashboard/student')
          setData({ dashboard: res.data, isMock: false })
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
    const submissions = d.submissions ?? []
    const notifications = d.unread_notifications ?? 0

    const stats = [
      [d.enrollment?.batch_name ?? 'Fellowship', <Calendar size={20} />],
      [`Overall Progress: ${completion}%`, <ProgressRing value={completion} />],
      [`${d.submissions?.filter((s) => s.status === 'pending').length ?? 0} Pending Approvals`, <Clock size={20} />],
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
                  <div className="safe-row border-b border-[color:var(--border)] py-4" key={s.id}>
                    <div>
                      <p className="line-clamp-2 font-medium text-[color:var(--text)]">{s.title}</p>
                      <p className="text-xs text-[color:var(--secondary)]">{formatDate(s.submitted_at ?? s.created_at)}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))
              }
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
              <h2 className="text-xl font-semibold text-[color:var(--text)]">Assigned Guides</h2>
              {(d.guides ?? []).length === 0
                ? <p className="mt-3 text-sm text-[color:var(--secondary)]">No guides assigned yet.</p>
                : (d.guides ?? []).map((g) => (
                  <div className="mt-4 flex min-w-0 items-center gap-3" key={g.id ?? g.guide_type}>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                      {(g.first_name?.[0] ?? 'G')}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[color:var(--text)]">{`${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || g.guide_type}</p>
                      <p className="truncate text-xs text-[color:var(--secondary)]">{g.email ?? g.guide_type?.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))
              }
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

function ProgressRing({ value }) {
  return <svg viewBox="0 0 40 40" className="h-10 w-10"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--surface-strong)" strokeWidth="5" /><circle cx="20" cy="20" r="16" fill="none" stroke="var(--accent)" strokeWidth="5" strokeDasharray={`${value} 100`} strokeLinecap="round" /></svg>
}
