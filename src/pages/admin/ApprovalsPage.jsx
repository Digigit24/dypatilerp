import { CheckCircle2, Download, Eye, FileText, MessageSquare, RotateCcw, XCircle } from 'lucide-react'
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
  const [selected, setSelected] = useState(null)
  const [revisionTarget, setRevisionTarget] = useState(null)
  const [revisionComment, setRevisionComment] = useState('')
  const [suggestedTitle, setSuggestedTitle] = useState('')
  const addToast = useUiStore((s) => s.addToast)
  useScrollLock(Boolean(revisionTarget || selected))

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
  const userName = (userId) => {
    const user = userMap[userId]
    return user ? `${user.first_name} ${user.last_name}` : userId
  }
  const threadFor = (submissionId) => rows.filter((row) => row.submission_id === submissionId).sort((a, b) => (a.stage_order || 0) - (b.stage_order || 0))

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
      <PageHeader title="Approval Queue" subtitle="Review coordinator, academic guide, and industry mentor stages in one stream." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {['coordinator', 'academic_guide', 'industry_mentor'].map((stage) => {
          const count = rows.filter((row) => row.stage === stage).length
          return <div key={stage} className="card p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{stage.replaceAll('_', ' ')}</p>
            <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{count}</p>
            <p className="mt-1 text-xs text-[color:var(--secondary)]">items in approval stream</p>
          </div>
        })}
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            <tr>{['Student', 'Title', 'Stage', 'Approver', 'Status', 'Actions'].map((h) => <th className="px-6 py-4" key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="table-row cursor-pointer border-b border-[color:var(--border)]" onClick={() => setSelected(r)}>
                <td className="px-6 py-5 font-semibold text-[color:var(--text)]">{studentName(r.submission?.student_id)}</td>
                <td className="max-w-md truncate">{r.submission?.title}</td>
                <td className="capitalize">{r.stage?.replaceAll('_', ' ')}</td>
                <td>{userName(r.approver_id)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 py-2 text-xs font-semibold text-[color:var(--accent)]" onClick={() => setSelected(r)}><Eye size={15} /> Detail</button>
                    <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700" onClick={() => approve(r)}><CheckCircle2 size={15} /> Approve</button>
                    <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700" onClick={() => openRevision(r)}><RotateCcw size={15} /> Needs Revision</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <aside className="drawer-panel lg:!w-[min(1040px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="safe-row border-b border-[color:var(--border)] p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Submission Detail</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{selected.submission?.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">{studentName(selected.submission?.student_id)} · {selected.stage?.replaceAll('_', ' ')}</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setSelected(null)}><XCircle size={18} /></button>
            </div>
            <div className="grid max-h-[calc(100%-96px)] gap-5 overflow-auto overscroll-contain p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <MediaPreview submission={selected.submission} />
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <p className="font-semibold text-[color:var(--text)]">Submission</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Info label="Report Period" value={`Report ${selected.submission?.report_period}`} />
                    <Info label="Version" value={`v${selected.submission?.title_version || 1}`} />
                    <Info label="File" value={selected.submission?.presentation_filename || 'Not uploaded'} />
                    <Info label="Type" value={selected.submission?.presentation_type?.toUpperCase() || '-'} />
                  </div>
                </div>
                <div className="safe-actions">
                  <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" onClick={() => approve(selected)}><CheckCircle2 size={16} /> Approve</button>
                  <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700" onClick={() => openRevision(selected)}><RotateCcw size={16} /> Needs Revision</button>
                </div>
              </div>
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                <div className="safe-row">
                  <p className="font-semibold text-[color:var(--text)]">Revision Thread</p>
                  <MessageSquare size={17} className="text-[color:var(--accent)]" />
                </div>
                <div className="mt-4 space-y-3">
                  {threadFor(selected.submission_id).map((approval) => (
                    <div key={approval.id} className="rounded-3xl bg-[color:var(--card)] p-4">
                      <div className="safe-row items-start">
                        <div>
                          <p className="text-sm font-semibold capitalize text-[color:var(--text)]">{approval.stage?.replaceAll('_', ' ')}</p>
                          <p className="text-xs text-[color:var(--secondary)]">{userName(approval.approver_id)}</p>
                        </div>
                        <StatusBadge status={approval.status} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[color:var(--secondary)]">{approval.comments || 'No comment added.'}</p>
                      {approval.suggested_title && <p className="mt-3 rounded-2xl bg-[color:var(--surface)] p-3 text-xs leading-5 text-[color:var(--secondary)]"><b>Suggested title:</b> {approval.suggested_title}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

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

function MediaPreview({ submission }) {
  const type = submission?.presentation_type
  const url = submission?.presentation_url
  return <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
    <div className="safe-row">
      <div>
        <p className="font-semibold text-[color:var(--text)]">Presentation Media</p>
        <p className="mt-1 text-xs text-[color:var(--secondary)]">{submission?.presentation_filename || 'No file attached'}</p>
      </div>
      {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 text-sm font-semibold text-[color:var(--accent)]"><Download size={15} /> Open</a>}
    </div>
    <div className="mt-4 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)]">
      {type === 'pdf' && url ? <iframe title="Presentation preview" src={url} className="h-72 w-full" />
        : type === 'video' && url ? <video src={url} controls className="h-72 w-full bg-black" />
          : <div className="grid h-72 place-items-center p-6 text-center">
            <div>
              <FileText className="mx-auto text-[color:var(--accent)]" size={34} />
              <p className="mt-3 font-semibold text-[color:var(--text)]">Preview unavailable</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">Open the uploaded PPT/PDF file to review it.</p>
            </div>
          </div>}
    </div>
  </div>
}

function Info({ label, value }) {
  return <div className="rounded-2xl bg-[color:var(--card)] p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
    <p className="mt-2 text-sm font-semibold text-[color:var(--text)]">{value}</p>
  </div>
}
