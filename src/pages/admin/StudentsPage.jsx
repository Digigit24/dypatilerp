import { Download, ExternalLink, FileText, Filter, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApprovals } from '../../api/services/approvalService.js'
import { getProgressReportByStudent } from '../../api/services/progressReportService.js'
import { getSubmissionsByStudent } from '../../api/services/submissionService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'

const STATUS_TABS = ['all', 'active', 'inactive']

export default function StudentsPage() {
  const [items, setItems] = useState(null)
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [studentSubs, setStudentSubs] = useState([])
  const [studentReports, setStudentReports] = useState([])
  const [selectedSub, setSelectedSub] = useState(null)
  const [subApprovals, setSubApprovals] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  useScrollLock(Boolean(selected))

  useEffect(() => {
    Promise.all([getStudents(), getUsers()]).then(([students, userRes]) => {
      setItems(students.data)
      setUsers(userRes.data)
    })
  }, [])

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const nameOf = (student) => { const u = userMap[student.user_id]; return u ? `${u.first_name} ${u.last_name}` : student.user_id }
  const emailOf = (student) => userMap[student.user_id]?.email || '-'

  const filtered = useMemo(() => {
    if (!items) return []
    return items.filter((s) => statusFilter === 'all' || s.status === statusFilter)
  }, [items, statusFilter])

  const openStudent = async (student) => {
    setSelected(student)
    setSelectedSub(null)
    setStudentReports([])
    const [subs, reports] = await Promise.all([
      getSubmissionsByStudent(student.id),
      getProgressReportByStudent(student.id),
    ])
    setStudentSubs(subs.data)
    setStudentReports(reports.data)
  }

  const openSubmission = async (sub) => {
    setSelectedSub(sub)
    const approvalRes = await getApprovals()
    setSubApprovals(approvalRes.data.filter((a) => a.submission_id === sub.id))
  }

  if (!items) return <SkeletonCard rows={8} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Students"
        subtitle="Enrollment, guides, and progress across the active batch."
        action={
          <button className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)]">
            <Download size={15} /> Export
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <div className="mobile-filter-scroll flex gap-2">
            {STATUS_TABS.map((tab) => (
              <button key={tab} onClick={() => setStatusFilter(tab)}
                className={`mobile-compact-button shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${statusFilter === tab ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}>
                {tab === 'all' ? `All (${items.length})` : `${tab.charAt(0).toUpperCase() + tab.slice(1)} (${items.filter((s) => s.status === tab).length})`}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold text-[color:var(--secondary)]">
            <Filter size={14} /> Filter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>{['Name', 'Permanent ID', 'Batch', 'Enrolled', 'Progress', 'Status'].map((h) => <th key={h} className="px-6 py-4">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr className="table-row cursor-pointer border-b border-[color:var(--border)]" key={s.id} onClick={() => openStudent(s)}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-sm font-semibold text-[color:var(--accent)]">
                        {nameOf(s).split(' ').map((p) => p[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-[color:var(--text)]">{nameOf(s)}</p>
                        <p className="text-xs text-[color:var(--secondary)]">{emailOf(s)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 text-[color:var(--secondary)]">{s.permanent_id}</td>
                  <td className="px-6 text-[color:var(--secondary)]">{s.batch_id}</td>
                  <td className="px-6 text-[color:var(--secondary)]">{formatDate(s.enrolled_at)}</td>
                  <td className="px-6">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${s.progress_summary.completion_percentage}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-[color:var(--secondary)]">{s.progress_summary.completion_percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Student detail drawer ── */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-start justify-between border-b border-[color:var(--border)] p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Student Details</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{nameOf(selected)}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">{selected.permanent_id} · {emailOf(selected)}</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setSelected(null)}><XCircle size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto overscroll-contain p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Info label="Batch" value={selected.batch_id} />
                <Info label="Status" value={<StatusBadge status={selected.status} />} />
                <Info label="Enrolled" value={formatDate(selected.enrolled_at)} />
                <Info label="Progress" value={`${selected.progress_summary.completion_percentage}%`} />
              </div>

              <div className="rounded-3xl bg-[color:var(--surface)] p-5">
                <p className="font-semibold text-[color:var(--text)]">Profile</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]">{selected.profile.bio}</p>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Submissions</p>
                {studentSubs.length === 0
                  ? <p className="text-sm text-[color:var(--secondary)]">No submissions found.</p>
                  : <div className="space-y-2">
                    {studentSubs.map((sub) => (
                      <button
                        key={sub.id}
                        className="w-full rounded-3xl border border-[color:var(--border)] p-4 text-left transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)]"
                        onClick={() => openSubmission(sub)}
                      >
                        <div className="safe-row items-start">
                          <p className="line-clamp-2 text-sm font-semibold text-[color:var(--text)]">{sub.title}</p>
                          <StatusBadge status={sub.status} />
                        </div>
                        <p className="mt-1 text-xs text-[color:var(--secondary)]">Report {sub.report_period} · {formatDate(sub.submitted_at)}</p>
                      </button>
                    ))}
                  </div>
                }
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Progress Reports</p>
                {studentReports.length === 0
                  ? <p className="text-sm text-[color:var(--secondary)]">No progress reports yet.</p>
                  : <div className="space-y-2">
                    {studentReports.map((r) => (
                      <div key={r.id} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                        <div className="safe-row items-start">
                          <div>
                            <p className="text-sm font-semibold text-[color:var(--text)]">{r.period_label}</p>
                            <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{r.total_submissions} submissions · {r.approved_count} approved</p>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--border)]">
                          <div
                            className={`h-full rounded-full ${r.status === 'overdue' ? 'bg-orange-500' : r.status === 'completed' ? 'bg-emerald-500' : 'bg-[color:var(--accent)]'}`}
                            style={{ width: `${r.completion_percentage}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-right text-xs font-semibold text-[color:var(--secondary)]">{r.completion_percentage}%</p>
                      </div>
                    ))}
                  </div>
                }
              </div>

              <Link
                to={`/admin/students/${selected.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-3xl border border-[color:var(--accent)] bg-[color:var(--accent-tint)] py-3 text-sm font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white"
              >
                <ExternalLink size={15} /> View Full Profile
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Submission detail (nested, z-50) ── */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedSub(null)}>
          <div className="drawer-panel lg:!w-[min(840px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 safe-row border-b border-[color:var(--border)] p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Submission Detail</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{selectedSub.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">Report {selectedSub.report_period} · {nameOf(selected)}</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setSelectedSub(null)}><XCircle size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto overscroll-contain p-6 space-y-5 xl:grid xl:grid-cols-[1fr_300px] xl:gap-5 xl:space-y-0">
              <div className="space-y-5">
                <SubMediaPreview submission={selectedSub} />
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <p className="font-semibold text-[color:var(--text)]">Submission Info</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Info label="Report Period" value={`Report ${selectedSub.report_period}`} />
                    <Info label="Version" value={`v${selectedSub.title_version || 1}`} />
                    <Info label="Status" value={<StatusBadge status={selectedSub.status} />} />
                    <Info label="Submitted" value={formatDate(selectedSub.submitted_at)} />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                <p className="font-semibold text-[color:var(--text)]">Approval Thread</p>
                {subApprovals.length === 0
                  ? <p className="mt-3 text-sm text-[color:var(--secondary)]">No approval records yet.</p>
                  : <div className="mt-4 space-y-3">
                    {subApprovals.map((a) => (
                      <div key={a.id} className="rounded-3xl bg-[color:var(--card)] p-4">
                        <div className="safe-row items-start">
                          <p className="text-sm font-semibold capitalize text-[color:var(--text)]">{a.stage?.replaceAll('_', ' ')}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]">{a.comments || 'No comment.'}</p>
                        {a.suggested_title && (
                          <p className="mt-2 rounded-2xl bg-[color:var(--surface)] p-3 text-xs leading-5 text-[color:var(--secondary)]">
                            <b>Suggested title:</b> {a.suggested_title}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SubMediaPreview({ submission }) {
  const { presentation_type: type, presentation_url: url, presentation_filename: filename } = submission
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <div className="safe-row">
        <div>
          <p className="font-semibold text-[color:var(--text)]">Presentation Media</p>
          <p className="mt-1 text-xs text-[color:var(--secondary)]">{filename || 'No file attached'}</p>
        </div>
        {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 text-sm font-semibold text-[color:var(--accent)]">Open</a>}
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)]">
        {type === 'pdf' && url
          ? <iframe title="Preview" src={url} className="h-64 w-full" />
          : type === 'video' && url
            ? <video src={url} controls className="h-64 w-full bg-black" />
            : <div className="grid h-64 place-items-center text-center p-6">
              <div>
                <FileText className="mx-auto text-[color:var(--accent)]" size={32} />
                <p className="mt-3 font-semibold text-[color:var(--text)]">Preview unavailable</p>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">Open the uploaded file to review it.</p>
              </div>
            </div>
        }
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[color:var(--text)]">{value}</div>
    </div>
  )
}
