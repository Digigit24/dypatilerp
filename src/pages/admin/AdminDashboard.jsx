import { Activity, ClipboardCheck, FileText, GraduationCap, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getApplicants } from '../../api/services/applicantService.js'
import { getSubmissions } from '../../api/services/submissionService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  useEffect(() => {
    Promise.all([getApplicants(), getStudents(), getSubmissions(), getUsers()])
      .then(([a, s, sub, users]) => setData({ applicants: a.data, students: s.data, submissions: sub.data, users: users.data }))
  }, [])
  if (!data) return <SkeletonCard rows={6} />

  const pending = data.submissions.filter((s) => s.status === 'pending').length
  const userName = (userId) => {
    const user = data.users.find((u) => u.id === userId)
    return user ? `${user.first_name} ${user.last_name}` : userId
  }
  const studentName = (studentId) => {
    const student = data.students.find((s) => s.id === studentId)
    return student ? userName(student.user_id) : studentId
  }
  const stats = [
    ['Total Applicants', data.applicants.length, Users],
    ['Students Enrolled', data.students.length, GraduationCap],
    ['Pending Approvals', pending, ClipboardCheck],
    ['Submissions This Month', data.submissions.length, FileText],
    ['Tests Completed', data.applicants.filter((a) => a.test_score).length, Activity],
  ]

  return (
    <div className="fade-page">
      <PageHeader title="Good morning, Dr. Priya" subtitle="Here's what's happening with your fellowship program." />
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
          {data.submissions.slice(0, 5).map((s) => (
            <p key={s.id} className="mt-4 text-sm leading-6 text-[color:var(--secondary)]">{studentName(s.student_id)} submitted "{s.title}"</p>
          ))}
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-xl font-semibold text-[color:var(--text)]">Top Students by Progress</h2>
        {data.students.sort((a, b) => b.progress_summary.completion_percentage - a.progress_summary.completion_percentage).slice(0, 5).map((s) => (
          <div key={s.id} className="safe-row border-b border-[color:var(--border)] py-4 text-sm">
            <span className="truncate text-[color:var(--text)]">{userName(s.user_id)}</span>
            <span className="font-semibold text-[color:var(--accent)]">{s.progress_summary.completion_percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
