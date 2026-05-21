import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getApprovals, reviewSubmission } from '../../api/services/approvalService.js'
import { getSubmissions } from '../../api/services/submissionService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { useUiStore } from '../../store/uiStore.js'

export default function ApprovalsPage() {
  const [rows, setRows] = useState(null)
  const [students, setStudents] = useState([])
  const [users, setUsers] = useState([])
  const [revisionTarget, setRevisionTarget] = useState(null)
  const [revisionComment, setRevisionComment] = useState('')
  const [suggestedTitle, setSuggestedTitle] = useState('')
  const addToast = useUiStore((s) => s.addToast)
  useScrollLock(Boolean(revisionTarget))

  useEffect(() => {
    Promise.all([getApprovals(), getSubmissions(), getStudents(), getUsers()]).then(([a, s, st, u]) => {
      setRows(a.data.map((ap) => ({ ...ap, submission: s.data.find((x) => x.id === ap.submission_id) })))
      setStudents(st.data)
      setUsers(u.data)
    })
  }, [])

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const studentMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])
  const studentName = (studentId) => {
    const student = studentMap[studentId]
    const user = student ? userMap[student.user_id] : null
    return user ? `${user.first_name} ${user.last_name}` : studentId
  }

  if (!rows) return <SkeletonCard rows={8} />

  const approve = async (r) => {
    const res = await reviewSubmission(r.submission_id, {
      stage: r.stage,
      stage_order: r.stage_order,
      approver_id: r.approver_id,
      status: 'approved',
      comments: 'Approved for the next stage.',
    })
    setRows((xs) => xs.map((x) => (x.id === r.id ? { ...x, ...res.data } : x)))
    addToast({ type: 'success', title: 'Submission approved' })
  }

  const openRevision = (row) => {
    setRevisionTarget(row)
    setRevisionComment('')
    setSuggestedTitle(row.submission?.title || '')
  }

  const submitRevision = async () => {
    if (!revisionComment.trim()) {
      addToast({ type: 'warning', title: 'Add a revision comment first' })
      return
    }
    const res = await reviewSubmission(revisionTarget.submission_id, {
      stage: revisionTarget.stage,
      stage_order: revisionTarget.stage_order,
      approver_id: revisionTarget.approver_id,
      status: 'needs_revision',
      comments: revisionComment.trim(),
      suggested_title: suggestedTitle.trim() || null,
    })
    setRows((xs) => xs.map((x) => (x.id === revisionTarget.id ? { ...x, ...res.data } : x)))
    setRevisionTarget(null)
    addToast({ type: 'success', title: 'Revision request sent to student' })
  }

  return (
    <div className="fade-page">
      <PageHeader title="Approval Queue" subtitle="Review current submission stages." />
      <div className="card overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            <tr>{['Student', 'Title', 'Stage', 'Status', 'Actions'].map((h) => <th className="px-6 py-4" key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="table-row border-b border-[color:var(--border)]">
                <td className="px-6 py-5 font-semibold text-[color:var(--text)]">{studentName(r.submission?.student_id)}</td>
                <td className="max-w-md truncate">{r.submission?.title}</td>
                <td className="capitalize">{r.stage?.replaceAll('_', ' ')}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700" onClick={() => approve(r)}><CheckCircle2 size={15} /> Approve</button>
                    <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700" onClick={() => openRevision(r)}><RotateCcw size={15} /> Needs Revision</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {revisionTarget && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setRevisionTarget(null)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[30px] bg-[color:var(--card)] p-5 shadow-hover md:left-1/2 md:right-auto md:w-[680px] md:-translate-x-1/2 md:p-7" onClick={(e) => e.stopPropagation()}>
            <div className="safe-row items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Revision Comment</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{studentName(revisionTarget.submission?.student_id)}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-[color:var(--secondary)]">{revisionTarget.submission?.title}</p>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setRevisionTarget(null)}><XCircle size={18} /></button>
            </div>
            <div className="mt-5 grid gap-4">
              <label>
                <span className="text-sm font-semibold text-[color:var(--text)]">Suggested title</span>
                <input className="input mt-2 w-full" value={suggestedTitle} onChange={(e) => setSuggestedTitle(e.target.value)} />
              </label>
              <label>
                <span className="text-sm font-semibold text-[color:var(--text)]">Comment to student</span>
                <textarea className="textarea mt-2 h-32 w-full" value={revisionComment} onChange={(e) => setRevisionComment(e.target.value)} placeholder="Explain what needs to change before approval." />
              </label>
            </div>
            <div className="safe-actions mt-5 justify-end">
              <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={() => setRevisionTarget(null)}>Cancel</button>
              <button className="btn-primary" onClick={submitRevision}>Submit Revision</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
