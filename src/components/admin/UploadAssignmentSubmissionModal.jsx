/**
 * Admin "Upload for Student" modal — attached to a single assignment.
 * Lets an admin pick one actively-enrolled student from the assignment's
 * batch, attach a presentation (PPT/PPTX) and/or a report (PDF), write an
 * optional feedback/recommendation note, and submit on the scholar's behalf.
 * Mirrors the existing on-behalf progress-report flow (create draft → upload
 * attachment(s) → save note → submit for review) but targets an assignment,
 * and supports two files in one go instead of one.
 */
import { FileText, Loader2, Presentation, UploadCloud, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getStudents } from '../../api/services/studentService.js'
import { getAssignmentSubmissions } from '../../api/services/assignmentService.js'
import {
  createSubmissionOnBehalf, submitForReviewOnBehalf, updateSubmission, uploadSubmissionAttachment,
} from '../../api/services/submissionService.js'
import { useUiStore } from '../../store/uiStore.js'

export default function UploadAssignmentSubmissionModal({ assignment, onClose, onUploaded }) {
  const addToast = useUiStore((s) => s.addToast)
  const [students, setStudents] = useState(null)
  const [submittedIds, setSubmittedIds] = useState(new Set())
  const [studentId, setStudentId] = useState('')
  const [pptFile, setPptFile] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([
      getStudents({ batch_id: assignment.batch_id, status: 'active', limit: 500 }),
      getAssignmentSubmissions(assignment.id),
    ]).then(([studentsRes, subsRes]) => {
      if (!alive) return
      setStudents(studentsRes.data || [])
      setSubmittedIds(new Set((subsRes.data || []).map((s) => s.student_user_id)))
    }).catch(() => { if (alive) setStudents([]) })
    return () => { alive = false }
  }, [assignment.batch_id, assignment.id])

  const eligible = (students || []).filter((s) => !submittedIds.has(s.user_id))
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

      const student = eligible.find((s) => s.user_id === studentId)
      const name = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : 'the scholar'
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="safe-row">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">Upload for Student</h2>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--surface)]" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="mt-1 text-sm text-[color:var(--secondary)]">
          On behalf of a scholar, for <span className="font-semibold text-[color:var(--text)]">"{assignment.title}"</span>. The submission is owned by the scholar and follows the batch's approval workflow.
        </p>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-[color:var(--text)]">Student<span className="ml-1 text-red-500">*</span></span>
          {students === null ? (
            <p className="mt-2 text-sm text-[color:var(--secondary)]">Loading students…</p>
          ) : eligible.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--secondary)]">Every actively-enrolled student in this batch has already submitted.</p>
          ) : (
            <select className="input mt-2 w-full" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select a student…</option>
              {eligible.map((s) => (
                <option key={s.user_id} value={s.user_id}>{s.first_name} {s.last_name} — {s.email}</option>
              ))}
            </select>
          )}
        </label>

        <label className="mt-4 block">
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

        <label className="mt-4 block">
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
          <p className="mt-2 text-xs text-[color:var(--muted)]">Attach at least one file — the presentation, the report, or both.</p>
        )}

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-[color:var(--text)]">Feedback / recommendation <span className="font-normal text-[color:var(--muted)]">(optional)</span></span>
          <textarea
            className="textarea mt-2 h-24 w-full"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note or recommendation for reviewers — stored with the submission, separate from the approval decision."
          />
        </label>

        <div className="safe-actions mt-6 justify-end">
          <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-primary inline-flex items-center gap-2" onClick={submit} disabled={!canSubmit}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            {busy ? 'Uploading…' : 'Upload & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
