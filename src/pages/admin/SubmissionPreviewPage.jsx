/**
 * Full-page submission preview — document viewer left, feedback right.
 * Reused for all three submission kinds (progress report / assignment /
 * milestone) and for both admin review and a scholar's own read-only view.
 * Replaces the old sidedrawer preview (ApprovalsPage's `selected` panel).
 */
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Download,
  FileQuestion, Loader2, MessageSquarePlus, Paperclip, RotateCcw, Trash2, UploadCloud, XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  getApprovalsBySubmission, reviewSubmission, submitApprovalFeedback, uploadFeedbackAttachment,
} from '../../api/services/approvalService.js'
import {
  getSubmissionById, removeSubmissionAttachment, uploadSubmissionAttachment,
} from '../../api/services/submissionService.js'
import { getSubmissionFileUrl } from '../../api/services/videoService.js'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import SubmissionFileLink from '../../components/shared/SubmissionFileLink.jsx'
import SubmissionRemarks from '../../components/shared/SubmissionRemarks.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate } from '../../lib/formatters.js'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { usePermStore } from '../../store/permStore.js'

// Editable up to a final approval decision — matches the backend gate in
// videos.controller.js exactly. 'rejected' is deliberately excluded: there is
// no resubmit path for it anywhere in the UI today (unlike needs_revision),
// so reopening file edits for it would have nowhere for the scholar to go.
const FILE_EDITABLE_STATUSES = ['draft', 'needs_revision', 'submitted', 'under_review']
const PROGRESS_REPORT_SLOTS = [
  { slot: 'report', label: 'Progress Report' },
  { slot: 'presentation', label: 'Presentation' },
]

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp']
// Prefer the descriptor's own `type` (the real extension, set by the backend
// at upload time) — `name` has its extension stripped off before storage
// (see videos.controller.js: `title: origName.replace(/\.[^.]+$/, '')`), so
// parsing it back out of the filename silently fails for every real upload.
// Fall back to parsing `.name` only for legacy { name, url } descriptors that
// predate the `type` field.
const extOf = (file) => (file?.type || (file?.name || '').split('.').pop() || '').toLowerCase()

