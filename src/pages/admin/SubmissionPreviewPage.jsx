/**
 * Full-page submission preview — document viewer left, feedback right.
 * Reused for all three submission kinds (progress report / assignment /
 * milestone) and for both admin review and a scholar's own read-only view.
 * Replaces the old sidedrawer preview (ApprovalsPage's `selected` panel).
 */
import {
  ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Download,
  FileQuestion, Loader2, RotateCcw, XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { getApprovalsBySubmission, reviewSubmission } from '../../api/services/approvalService.js'
import { getSubmissionById } from '../../api/services/submissionService.js'
import { getSubmissionFileUrl } from '../../api/services/videoService.js'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import SubmissionRemarks from '../../components/shared/SubmissionRemarks.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'
import { usePermStore } from '../../store/permStore.js'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp']
// Prefer the descriptor's own `type` (the real extension, set by the backend
// at upload time) — `name` has its extension stripped off before storage
// (see videos.controller.js: `title: origName.replace(/\.[^.]+$/, '')`), so
// parsing it back out of the filename silently fails for every real upload.
// Fall back to parsing `.name` only for legacy { name, url } descriptors that
// predate the `type` field.
const extOf = (file) => (file?.type || (file?.name || '').split('.').pop() || '').toLowerCase()

export default function SubmissionPreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const addToast = useUiStore((s) => s.addToast)
  // Anyone who can act on an approval stage, or an admin. Students land here
  // read-only — the backend's own scoping is the real gate, this just avoids
  // showing action buttons nobody's allowed to use.
  const canReview = usePermStore((s) =>
    s.hasRole('admin') || s.hasRole('coordinator') || s.hasRole('academic_guide') || s.hasRole('industry_mentor'))

  const [submission, setSubmission] = useState(null)
  const [approvals, setApprovals] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [fileIndex, setFileIndex] = useState(0)
  const [fileUrl, setFileUrl] = useState(null)
  const [numPages, setNumPages] = useState(null)
  const [pageNum, setPageNum] = useState(1)
  const [acting, setActing] = useState(false)
  const [reviseOpen, setReviseOpen] = useState(false)
  const [reviseComment, setReviseComment] = useState('')
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveComment, setApproveComment] = useState('')

  // Siblings for prev/next — passed via navigation state from whichever list
  // linked here. Opened directly (bookmark/refresh) → no state, no prev/next.
  const siblingIds = location.state?.submissionIds || null
  const siblingIdx = siblingIds ? siblingIds.indexOf(id) : -1
  const prevId = siblingIds && siblingIdx > 0 ? siblingIds[siblingIdx - 1] : null
  const nextId = siblingIds && siblingIdx >= 0 && siblingIdx < siblingIds.length - 1 ? siblingIds[siblingIdx + 1] : null
  const goTo = (targetId) => targetId && navigate(`/admin/submissions/${targetId}/preview`, { state: location.state })

  const load = () => {
    setSubmission(null)
    setApprovals([])
    setFileIndex(0)
    setNotFound(false)
    getSubmissionById(id)
      .then((r) => { if (!r.data) setNotFound(true); else setSubmission(r.data) })
      .catch(() => setNotFound(true))
    getApprovalsBySubmission(id).then((r) => setApprovals(r.data || [])).catch(() => setApprovals([]))
  }
  useEffect(load, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard prev/next — review a whole batch's stack without returning to the list.
  useEffect(() => {
    if (!siblingIds) return undefined
    const onKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft' && prevId) goTo(prevId)
      if (e.key === 'ArrowRight' && nextId) goTo(nextId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prevId, nextId, siblingIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const files = Array.isArray(submission?.file_urls) ? submission.file_urls : []
  const file = files[fileIndex] || null

  useEffect(() => {
    setFileUrl(null)
    setNumPages(null)
    setPageNum(1)
    if (!file) return
    if (file.media_id) getSubmissionFileUrl(file.media_id).then((r) => setFileUrl(r.data.url)).catch(() => setFileUrl(null))
    else setFileUrl(file.url || null)
  }, [file?.media_id, file?.url]) // eslint-disable-line react-hooks/exhaustive-deps

  const ext = extOf(file)
  const isPdf = ext === 'pdf'
  const isImage = IMAGE_EXT.includes(ext)
  // Progress reports and milestones carry an approval chain; assignments don't.
  const hasChain = approvals.length > 0
  const currentStage = approvals
    .slice()
    .sort((a, b) => (a.order_index ?? a.stage_order ?? 0) - (b.order_index ?? b.stage_order ?? 0))
    .find((a) => a.status === 'pending' || a.status === 'under_review')

  const doApprove = async () => {
    if (!currentStage) return
    setActing(true)
    try {
      await reviewSubmission(currentStage.id, {
        action: 'approve',
        ...(approveComment.trim() ? { comments: approveComment.trim() } : {}),
      })
      addToast({ type: 'success', title: 'Approved' + (approveComment.trim() ? ' with feedback' : '') })
      setApproveOpen(false); setApproveComment('')
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Could not approve', message: err.response?.data?.message })
    } finally { setActing(false) }
  }

  const doRevise = async () => {
    if (!currentStage || !reviseComment.trim()) {
      addToast({ type: 'warning', title: 'Add a revision comment first' })
      return
    }
    setActing(true)
    try {
      await reviewSubmission(currentStage.id, { action: 'request_revision', comments: reviseComment.trim() })
      addToast({ type: 'success', title: 'Revision request sent to scholar' })
      setReviseOpen(false); setReviseComment('')
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Could not send revision', message: err.response?.data?.message })
    } finally { setActing(false) }
  }

  if (notFound) {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-[color:var(--bg)] p-6">
        <div className="card max-w-sm p-10 text-center">
          <FileQuestion className="mx-auto text-[color:var(--muted)]" size={32} />
          <p className="mt-3 font-semibold text-[color:var(--text)]">Submission not found</p>
          <button onClick={() => navigate(-1)} className="btn-primary mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm">
            <ArrowLeft size={15} /> Back
          </button>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="fixed inset-0 z-40 overflow-auto bg-[color:var(--bg)] p-6">
        <SkeletonCard rows={10} />
      </div>
    )
  }

  const scholarName = `${submission.first_name || ''} ${submission.last_name || ''}`.trim() || '—'

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[color:var(--bg)]">
      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => navigate(-1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" title="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[color:var(--text)]">{submission.title}</p>
            <p className="truncate text-xs text-[color:var(--secondary)]">
              {canReview
                ? <Link to={`/admin/students/${submission.student_user_id}`} className="font-medium hover:text-[color:var(--accent)]">{scholarName}</Link>
                : <span className="font-medium">{scholarName}</span>}
              {submission.batch_name ? ` · ${submission.batch_name}` : ''} · <span className="capitalize">{submission.submission_type?.replaceAll('_', ' ')}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {siblingIds && siblingIds.length > 1 && (
            <div className="flex items-center gap-1 rounded-full bg-[color:var(--surface)] p-1">
              <button disabled={!prevId} onClick={() => goTo(prevId)} className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--card)] disabled:opacity-30" title="Previous (←)">
                <ChevronLeft size={16} />
              </button>
              <span className="px-1 text-[11px] font-semibold text-[color:var(--muted)]">{siblingIdx + 1} / {siblingIds.length}</span>
              <button disabled={!nextId} onClick={() => goTo(nextId)} className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--card)] disabled:opacity-30" title="Next (→)">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <StatusBadge status={submission.status} />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[1fr_380px]">
        {/* ── Document viewer ── */}
        <div className="flex flex-col overflow-hidden bg-[color:var(--surface)]">
          {files.length > 1 && (
            <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2">
              {files.map((f, i) => (
                <button key={f.media_id || f.url || i} onClick={() => setFileIndex(i)}
                  className={`shrink-0 truncate rounded-full px-3 py-1.5 text-xs font-semibold max-w-[220px] ${i === fileIndex ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
                  {f.name || `File ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto p-6">
            {!file ? (
              <PreviewEmpty />
            ) : isPdf ? (
              fileUrl ? (
                <div className="mx-auto w-fit">
                  <Document
                    file={fileUrl}
                    onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                    loading={<div className="grid h-96 place-items-center"><Loader2 className="animate-spin text-[color:var(--accent)]" size={28} /></div>}
                    error={<PreviewUnavailable file={file} url={fileUrl} />}
                  >
                    <Page pageNumber={pageNum} width={780} renderTextLayer renderAnnotationLayer className="overflow-hidden rounded-xl shadow-lg" />
                  </Document>
                  {numPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-4">
                      <button disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)}
                        className="rounded-full bg-[color:var(--card)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] shadow disabled:opacity-30">Prev page</button>
                      <span className="text-xs font-semibold text-[color:var(--secondary)]">Page {pageNum} of {numPages}</span>
                      <button disabled={pageNum >= numPages} onClick={() => setPageNum((p) => p + 1)}
                        className="rounded-full bg-[color:var(--card)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] shadow disabled:opacity-30">Next page</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid h-96 place-items-center"><Loader2 className="animate-spin text-[color:var(--accent)]" size={28} /></div>
              )
            ) : isImage ? (
              fileUrl ? <img src={fileUrl} alt={file.name} className="mx-auto max-w-full rounded-xl shadow-lg" /> : <div className="grid h-96 place-items-center"><Loader2 className="animate-spin text-[color:var(--accent)]" size={28} /></div>
            ) : (
              <PreviewUnavailable file={file} url={fileUrl} />
            )}
          </div>
        </div>

        {/* ── Feedback panel ── */}
        <div className="flex flex-col overflow-y-auto border-t border-[color:var(--border)] bg-[color:var(--card)] xl:border-l xl:border-t-0">
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Semester" value={`Semester ${submission.semester || 1}`} />
              <Info label="Version" value={`v${submission.version || 1}`} />
              <Info label="Submitted" value={formatDate(submission.submitted_at)} />
              <Info label="Status" value={<StatusBadge status={submission.status} />} />
            </div>

            {hasChain ? (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Approval chain</p>
                <div className="mt-3 space-y-3">
                  {approvals
                    .slice()
                    .sort((a, b) => (a.order_index ?? a.stage_order ?? 0) - (b.order_index ?? b.stage_order ?? 0))
                    .map((a) => (
                      <div key={a.id} className={`rounded-lg border p-3 ${a.id === currentStage?.id ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]' : 'border-[color:var(--border)] bg-[color:var(--card)]'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold capitalize text-[color:var(--text)]">{a.stage?.replaceAll('_', ' ')}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        {a.comments && <p className="mt-2 text-xs leading-5 text-[color:var(--secondary)]">{a.comments}</p>}
                        {a.suggested_title && <p className="mt-2 rounded-md bg-[color:var(--surface)] p-2 text-[11px] text-[color:var(--secondary)]"><b>Suggested title:</b> {a.suggested_title}</p>}
                      </div>
                    ))}
                </div>

                {canReview && currentStage && (
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setApproveOpen(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button onClick={() => setReviseOpen(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                      <RotateCcw size={14} /> Needs Revision
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                  {submission.submission_type === 'assignment' ? 'Feedback (no approval step for assignments)' : 'Feedback'}
                </p>
                <SubmissionRemarks submissionId={submission.id} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Approve modal ── */}
      {approveOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => setApproveOpen(false)}>
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="safe-row items-start">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Approve submission</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{submission.title}</h2>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setApproveOpen(false)}><XCircle size={18} /></button>
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Feedback to scholar</span>
              <textarea className="textarea mt-2 h-32 w-full" value={approveComment} onChange={(e) => setApproveComment(e.target.value)} placeholder="Optional — add feedback the scholar will see with the approval." />
            </label>
            <div className="safe-actions mt-5 justify-end">
              <button className="h-11 rounded-md bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={() => setApproveOpen(false)}>Cancel</button>
              <button className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" onClick={doApprove} disabled={acting}>
                {acting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {acting ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revision modal ── */}
      {reviseOpen && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" onClick={() => setReviseOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[30px] bg-[color:var(--card)] p-5 shadow-hover md:left-1/2 md:right-auto md:w-[680px] md:-translate-x-1/2 md:p-7" onClick={(e) => e.stopPropagation()}>
            <div className="safe-row items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Revision Comment</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{submission.title}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setReviseOpen(false)}><XCircle size={18} /></button>
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Comment to student</span>
              <textarea className="textarea mt-2 h-32 w-full" value={reviseComment} onChange={(e) => setReviseComment(e.target.value)} placeholder="Explain what needs to change before approval." />
            </label>
            <div className="safe-actions mt-5 justify-end">
              <button className="h-11 rounded-md bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={() => setReviseOpen(false)}>Cancel</button>
              <button className="btn-primary disabled:opacity-50" onClick={doRevise} disabled={acting}>{acting ? 'Sending…' : 'Submit Revision'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-[color:var(--surface)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
      <div className="mt-1 text-sm font-semibold text-[color:var(--text)]">{value}</div>
    </div>
  )
}

function PreviewEmpty() {
  return (
    <div className="grid h-96 place-items-center text-center">
      <div>
        <FileQuestion className="mx-auto text-[color:var(--muted)]" size={32} />
        <p className="mt-3 text-sm text-[color:var(--secondary)]">No file attached to this submission.</p>
      </div>
    </div>
  )
}

function PreviewUnavailable({ file, url }) {
  return (
    <div className="grid h-96 place-items-center text-center">
      <div>
        <FileQuestion className="mx-auto text-[color:var(--muted)]" size={32} />
        <p className="mt-3 text-sm font-semibold text-[color:var(--text)]">{file?.name || 'This file'}</p>
        <p className="mt-1 text-xs text-[color:var(--secondary)]">No inline preview available for this file type — download it to view.</p>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--accent-tint)] px-4 text-sm font-semibold text-[color:var(--accent)]">
            <Download size={15} /> Download
          </a>
        )}
      </div>
    </div>
  )
}
