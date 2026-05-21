import { XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getSubmissionsByStudent } from '../../api/services/submissionService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'

export default function StudentsPage() {
  const [items, setItems] = useState(null)
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [studentSubs, setStudentSubs] = useState([])
  useScrollLock(Boolean(selected))

  useEffect(() => {
    Promise.all([getStudents(), getUsers()]).then(([students, userRes]) => {
      setItems(students.data)
      setUsers(userRes.data)
    })
  }, [])

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const nameOf = (student) => {
    const user = userMap[student.user_id]
    return user ? `${user.first_name} ${user.last_name}` : student.user_id
  }
  const emailOf = (student) => userMap[student.user_id]?.email || '-'

  const openStudent = async (student) => {
    setSelected(student)
    const subs = await getSubmissionsByStudent(student.id)
    setStudentSubs(subs.data)
  }

  if (!items) return <SkeletonCard rows={8} />

  return (
    <div className="fade-page">
      <PageHeader title="Students" subtitle="Enrollment, guides, and progress across the active batch." />
      <div className="card overflow-x-auto">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            <tr>{['Name', 'Permanent ID', 'Batch', 'Enrolled', 'Progress', 'Status'].map((h) => <th key={h} className="px-6 py-4">{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr className="table-row cursor-pointer border-b border-[color:var(--border)]" key={s.id} onClick={() => openStudent(s)}>
                <td className="px-6 py-5">
                  <button className="text-left font-semibold text-[color:var(--text)] hover:text-[color:var(--accent)]" onClick={(e) => { e.stopPropagation(); openStudent(s) }}>
                    {nameOf(s)}
                    <span className="block text-xs font-normal text-[color:var(--secondary)]">{emailOf(s)}</span>
                  </button>
                </td>
                <td>{s.permanent_id}</td>
                <td>{s.batch_id}</td>
                <td>{formatDate(s.enrolled_at)}</td>
                <td><div className="h-2 w-32 rounded-full bg-[color:var(--surface-strong)]"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${s.progress_summary.completion_percentage}%` }} /></div></td>
                <td><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-[color:var(--border)] p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Student Details</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{nameOf(selected)}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">{selected.permanent_id} · {emailOf(selected)}</p>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setSelected(null)}><XCircle size={18} /></button>
            </div>
            <div className="max-h-[calc(100%-96px)] overflow-auto overscroll-contain p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Info label="Batch" value={selected.batch_id} />
                <Info label="Status" value={<StatusBadge status={selected.status} />} />
                <Info label="Enrolled" value={formatDate(selected.enrolled_at)} />
                <Info label="Progress" value={`${selected.progress_summary.completion_percentage}%`} />
              </div>
              <div className="mt-5 rounded-3xl bg-[color:var(--surface)] p-5">
                <p className="font-semibold text-[color:var(--text)]">Profile</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]">{selected.profile.bio}</p>
              </div>
              <div className="mt-5">
                <h3 className="font-semibold text-[color:var(--text)]">Submissions</h3>
                <div className="mt-3 space-y-3">
                  {studentSubs.map((sub) => (
                    <div className="rounded-3xl border border-[color:var(--border)] p-4" key={sub.id}>
                      <div className="safe-row items-start">
                        <p className="line-clamp-2 text-sm font-semibold text-[color:var(--text)]">{sub.title}</p>
                        <StatusBadge status={sub.status} />
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--secondary)]">Report {sub.report_period} · {formatDate(sub.submitted_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }) {
  return <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p><div className="mt-2 text-sm font-semibold text-[color:var(--text)]">{value}</div></div>
}
