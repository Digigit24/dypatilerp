import { Activity, ClipboardCheck, FileText, GraduationCap, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import http from '../../api/http.js'
import { getApplicants } from '../../api/services/applicantService.js'
import { getSubmissions } from '../../api/services/submissionService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import { USE_MOCK } from '../../api/config.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const currentUser = useAuthStore((s) => s.currentUser)
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    const load = async () => {
      try {
        if (!USE_MOCK) {
          const { data: res } = await http.get('/dashboard/admin')
          setData({ dashboard: res.data, isMock: false })
          return
        }
        const [a, s, sub, users] = await Promise.all([getApplicants(), getStudents(), getSubmissions(), getUsers()])
        setData({ applicants: a.data, students: s.data, submissions: sub.data, users: users.data, isMock: true })
      } catch (err) {
        addToast({ type: 'error', title: 'Failed to load dashboard', message: err.response?.data?.message || 'Something went wrong' })
        setData({})
      }
    }
    load()
  }, [])

  if (!data) return <SkeletonCard rows={6} />

  const firstName = currentUser?.first_name ?? 'there'

  // Use real dashboard data when available
  if (!data.isMock && data.dashboard) {
    const d = data.dashboard
    const totalApplicants = d.applicants?.reduce((s, r) => s + (r.count ?? 0), 0) ?? 0
    const pendingApprovals = d.submissions?.filter((s) => s.status === 'pending').length ?? 0

    const stats = [
      ['Total Applicants', totalApplicants, Users],
      ['Students Enrolled', d.total_active_students ?? 0, GraduationCap],
      ['Pending Approvals', pendingApprovals, ClipboardCheck],
      ['Submissions This Month', d.submissions?.length ?? 0, FileText],
      ['Active Courses', d.total_active_courses ?? 0, Activity],
    ]

    return (
      <div className="fade-page">
        <PageHeader title={`Good morning, ${firstName}`} subtitle="Here's what's happening with your fellowship program." />
        <div className="responsive-kpis">
          {stats.map(([k, v, Icon]) => (
            <div className="card card-hover p-6" key={k}>
              <div className="safe-row">
                <p className="text-sm font-semibold text-[color:var(--secondary)]">{k}</p>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><Icon size={18} /></span>
              </div>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-[color:var(--text)]">{v}</p>
            </div>
          ))}
        </div>

        <div className="responsive-two mt-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">Submissions by Month</h2>
            <svg viewBox="0 0 640 260" className="mt-6 h-64 w-full">
              {[80, 120, 90, 180, 150, 220].map((h, i) => <rect key={i} x={45 + i * 95} y={230 - h} width="46" height={h} rx="12" fill="var(--accent)" opacity=".82" />)}
            </svg>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">Applicants by Status</h2>
            {(d.applicants || []).map((r) => (
              <div key={r.status} className="safe-row border-b border-[color:var(--border)] py-3">
                <p className="text-sm capitalize text-[color:var(--secondary)]">{r.status?.replace('_', ' ')}</p>
                <span className="font-semibold text-[color:var(--text)]">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        {d.batches?.length > 0 && (
          <div className="card mt-6 p-6">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">Active Batches</h2>
            {d.batches.slice(0, 5).map((b) => (
              <div key={b.id} className="safe-row border-b border-[color:var(--border)] py-4 text-sm">
                <span className="font-semibold text-[color:var(--text)]">{b.name}</span>
                <span className="text-[color:var(--secondary)]">{b.enrolled_count ?? 0} students</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Mock fallback
  const { applicants = [], students = [], submissions = [], users = [] } = data
  const pending = submissions.filter((s) => s.status === 'pending').length
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))
  const userName = (userId) => { const u = userMap[userId]; return u ? `${u.first_name} ${u.last_name}` : userId }
  const studentName = (studentId) => { const s = students.find((s) => s.id === studentId); return s ? userName(s.user_id) : studentId }

  const stats = [
    ['Total Applicants', applicants.length, Users],
    ['Students Enrolled', students.length, GraduationCap],
    ['Pending Approvals', pending, ClipboardCheck],
    ['Submissions This Month', submissions.length, FileText],
    ['Tests Completed', applicants.filter((a) => a.test_score).length, Activity],
  ]

  return (
    <div className="fade-page">
      <PageHeader title={`Good morning, ${firstName}`} subtitle="Here's what's happening with your fellowship program." />
      <div className="responsive-kpis">
        {stats.map(([k, v, Icon]) => (
          <div className="card card-hover p-6" key={k}>
            <div className="safe-row">
              <p className="text-sm font-semibold text-[color:var(--secondary)]">{k}</p>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><Icon size={18} /></span>
            </div>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-[color:var(--text)]">{v}</p>
            <p className="mt-2 text-xs font-medium text-emerald-600">+12 this month</p>
          </div>
        ))}
      </div>

      <div className="responsive-two mt-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">Submissions by Month</h2>
          <svg viewBox="0 0 640 260" className="mt-6 h-64 w-full">
            {[80, 120, 90, 180, 150, 220].map((h, i) => <rect key={i} x={45 + i * 95} y={230 - h} width="46" height={h} rx="12" fill="var(--accent)" opacity=".82" />)}
          </svg>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">Recent Activity</h2>
          {submissions.slice(0, 5).map((s) => (
            <p key={s.id} className="mt-4 text-sm leading-6 text-[color:var(--secondary)]">{studentName(s.student_id)} submitted "{s.title}"</p>
          ))}
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-xl font-semibold text-[color:var(--text)]">Top Students by Progress</h2>
        {students.sort((a, b) => (b.progress_summary?.completion_percentage ?? 0) - (a.progress_summary?.completion_percentage ?? 0)).slice(0, 5).map((s) => (
          <div key={s.id} className="safe-row border-b border-[color:var(--border)] py-4 text-sm">
            <span className="truncate text-[color:var(--text)]">{userName(s.user_id)}</span>
            <span className="font-semibold text-[color:var(--accent)]">{s.progress_summary?.completion_percentage ?? 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