// Resubmission never creates a new submission row — it deletes only the
// still-PENDING approval rows and re-inserts a fresh round, while every
// already-actioned row (approved/rejected/needs_revision, with its comments)
// stays put. So a submission can carry several rows for the SAME stage
// across rounds — sort by order_index first, then chronologically (oldest
// round first) so the chain reads as a proper thread instead of round order
// depending on whatever the DB happened to return.
const byChainOrder = (a, b) => {
  const byStage = (a.order_index ?? a.stage_order ?? 0) - (b.order_index ?? b.stage_order ?? 0)
  if (byStage !== 0) return byStage
  return new Date(a.created_at || 0) - new Date(b.created_at || 0)
}

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
  // File management (delete/replace) mirrors the backend's own authorization
  // exactly — owner, or admin/coordinator — not the broader canReview set
  // (a guide/mentor can approve but was never allowed to edit files on
  // someone's behalf; showing them a button that then 403s would be worse
  // than not showing it).
  const currentUser = useAuthStore((s) => s.currentUser)
  const isStaffFileManager = usePermStore((s) => s.hasRole('admin') || s.hasRole('coordinator'))

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
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [feedbackFileBusy, setFeedbackFileBusy] = useState(false)
  // Either a media_id (deleting that file) or a slot/'file' key (uploading) —
  // only one file operation may be in flight at a time on this page.
  const [fileBusy, setFileBusy] = useState(null)

  // Siblings for prev/next — passed via navigation state from whichever list
  // linked here. Opened directly (bookmark/refresh) → no state, no prev/next.
  const siblingIds = location.state?.submissionIds || null
  const siblingIdx = siblingIds ? siblingIds.indexOf(id) : -1
  const prevId = siblingIds && siblingIdx > 0 ? siblingIds[siblingIdx - 1] : null
  const nextId = siblingIds && siblingIdx >= 0 && siblingIdx < siblingIds.length - 1 ? siblingIds[siblingIdx + 1] : null
  const goTo = (targetId) => targetId && navigate(`/admin/submissions/${targetId}/preview`, { state: location.state })

  // Thread siblings — other submission rows bundled into the same progress
  // report cycle / assignment / milestone (see SubmissionsPage's threadKeyFor).
  // Passed as full row objects so switching between them needs no refetch
  // for the list-level fields; approvals/remarks for the newly-active one
  // still load fresh via the normal `load()` effect below.
  const threadItems = location.state?.groupMap?.[id] || null

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
  const orderedApprovals = approvals.slice().sort(byChainOrder)
  const currentStage = orderedApprovals.find((a) => a.status === 'pending' || a.status === 'under_review')

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

  // Document-style FINAL feedback — distinct from a revision request. Saves
  // onto the current pending stage without approving/rejecting it, so a
  // reviewer can write it up before deciding, or just leave a closing note
  // alongside an approval. Different from SubmissionRemarks (a free-form
  // thread anyone with access can post to) and from the revision `comments`
  // field (only ever written when a stage is actually sent back).
  const doSubmitFeedback = async () => {
    if (!currentStage || !feedbackDraft.trim()) {
      addToast({ type: 'warning', title: 'Write some feedback first' })
      return
    }
    setFeedbackSaving(true)
    try {
      await submitApprovalFeedback(currentStage.id, feedbackDraft.trim())
      addToast({ type: 'success', title: 'Feedback saved' })
      setFeedbackOpen(false); setFeedbackDraft('')
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Could not save feedback', message: err.response?.data?.message })
    } finally { setFeedbackSaving(false) }
  }

  const doUploadFeedbackFile = async (file) => {
    if (!currentStage || !file) return
    setFeedbackFileBusy(true)
    try {
      await uploadFeedbackAttachment(currentStage.id, file)
      addToast({ type: 'success', title: 'Feedback document uploaded' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Upload failed', message: err.response?.data?.message })
    } finally { setFeedbackFileBusy(false) }
  }

  // ── File management — delete / add / replace, gated the same way the
  //     backend gates it (see FILE_EDITABLE_STATUSES above). ──
  const handleDeleteFile = async (mediaId) => {
    if (!submission) return
    if (!confirm('Remove this file? You can upload a replacement afterwards.')) return
    setFileBusy(mediaId)
    try {
      await removeSubmissionAttachment(submission.id, mediaId)
      addToast({ type: 'success', title: 'File removed' })
      setFileIndex(0)
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Could not remove file', message: err.response?.data?.message })
    } finally {
      setFileBusy(null)
    }
  }

  const handleAddFile = async (file, slot = null) => {
    if (!submission || !file) return
    setFileBusy(slot || 'file')
    try {
      await uploadSubmissionAttachment(submission.id, file, slot)
      addToast({ type: 'success', title: slot ? `${slot === 'report' ? 'Report' : 'Presentation'} uploaded` : 'File uploaded' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Upload failed', message: err.response?.data?.message })
    } finally {
      setFileBusy(null)
    }
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

  // Same kind detection the backend uses (videos.controller.js) — a target_id
  // marks a milestone submission; submission_type itself has no enum value
  // for it (schema drift noted in CLAUDE.md — target_id is the real signal).
  const kind = submission.target_id ? 'target'
    : submission.submission_type === 'assignment' ? 'assignment' : 'progress_report'
  const isOwner = currentUser?.id === submission.student_user_id
  const canEditFiles = (isOwner || isStaffFileManager) && FILE_EDITABLE_STATUSES.includes(submission.status)
  // updated_at is bumped by submitForReview in the SAME statement as
  // submitted_at (both NOW() in one UPDATE), so they're equal immediately
  // after submit; any LATER file/content change makes updated_at strictly
  // newer. No extra column needed to detect "changed after submission".
  const filesChangedAfterSubmit = Boolean(
    submission.submitted_at && submission.updated_at
    && new Date(submission.updated_at) > new Date(submission.submitted_at)
  )

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
          {threadItems && threadItems.length > 1 && (
            <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2">
              <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">Thread</span>
              {threadItems.map((it, i) => (
                <button key={it.id} onClick={() => goTo(it.id)}
                  className={`shrink-0 truncate rounded-full px-3 py-1.5 text-xs font-semibold max-w-[220px] ${it.id === id ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
                  Part {i + 1} · {formatDate(it.submitted_at || it.created_at)}
                </button>
              ))}
            </div>
          )}
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

            {filesChangedAfterSubmit && canReview && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Files were changed after this was submitted — re-check them before approving.</span>
              </div>
            )}

            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Files</p>
              <div className="mt-3 space-y-2">
                {files.length === 0 && (
                  <p className="text-xs text-[color:var(--secondary)]">No files uploaded yet.</p>
                )}
                {files.map((f, i) => (
                  <div key={f.media_id || f.url || i} className="flex items-center justify-between gap-2 rounded-lg bg-[color:var(--card)] px-3 py-2 text-xs">
                    <span className="min-w-0 truncate text-[color:var(--text)]">
                      {kind === 'progress_report' && f.slot && (
                        <span className="mr-1.5 font-semibold text-[color:var(--accent)]">
                          {f.slot === 'report' ? 'Report:' : 'Presentation:'}
                        </span>
                      )}
                      {f.name || `File ${i + 1}`}
                    </span>
                    {canEditFiles && f.media_id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(f.media_id)}
                        disabled={fileBusy === f.media_id}
                        className="shrink-0 text-[color:var(--muted)] hover:text-red-500 disabled:opacity-50"
                        title="Remove this file"
                      >
                        {fileBusy === f.media_id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {canEditFiles && (
                <div className="mt-3 space-y-2">
                  {kind === 'progress_report' ? (
                    PROGRESS_REPORT_SLOTS.map(({ slot, label }) => {
                      const has = files.some((f) => f.slot === slot)
                      return (
                        <label
                          key={slot}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg bg-[color:var(--accent-tint)] px-3 py-2 text-xs font-semibold text-[color:var(--accent)] ${fileBusy === slot ? 'pointer-events-none opacity-60' : 'hover:bg-[color:var(--accent)] hover:text-white'}`}
                        >
                          {fileBusy === slot ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                          {has ? `Replace ${label}` : `Upload ${label}`}
                          <input
                            type="file"
                            accept=".pdf,.ppt,.pptx"
                            className="hidden"
                            disabled={fileBusy === slot}
                            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleAddFile(f, slot) }}
                          />
                        </label>
                      )
                    })
                  ) : (kind !== 'target' || files.length === 0) && (
                    // Targets take exactly one file — once it has one, the only
                    // way to change it is delete-then-upload (above), not append.
                    <label
                      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[color:var(--border)] px-3 py-2.5 text-xs font-semibold text-[color:var(--secondary)] ${fileBusy === 'file' ? 'pointer-events-none opacity-60' : 'hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]'}`}
                    >
                      {fileBusy === 'file' ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                      Add a file
                      <input
                        type="file"
                        className="hidden"
                        disabled={fileBusy === 'file'}
                        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleAddFile(f) }}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {hasChain ? (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Approval chain</p>
                <div className="mt-3 space-y-3">
                  {orderedApprovals.map((a) => (
                    <div key={a.id} className={`rounded-lg border p-3 ${a.id === currentStage?.id ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]' : 'border-[color:var(--border)] bg-[color:var(--card)]'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold capitalize text-[color:var(--text)]">{a.stage?.replaceAll('_', ' ')}</p>
                        <StatusBadge status={a.status} />
                      </div>
                      {/* Revision-request comment — the "revision feedback" thread; each
                          round that got sent back keeps its own row here, oldest first. */}
                      {a.status === 'needs_revision' && a.comments && (
                        <div className="mt-2 rounded-md bg-orange-50 p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">Revision requested</p>
                          <p className="mt-1 text-xs leading-5 text-orange-900">{a.comments}</p>
                        </div>
                      )}
                      {a.status !== 'needs_revision' && a.comments && (
                        <p className="mt-2 text-xs leading-5 text-[color:var(--secondary)]">{a.comments}</p>
                      )}
                      {a.suggested_title && <p className="mt-2 rounded-md bg-[color:var(--surface)] p-2 text-[11px] text-[color:var(--secondary)]"><b>Suggested title:</b> {a.suggested_title}</p>}
                      {/* Document-style final feedback — distinct from the revision
                          comment above; written via "Submit Feedback", not tied to
                          approve/reject/request_revision. */}
                      {a.feedback_html && (
                        <div className="mt-2 rounded-md bg-[color:var(--surface)] p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">Feedback</p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[color:var(--text)]">{a.feedback_html}</p>
                        </div>
                      )}
                      {Array.isArray(a.feedback_files) && a.feedback_files.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {a.feedback_files.map((f) => (
                            <SubmissionFileLink key={f.id} file={{ media_id: f.id, name: f.title }} label={f.title || 'Document'} />
                          ))}
                        </div>
                      )}
                      {canReview && a.id === currentStage?.id && (
                        <label className={`mt-2 flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[color:var(--accent)] ${feedbackFileBusy ? 'pointer-events-none opacity-50' : ''}`}>
                          {feedbackFileBusy ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                          {feedbackFileBusy ? 'Uploading…' : 'Attach a feedback document'}
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                            disabled={feedbackFileBusy}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) doUploadFeedbackFile(f); e.target.value = '' }}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                {canReview && currentStage && (
                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                      <button onClick={() => setApproveOpen(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button onClick={() => setReviseOpen(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                        <RotateCcw size={14} /> Needs Revision
                      </button>
                    </div>
                    <button onClick={() => { setFeedbackDraft(currentStage.feedback_html || ''); setFeedbackOpen(true) }} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[color:var(--surface)] px-3 py-2.5 text-xs font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--border)]">
                      <MessageSquarePlus size={14} /> {currentStage.feedback_html ? 'Edit Feedback' : 'Submit Feedback'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Free-form remarks thread — independent of the approval chain
                (coordinators/guides/mentors/admins can leave a note any time
                without approving or rejecting), so it's shown regardless of
                whether this submission kind has a chain at all. */}
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                {!hasChain && submission.submission_type === 'assignment' ? 'Feedback (no approval step for assignments)' : 'Feedback'}
              </p>
              <SubmissionRemarks submissionId={submission.id} onCountChange={load} />
            </div>
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

      {/* ── Submit Feedback modal — document-style final feedback, separate
          from the revision-request flow above. Doesn't approve/reject; just
          saves onto the current stage (PATCH /approvals/:id/feedback). ── */}
      {feedbackOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => setFeedbackOpen(false)}>
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="safe-row items-start">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Feedback</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{submission.title}</h2>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setFeedbackOpen(false)}><XCircle size={18} /></button>
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Feedback for this report</span>
              <textarea className="textarea mt-2 h-40 w-full" value={feedbackDraft} onChange={(e) => setFeedbackDraft(e.target.value)} placeholder="Write your review of this progress report. This is separate from a revision request — it doesn't change the report's status." />
            </label>
            <div className="safe-actions mt-5 justify-end">
              <button className="h-11 rounded-md bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={() => setFeedbackOpen(false)}>Cancel</button>
              <button className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" onClick={doSubmitFeedback} disabled={feedbackSaving}>
                {feedbackSaving ? <Loader2 size={16} className="animate-spin" /> : <MessageSquarePlus size={16} />} {feedbackSaving ? 'Saving…' : 'Save Feedback'}
              </button>
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
