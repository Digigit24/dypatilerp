/**
 * Assignments (student view) — every assignment for my batch, grouped by
 * semester. Clicking "Submit" opens an inline modal to upload files and
 * submit — no separate /student/submit page needed.
 */
import {
  ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock3,
  Loader, Paperclip, Send, Upload, X, XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getMyAssignments } from '../../api/services/assignmentService.js'
import { createSubmission, submitForReview } from '../../api/services/submissionService.js'
import { requestSubmissionUploadUrl } from '../../api/services/videoService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'

const overdue = (a) => a.due_date && !a.my_submission_id && new Date(a.due_date) < new Date()

const fmtBytes = (b) =>
  !b ? '—' : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`

// ─── Submit Modal ─────────────────────────────────────────────────────────────
function SubmitModal({ assignment, onClose, onSuccess, addToast }) {
  const { currentCourse } = useCourseStore()
  const [title, setTitle] = useState(assignment.title || '')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])           // [{file, status, pct, error, object_key}]
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef(null)

  const addFiles = (newFiles) => {
    setFiles((prev) => [
      ...prev,
      ...[...newFiles].map((f) => ({ file: f, status: 'pending', pct: 0, error: null, object_key: null })),
    ])
  }

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const patchFile = (idx, patch) =>
    setFiles((prev) => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))

  const uploadFile = (idx) => new Promise((resolve, reject) => {
    const entry = files[idx]
    const file = entry.file
    const mime = file.type || 'application/octet-stream'

    requestSubmissionUploadUrl({
      filename: file.name,
      course_id: currentCourse?.id,
      assignment_id: assignment.id,
      content_type: mime,
    }).then(({ data: urlData }) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) patchFile(idx, { pct: Math.round(e.loaded / e.total * 100) })
      }
      xhr.onload = () => {
        if (xhr.status < 300) {
          patchFile(idx, { status: 'done', pct: 100, object_key: urlData.object_key })
          resolve(urlData.object_key)
        } else {
          patchFile(idx, { status: 'error', error: `Upload failed (${xhr.status})` })
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }
      xhr.onerror = () => {
        patchFile(idx, { status: 'error', error: 'Network error' })
        reject(new Error('Network error'))
      }
      xhr.open('PUT', urlData.upload_url)
      xhr.setRequestHeader('Content-Type', mime)
      xhr.send(file)
    }).catch((err) => {
      patchFile(idx, { status: 'error', error: err.message })
      reject(err)
    })
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { addToast({ type: 'error', title: 'Title is required' }); return }
    setSubmitting(true)

    try {
      // Upload all pending files
      const uploadPromises = files.map((f, idx) => {
        if (f.status === 'done') return Promise.resolve(f.object_key)
        patchFile(idx, { status: 'uploading', pct: 0 })
        return uploadFile(idx)
      })
      const objectKeys = await Promise.all(uploadPromises)

      // Create submission with file_urls linked to object keys
      const file_urls = objectKeys
        .filter(Boolean)
        .map((key, i) => ({ key, name: files[i]?.file?.name || key.split('/').pop() }))

      const { data: sub } = await createSubmission({
        assignment_id: assignment.id,
        title: title.trim(),
        content: content.trim() || null,
        file_urls,
      })

      // Immediately submit for review
      await submitForReview(sub.id)

      addToast({ type: 'success', title: 'Submission sent for review!' })
      onSuccess()
    } catch (err) {
      addToast({ type: 'error', title: 'Submission failed', message: err.response?.data?.message || err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => !submitting && onClose()}>
      <div className="w-full max-w-lg rounded-3xl bg-[color:var(--card)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[color:var(--border)] p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Submit Assignment</p>
            <h2 className="mt-1 text-lg font-semibold text-[color:var(--text)] line-clamp-2">{assignment.title}</h2>
            {assignment.due_date && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[color:var(--muted)]">
                <CalendarDays size={11} /> Due {new Date(assignment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          <button disabled={submitting} onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--surface)] text-[color:var(--muted)] hover:text-[color:var(--text)]">
            <XCircle size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">Submission Title <span className="text-red-500">*</span></span>
            <input
              className="input mt-1.5 w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              placeholder="Your submission title"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">Description / Notes</span>
            <textarea
              className="input mt-1.5 w-full resize-none"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
              placeholder="Optional notes or summary for your submission…"
            />
          </label>

          {/* File upload zone */}
          <div>
            <span className="text-sm font-semibold text-[color:var(--text)]">Attach Files</span>
            <div
              className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color:var(--border)] p-5 transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)]"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
            >
              <Upload size={20} className="text-[color:var(--muted)]" />
              <p className="text-xs text-[color:var(--secondary)]">Click to choose or drag &amp; drop files</p>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                    <Paperclip size={13} className="shrink-0 text-[color:var(--muted)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[color:var(--text)]">{entry.file.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-[color:var(--muted)]">{fmtBytes(entry.file.size)}</p>
                        {entry.status === 'uploading' && <span className="text-[10px] font-semibold text-[color:var(--accent)]">{entry.pct}%</span>}
                        {entry.status === 'done' && <CheckCircle2 size={11} className="text-emerald-500" />}
                        {entry.status === 'error' && <span className="text-[10px] text-red-500">{entry.error}</span>}
                      </div>
                      {entry.status === 'uploading' && (
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                          <div className="h-full rounded-full bg-[color:var(--accent)] transition-all" style={{ width: `${entry.pct}%` }} />
                        </div>
                      )}
                    </div>
                    {entry.status !== 'uploading' && (
                      <button type="button" onClick={() => removeFile(idx)} disabled={submitting}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[color:var(--muted)] hover:bg-red-50 hover:text-red-500">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" disabled={submitting} onClick={onClose}
              className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <><Loader size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Submit</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentAssignmentsPage() {
  const [items, setItems] = useState(null)
  const [submittingAssignment, setSubmittingAssignment] = useState(null)
  const addToast = useUiStore((s) => s.addToast)

  const load = () =>
    getMyAssignments().then((r) => setItems(r.data || [])).catch(() => setItems([]))

  useEffect(() => { load() }, [])

  if (!items) return <SkeletonCard rows={5} />

  const bySemester = items.reduce((acc, a) => {
    const key = a.semester || 1
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const submittedCount = items.filter((a) => a.my_submission_id).length
  const mandatoryPending = items.filter((a) => a.is_mandatory && !a.my_submission_id).length

  return (
    <div className="fade-page">
      <PageHeader
        title="Assignments"
        subtitle="All assignments for your batch. Click any assignment to submit your work."
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          ['Total', items.length, ClipboardList, 'text-[color:var(--accent)]'],
          ['Submitted', submittedCount, CheckCircle2, 'text-emerald-600'],
          ['Mandatory Pending', mandatoryPending, Clock3, 'text-amber-500'],
        ].map(([label, val, Icon, cls]) => (
          <div key={label} className="card p-4 text-center">
            <Icon size={18} className={`mx-auto ${cls}`} />
            <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{val}</p>
            <p className="text-xs text-[color:var(--secondary)]">{label}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <ClipboardList size={30} className="text-[color:var(--muted)]" />
          <p className="text-sm font-semibold text-[color:var(--text)]">No assignments yet</p>
          <p className="text-xs text-[color:var(--secondary)]">Your coordinator will publish assignments for your batch here.</p>
        </div>
      ) : (
        Object.keys(bySemester).sort((a, b) => a - b).map((sem) => (
          <section key={sem} className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Semester {sem}</h2>
            <div className="space-y-3">
              {bySemester[sem].map((a) => (
                <div key={a.id} className={`card flex flex-wrap items-center gap-4 p-4 ${overdue(a) ? 'border-red-200' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[color:var(--text)]">{a.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.is_mandatory ? 'bg-red-100 text-red-700' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
                        {a.is_mandatory ? 'Mandatory' : 'Optional'}
                      </span>
                      {overdue(a) && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Overdue</span>}
                    </div>
                    {a.description && <p className="mt-1 line-clamp-2 text-xs text-[color:var(--secondary)]">{a.description}</p>}
                    {a.due_date && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[color:var(--muted)]">
                        <CalendarDays size={11} /> Due {new Date(a.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {a.my_submission_id ? (
                      <StatusBadge status={a.my_submission_status || 'submitted'} />
                    ) : (
                      <button
                        onClick={() => setSubmittingAssignment(a)}
                        className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
                      >
                        Submit <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {submittingAssignment && (
        <SubmitModal
          assignment={submittingAssignment}
          addToast={addToast}
          onClose={() => setSubmittingAssignment(null)}
          onSuccess={() => { setSubmittingAssignment(null); load() }}
        />
      )}
    </div>
  )
}
