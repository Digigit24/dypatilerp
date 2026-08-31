/**
 * Admin "Upload for Student" drawer — attached to a single assignment.
 * Opens in the same side-drawer chrome as the assignment editor and the bulk
 * import wizard (see AssignmentsPage.jsx / ImportDrawer.jsx) rather than a
 * centered pop-up, for a consistent feel across the Assignments page.
 *
 * Lets an admin search for and pick one actively-enrolled student from the
 * assignment's batch, attach a presentation (PPT/PPTX) and/or a report (PDF),
 * write an optional feedback/recommendation note, and submit on the scholar's
 * behalf. Mirrors the existing on-behalf progress-report flow (create draft →
 * upload attachment(s) → save note → submit for review) but targets an
 * assignment, and supports two files in one go instead of one.
 */
import { FileText, Loader2, Presentation, Search, UploadCloud, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getBatchStudents } from '../../api/services/batchService.js'
import { getAssignmentSubmissions } from '../../api/services/assignmentService.js'
import {
  createSubmissionOnBehalf, submitForReviewOnBehalf, updateSubmission, uploadSubmissionAttachment,
} from '../../api/services/submissionService.js'
import { scholarName } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'

export default function UploadAssignmentSubmissionModal({ assignment, onClose, onUploaded }) {
  const addToast = useUiStore((s) => s.addToast)
  const [students, setStudents] = useState(null)
  const [submittedIds, setSubmittedIds] = useState(new Set())
  const [studentId, setStudentId] = useState('')
  const [search, setSearch] = useState('')
  const [pptFile, setPptFile] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    // Scoped to the assignment's own batch via the path param (GET
    // /batches/:id/students) — NOT the generic /students list, which honours a
    // global "current batch" header from the top course switcher and would
    // silently show the wrong batch's roster if that selection differs from
    // this assignment's batch. Filtered to active enrollments client-side
    // since this endpoint returns every enrollment status.
    Promise.all([
      getBatchStudents(assignment.batch_id, { limit: 500 }),
      getAssignmentSubmissions(assignment.id),
    ]).then(([studentsRes, subsRes]) => {
      if (!alive) return
      setStudents((studentsRes.data || []).filter((s) => s.status === 'active'))
      setSubmittedIds(new Set((subsRes.data || []).map((s) => s.student_user_id)))
    }).catch(() => { if (alive) setStudents([]) })
    return () => { alive = false }
  }, [assignment.batch_id, assignment.id])

  const eligible = (students || []).filter((s) => !submittedIds.has(s.user_id))
  const selectedStudent = eligible.find((s) => s.user_id === studentId) || null
  const q = search.trim().toLowerCase()
  const filtered = q
    ? eligible.filter((s) => `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q))
    : eligible
  const canSubmit = studentId && (pptFile || pdfFile) && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      // 1. Create the draft, owned by the scholar — batch/title/semester are
      //    resolved server-side from the assignment.
      const created = await createSubmissionOnBehalf({
        student_user_id: studentId,
        assignment_id: assignment.id,
      })
      const submissionId = created.data?.id
      if (!submissionId) throw new Error('Could not create the submission')

      // 2. Upload whichever file(s) were provided (each call appends to the
      //    submission's file list — both can be attached to the same draft).
      if (pptFile) await uploadSubmissionAttachment(submissionId, pptFile)
      if (pdfFile) await uploadSubmissionAttachment(submissionId, pdfFile)

      // 3. Save the feedback/recommendation note, if any, as the submission's
      //    own content — independent of the approval chain's decision.
      const trimmedNote = note.trim()
      if (trimmedNote) await updateSubmission(submissionId, { content: trimmedNote })

      // 4. Submit for review on behalf of the scholar — same approval chain a
      //    self-submit would trigger.
      await submitForReviewOnBehalf(submissionId)

      const name = selectedStudent ? (scholarName(selectedStudent) || `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim()) : 'the scholar'
      addToast({ type: 'success', title: `Submission uploaded and sent for review for ${name}.` })
      onUploaded?.()
      onClose()
    } catch (err) {
      addToast({ type: 'error', title: 'Upload failed', message: err.response?.data?.message || err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="drawer-panel lg:!w-[min(560px,calc(100vw-32px))] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Upload for Student</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-[color:var(--text)]">{assignment.title}</h2>
            <p className="mt-0.5 text-sm text-[color:var(--secondary)]">On behalf of a scholar — owned by them and routed through the batch's approval workflow.</p>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)] text-[color:var(--secondary)] hover:bg-[color:var(--border)]"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
          <div>
            <span className="text-sm font-semibold text-[color:var(--text)]">Student<span className="ml-1 text-red-500">*</span></span>
            {students === null ? (
              <p className="mt-2 text-sm text-[color:var(--secondary)]">Loading students…</p>
            ) : eligible.length === 0 ? (
              <p className="mt-2 text-sm text-[color:var(--secondary)]">Every actively-enrolled student in this batch has already submitted.</p>
            ) : selectedStudent ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[color:var(--text)]">{scholarName(selectedStudent) || `${selectedStudent.first_name} ${selectedStudent.last_name}`}</p>
                  <p className="truncate text-xs text-[color:var(--secondary)]">{selectedStudent.email}</p>
                </div>
                <button type="button" className="shrink-0 rounded-full bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)]" onClick={() => setStudentId('')}>
                  Change
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <label className="admin-search soft-panel flex h-11 items-center gap-2 rounded-full px-4">
                  <Search size={15} className="text-[color:var(--muted)]" />
                  <input
                    autoFocus
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[color:var(--border)]">
                  {filtered.length === 0 ? (
                    <p className="p-4 text-center text-sm text-[color:var(--secondary)]">No students match "{search}"</p>
                  ) : (
                    filtered.map((s) => (
                      <button
                        key={s.user_id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-2.5 text-left text-sm last:border-0 hover:bg-[color:var(--surface)]"
                        onClick={() => { setStudentId(s.user_id); setSearch('') }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-[color:var(--text)]">{scholarName(s) || `${s.first_name} ${s.last_name}`}</span>
                          <span className="block truncate text-xs text-[color:var(--secondary)]">{s.email}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">Presentation <span className="font-normal text-[color:var(--muted)]">(PPT or PPTX, max 25MB)</span></span>
            <div className="mt-2 flex items-center gap-2">
              <Presentation size={16} className="shrink-0 text-[color:var(--accent)]" />
              <input
                className="block w-full text-sm text-[color:var(--secondary)] file:mr-3 file:rounded-xl file:border-0 file:bg-[color:var(--accent-tint)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--accent)]"
                type="file"
                accept=".ppt,.pptx"
                onChange={(e) => setPptFile(e.target.files?.[0] || null)}
              />
            </div>
            {pptFile && <p className="mt-1 text-xs text-[color:var(--secondary)]">{pptFile.name} · {(pptFile.size / 1024 / 1024).toFixed(2)} MB</p>}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">Report <span className="font-normal text-[color:var(--muted)]">(PDF, max 25MB)</span></span>
            <div className="mt-2 flex items-center gap-2">
              <FileText size={16} className="shrink-0 text-[color:var(--accent)]" />
              <input
                className="block w-full text-sm text-[color:var(--secondary)] file:mr-3 file:rounded-xl file:border-0 file:bg-[color:var(--accent-tint)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--accent)]"
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
            </div>
            {pdfFile && <p className="mt-1 text-xs text-[color:var(--secondary)]">{pdfFile.name} · {(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>}
          </label>

          {!pptFile && !pdfFile && (
            <p className="text-xs text-[color:var(--muted)]">Attach at least one file — the presentation, the report, or both.</p>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">Feedback / recommendation <span className="font-normal text-[color:var(--muted)]">(optional)</span></span>
            <textarea
              className="textarea mt-2 h-24 w-full"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note or recommendation for reviewers — stored with the submission, separate from the approval decision."
            />
          </label>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
          <button type="button" className="h-11 flex-1 rounded-md bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={submit} disabled={!canSubmit}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={15} />}
            {busy ? 'Uploading…' : 'Upload & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
