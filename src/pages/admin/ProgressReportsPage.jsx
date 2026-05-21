import { BookOpen, CheckCircle2, Download, AlertTriangle, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { generateProgressReportPDF, getProgressReports } from '../../api/services/progressReportService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useUiStore } from '../../store/uiStore.js'

export default function AdminProgressReportsPage() {
  const [reports, setReports] = useState(null)
  const [students, setStudents] = useState([])
  const [users, setUsers] = useState([])
  const [period, setPeriod] = useState(1)
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    Promise.all([getProgressReports(), getStudents(), getUsers()]).then(([r, s, u]) => {
      setReports(r.data)
      setStudents(s.data)
      setUsers(u.data)
    })
  }, [])

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const studentMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])
  const nameOf = (studentId) => {
    const s = studentMap[studentId]
    const u = s ? userMap[s.user_id] : null
    return u ? `${u.first_name} ${u.last_name}` : studentId
  }

  if (!reports) return <SkeletonCard rows={8} />

  const periodReports = reports.filter((r) => r.period === period)
  const completed = periodReports.filter((r) => r.status === 'completed').length
  const overdue = periodReports.filter((r) => r.status === 'overdue').length
  const inProgress = periodReports.filter((r) => r.status === 'in_progress').length
  const avgCompletion = Math.round(periodReports.reduce((s, r) => s + r.completion_percentage, 0) / (periodReports.length || 1))

  const handleDownload = async (report) => {
    await generateProgressReportPDF(report.id)
    addToast({ type: 'success', title: `PDF generated for ${nameOf(report.student_id)}` })
  }

  return (
    <div className="fade-page">
      <PageHeader title="Progress Reports" subtitle="Overview of all student progress across report periods." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Completed" value={completed} tone="green" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdue} tone="orange" />
        <StatCard icon={BookOpen} label="In Progress" value={inProgress} tone="blue" />
        <StatCard icon={TrendingUp} label="Avg. Completion" value={`${avgCompletion}%`} tone="accent" />
      </div>

      <div className="mb-5 flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setPeriod(n)}
            className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${period === n ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--card)] text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}
          >
            Report {n}
          </button>
        ))}
      </div>

      {periodReports.length === 0 ? (
        <div className="card p-10 text-center">
          <BookOpen className="mx-auto text-[color:var(--muted)]" size={32} />
          <p className="mt-3 font-semibold text-[color:var(--text)]">No reports for this period yet</p>
          <p className="mt-1 text-sm text-[color:var(--secondary)]">Reports are generated as students submit their work.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {periodReports.map((report) => {
            const student = studentMap[report.student_id]
            const name = nameOf(report.student_id)
            const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2)
            return (
              <div key={report.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-sm font-semibold text-[color:var(--accent)]">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="safe-row items-start">
                      <div>
                        <p className="font-semibold text-[color:var(--text)]">{name}</p>
                        <p className="text-xs text-[color:var(--secondary)]">{student?.permanent_id} · {report.period_label}</p>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[color:var(--secondary)]">Completion</span>
                        <span className="text-[color:var(--text)]">{report.completion_percentage}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                        <div
                          className={`h-full rounded-full transition-all ${report.status === 'overdue' ? 'bg-orange-500' : report.status === 'completed' ? 'bg-emerald-500' : 'bg-[color:var(--accent)]'}`}
                          style={{ width: `${report.completion_percentage}%` }}
                        />
                      </div>
                    </div>

                    {report.submissions.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {report.submissions.map((s) => (
                          <div key={s.submission_id} className="flex items-center justify-between rounded-2xl bg-[color:var(--surface)] px-3 py-2">
                            <p className="line-clamp-1 text-xs text-[color:var(--text)]">{s.title}</p>
                            <StatusBadge status={s.final_status} />
                          </div>
                        ))}
                      </div>
                    )}

                    {report.coordinator_remarks && (
                      <p className="mt-3 text-xs italic text-[color:var(--secondary)]">"{report.coordinator_remarks}"</p>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-[color:var(--muted)]">
                        {report.total_submissions} submissions · {report.approved_count} approved · {report.pending_count} pending
                      </p>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)]"
                        onClick={() => handleDownload(report)}
                      >
                        <Download size={13} /> PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    accent: 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]',
  }
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${colors[tone]}`}>
          <Icon size={20} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-[color:var(--text)]">{value}</p>
        </div>
      </div>
    </div>
  )
}
