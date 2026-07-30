import { CheckCircle2, Download, Eye, FileText, MessageSquare, RotateCcw, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getApprovals, reviewSubmission } from '../../api/services/approvalService.js'
import { getSubmissions } from '../../api/services/submissionService.js'
import { getSubmissionFileUrl } from '../../api/services/videoService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { useUiStore } from '../../store/uiStore.js'
import { useCourseStore } from '../../store/courseStore.js'

export default function ApprovalsPage() {
  const [rows, setRows] = useState(null)
  const [selected, setSelected] = useState(null)
  const [revisionTarget, setRevisionTarget] = useState(null)
  const [revisionComment, setRevisionComment] = useState('')
  const [suggestedTitle, setSuggestedTitle] = useState('')
  const [approveTarget, setApproveTarget] = useState(null)
  const [approveComment, setApproveComment] = useState('')
  const [acting, setActing] = useState(false)
  const addToast = useUiStore((s) => s.addToast)
  useScrollLock(Boolean(revisionTarget || selected || approveTarget))
  const { currentCourse, currentBatch } = useCourseStore()

  // Approvals now carry the scholar name, batch, and course directly (see
  // GET /approvals). Refetch whenever the course/batch picker changes so the
  // queue is scoped to the selection (the API reads X-Course-Id / X-Batch-Id).
  useEffect(() => {
    let alive = true
    Promise.all([getApprovals(), getSubmissions()]).then(([a, s]) => {
      if (!alive) return
      setRows(a.data.map((ap) => ({ ...ap, submission: s.data.find((x) => x.id === ap.submission_id) })))
    }).catch(() => { if (alive) setRows([]) })
    return () => { alive = false }
  }, [currentCourse?.id, currentBatch?.id])

  const fullName = (first, last) => `${first || ''} ${last || ''}`.trim()
  const scholarName = (r) => fullName(r?.student_first_name, r?.student_last_name) || '—'
  const reviewerName = (r) => fullName(r?.reviewer_first_name, r?.reviewer_last_name) || '—'
  const threadFor = (submissionId) => rows.filter((row) => row.submission_id === submissionId).sort((a, b) => ((a.order_index ?? a.stage_order ?? 0) - (b.order_index ?? b.stage_order ?? 0)))

  // Stage summary cards derived from the returned rows — no hardcoded stages.
  const stageSummary = useMemo(() => {
    const counts = {}
    for (const r of (rows || [])) counts[r.stage] = (counts[r.stage] || 0) + 1
    return Object.entries(counts)
  }, [rows])

  if (!rows) return <SkeletonCard rows={8} />

  // Approve opens a small feedback modal first, so the admin can add institute
  // feedback (optional) that is sent as `comments` on the real action endpoint.
  const openApprove = (row) => {
    setApproveTarget(row)
    setApproveComment('')
  }

  const confirmApprove = async () => {
    if (!approveTarget) return
    setActing(true)
    try {
      // Real endpoint: POST /approvals/:approvalId/action { action, comments }
      const res = await reviewSubmission(approveTarget.id, {
        action: 'approve',
        ...(approveComment.trim() ? { comments: approveComment.trim() } : {}),
      })
      setRows((xs) => xs.map((x) => (x.id === approveTarget.id ? { ...x, ...res.data } : x)))
      addToast({ type: 'success', title: 'Approved' + (approveComment.trim() ? ' with feedback' : '') })
      setApproveTarget(null)
      setSelected(null)
    } catch (err) {
      addToast({ type: 'error', title: 'Could not approve', message: err.response?.data?.message || err.message })
    } finally {
      setActing(false)
    }
  }

  const openRevision = (row) => {
    setRevisionTarget(row)
    setRevisionComment('')
    setSuggestedTitle(row.title || row.submission?.title || '')
  }

  const submitRevision = async () => {
    if (!revisionComment.trim()) {
      addToast({ type: 'warning', title: 'Add a revision comment first' })
      return
    }
    setActing(true)
    try {
      const res = await reviewSubmission(revisionTarget.id, {
        action: 'request_revision',
        comments: revisionComment.trim(),
        suggested_title: suggestedTitle.trim() || null,
      })
      setRows((xs) => xs.map((x) => (x.id === revisionTarget.id ? { ...x, ...res.data } : x)))
      setRevisionTarget(null)
      setSelected(null)
      addToast({ type: 'success', title: 'Revision request sent to scholar' })
    } catch (err) {
      addToast({ type: 'error', title: 'Could not send revision', message: err.response?.data?.message || err.message })
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="fade-page">
      <PageHeader title="Approval Queue" subtitle="Review reports across the selected course and batch in one stream." />
      {stageSummary.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stageSummary.map(([stage, count]) => (
            <div key={stage} className="card p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{stage?.replaceAll('_', ' ')}</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{count}</p>
              <p className="mt-1 text-xs text-[color:var(--secondary)]">items in approval stream</p>
            </div>
          ))}
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            <tr>
              <th className="w-44 px-6 py-4">Scholar</th>
              {['Batch', 'Course', 'Report', 'Stage', 'Status', 'Actions'].map((h) => <th className="px-6 py-4" key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="table-row cursor-pointer border-b border-[color:var(--border)]" onClick={() => setSelected(r)}>
                <td className="w-44 px-6 py-5 font-semibold whitespace-nowrap text-[color:var(--text)]">{scholarName(r)}</td>
                <td className="whitespace-nowrap">{r.batch_name || '—'}</td>
                <td className="whitespace-nowrap">{r.course_name || '—'}</td>
                <td className="max-w-md truncate">{r.title}</td>
                <td className="capitalize">{r.stage?.replaceAll('_', ' ')}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 py-2 text-xs font-semibold text-[color:var(--accent)]" onClick={() => setSelected(r)}><Eye size={15} /> Detail</button>
                    <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700" onClick={() => openApprove(r)}><CheckCircle2 size={15} /> Approve</button>
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
            <div className="safe-row shrink-0 border-b border-[color:var(--border)] p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Submission Detail</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{selected.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">
                  {scholarName(selected)}{selected.batch_name ? ` · ${selected.batch_name}` : ''}{selected.course_name ? ` · ${selected.course_name}` : ''} · {selected.stage?.replaceAll('_', ' ')}
                </p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setSelected(null)}><XCircle size={18} /></button>
            </div>
            <div className="grid flex-1 gap-5 overflow-auto overscroll-contain p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <MediaPreview submission={selected.submission} />
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <p className="font-semibold text-[color:var(--text)]">Submission</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Info label="Type" value={selected.submission?.submission_type?.replaceAll('_', ' ') || '-'} />
                    <Info label="Version" value={`v${selected.submission?.version || 1}`} />
                    <Info label="File" value={selected.submission?.file_urls?.[0]?.name || 'Not uploaded'} />
                    <Info label="Format" value={selected.submission?.file_urls?.[0]?.type?.toUpperCase() || '-'} />
                  </div>
                </div>
                <div className="safe-actions">
                  <button className="mobile-compact-button inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" onClick={() => openApprove(selected)}><CheckCircle2 size={16} /> Approve</button>
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
                          <p className="text-xs text-[color:var(--secondary)]">{reviewerName(approval)}</p>
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
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{scholarName(revisionTarget)}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-[color:var(--secondary)]">{revisionTarget.title}</p>
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
              <button className="btn-primary disabled:opacity-50" onClick={submitRevision} disabled={acting}>{acting ? 'Sending…' : 'Submit Revision'}</button>
            </div>
          </div>
        </div>
      )}

      {approveTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => setApproveTarget(null)}>
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="safe-row items-start">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Approve submission</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{approveTarget.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">{scholarName(approveTarget)} · {approveTarget.batch_name || '—'} · {approveTarget.stage?.replaceAll('_', ' ')}</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setApproveTarget(null)}><XCircle size={18} /></button>
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Feedback to scholar</span>
              <textarea
                className="textarea mt-2 h-32 w-full"
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                placeholder="Optional — add feedback the scholar will see with the approval."
              />
            </label>
            <div className="safe-actions mt-5 justify-end">
              <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={() => setApproveTarget(null)}>Cancel</button>
              <button className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" onClick={confirmApprove} disabled={acting}>
                <CheckCircle2 size={16} /> {acting ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MediaPreview({ submission }) {
  const file = Array.isArray(submission?.file_urls) ? submission.file_urls[0] : null
  const [fetchedUrl, setFetchedUrl] = useState(null)
  useEffect(() => {
    let alive = true
    if (file?.media_id) getSubmissionFileUrl(file.media_id).then((r) => { if (alive) setFetchedUrl(r.data.url) }).catch(() => {})
    return () => { alive = false }
  }, [file?.media_id])
  const url = file?.media_id ? fetchedUrl : (file?.url || null)
  return <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
    <div className="safe-row">
      <div>
        <p className="font-semibold text-[color:var(--text)]">Submission File</p>
        <p className="mt-1 text-xs text-[color:var(--secondary)]">{file?.name || 'No file attached'}</p>
      </div>
      {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 text-sm font-semibold text-[color:var(--accent)]"><Download size={15} /> Open</a>}
    </div>
    {!file && (
      <div className="mt-4 grid h-40 place-items-center rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
        <div>
          <FileText className="mx-auto text-[color:var(--accent)]" size={30} />
          <p className="mt-3 text-sm text-[color:var(--secondary)]">No file attached to this submission.</p>
        </div>
      </div>
    )}
  </div>
}

function Info({ label, value }) {
  return <div className="rounded-2xl bg-[color:var(--card)] p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
    <p className="mt-2 text-sm font-semibold text-[color:var(--text)]">{value}</p>
  </div>
}
