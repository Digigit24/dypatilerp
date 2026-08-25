import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ArrowRight, Check, FileText, Info, Paperclip, UploadCloud, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useSearchParams } from 'react-router-dom'
import { createSubmission, submitForReview, uploadSubmissionAttachment } from '../../api/services/submissionService.js'
import { getMyAssignments } from '../../api/services/assignmentService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { useUiStore } from '../../store/uiStore.js'

export default function SubmitPage() {
  const [searchParams] = useSearchParams()
  const assignmentId = searchParams.get('assignment')
  const [assignment, setAssignment] = useState(null)
  const [file, setFile] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const addToast = useUiStore((s) => s.addToast)

  // When arriving from the Assignments page, load the linked assignment
  useEffect(() => {
    if (!assignmentId) return
    getMyAssignments().then((r) => {
      const found = (r.data || []).find((a) => a.id === assignmentId)
      if (found) setAssignment(found)
    }).catch(() => {})
  }, [assignmentId])

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'min-h-[150px] rounded-xl bg-transparent text-2xl font-semibold leading-snug outline-none md:text-[32px]',
      },
    },
  })
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    onDrop: (files) => setFile(files[0]),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
  })

  const title = editor?.getText().trim() || ''
  const validTitle = title.length >= 3 && title.length <= 200
  const canSubmit = validTitle && file && !submitting && !(assignment && assignment.my_submission_id)

  const submit = async () => {
    setSubmitting(true)
    try {
      // 1. Create the draft (batch resolved server-side for a standalone report).
      const created = await createSubmission({
        batch_id: assignment?.batch_id,
        assignment_id: assignment?.id || null,
        title,
        submission_type: assignment ? 'assignment' : 'progress_report',
        semester: assignment?.semester || 1,
        content: title,
      })
      const submissionId = created.data?.id
      if (!submissionId) throw new Error('Could not create the submission')

      // 2. Upload the file THROUGH our own API — the backend streams it to storage
      //    (no browser→storage hop, so no extra CORS) and verifies + attaches it.
      await uploadSubmissionAttachment(submissionId, file)

      // 3. Only now send for review — never submit without a verified file.
      await submitForReview(submissionId)
      addToast({
        type: 'success',
        title: assignment
          ? `Submission for "${assignment.title}" sent for approval`
          : 'Submission sent for approval',
      })
      if (assignment) setAssignment((a) => ({ ...a, my_submission_id: created.data?.id, my_submission_status: 'submitted' }))
    } catch (err) {
      addToast({ type: 'error', title: 'Submission failed', message: err.response?.data?.message || err.message })
    } finally {
      setSubmitting(false)
      setConfirm(false)
    }
  }

  const alreadySubmitted = !!assignment?.my_submission_id

  return (
    <div className="fade-page">
      <PageHeader
        title="Submit Progress Report"
        subtitle="Give your report a clear title and upload the file for institute review."
        action={<button className="rounded-lg bg-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--secondary)]">Save Draft</button>}
      />

      {assignment && (
        <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border p-4 ${alreadySubmitted ? 'border-emerald-200 bg-emerald-50/50' : 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]'}`}>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Submitting for assignment</p>
            <p className="mt-0.5 truncate text-base font-semibold text-[color:var(--text)]">{assignment.title}</p>
            {assignment.description && <p className="mt-0.5 line-clamp-2 text-xs text-[color:var(--secondary)]">{assignment.description}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${assignment.is_mandatory ? 'bg-red-100 text-red-700' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
            {assignment.is_mandatory ? 'Mandatory' : 'Optional'}
          </span>
          {assignment.due_date && (
            <span className="shrink-0 text-xs font-semibold text-[color:var(--secondary)]">Due {new Date(assignment.due_date).toLocaleDateString('en-IN')}</span>
          )}
          {alreadySubmitted && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Already submitted — one submission per assignment</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <div className="card overflow-hidden">
            <div className="border-b border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5">
              <div className="safe-row">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted)]">Report Title</p>
                  <p className="mt-1 text-sm text-[color:var(--secondary)]">Use a clear title, e.g. "Progress Report 1". Keep it between 3 and 200 characters.</p>
                </div>
                {/* Title-length validity, not a submission status — this page hasn't
                    created a submission yet, so it must never borrow the real
                    draft/approved vocabulary (that badge previously showed a
                    misleading "Approved" pill for a merely well-formed title). */}
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${validTitle ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-stone-100 text-stone-600'}`}>
                  {validTitle && <Check size={11} />} {validTitle ? 'Looks good' : 'Needs a title'}
                </span>
              </div>
            </div>
            <div className="p-5 md:p-7">
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-soft">
                <EditorContent editor={editor} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className={`text-sm font-medium ${validTitle ? 'text-emerald-600' : 'text-[color:var(--secondary)]'}`}>
                  {title.length}/200 characters
                </p>
                <div className="flex gap-2">
                  <button className="rounded-full bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--secondary)]" onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
                  <button className="rounded-full bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--secondary)]" onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5 md:p-7">
            <div className="safe-row items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted)]">Report Upload</p>
                <h2 className="mt-2 text-xl font-semibold text-[color:var(--text)]">Attach your report file</h2>
              </div>
              <Paperclip className="text-[color:var(--accent)]" size={22} />
            </div>

            <div
              {...getRootProps()}
              className={`mt-5 grid min-h-[220px] cursor-pointer place-items-center rounded-xl border border-dashed p-6 text-center transition ${isDragActive ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]' : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]'}`}
            >
              <input {...getInputProps()} />
              <div className="max-w-md">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                  <UploadCloud size={28} />
                </div>
                <p className="mt-4 text-lg font-semibold text-[color:var(--text)]">{isDragActive ? 'Drop it here' : 'Drop your file here or click to upload'}</p>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">Supported: PDF, PPT, PPTX. Max 25MB.</p>
              </div>
            </div>

            {file && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><FileText size={19} /></div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[color:var(--text)]">{file.name}</p>
                    <p className="text-xs text-[color:var(--secondary)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={(e) => { e.stopPropagation(); setFile(null) }}><X size={17} /></button>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Review</h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--secondary)]">
              Your report will be reviewed per your batch's approval workflow.
            </p>
            <div className="mt-5 rounded-xl bg-[color:var(--accent-tint)] p-4 text-sm leading-6 text-[color:var(--secondary)]">
              <Info size={16} className="mb-2 text-[color:var(--accent)]" />
              Submit only when your title and file are ready for review.
            </div>
          </div>

        </aside>
      </div>

      <div className="sticky bottom-4 z-20 mt-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-hover md:pr-72">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="px-2">
            <p className="text-sm font-semibold text-[color:var(--text)]">Ready to submit?</p>
            <p className="text-xs text-[color:var(--secondary)]">{validTitle ? 'Title looks good' : 'Title must be 3-200 characters'} · {file ? 'File attached' : 'Attach a report file'}</p>
          </div>
          <div className="safe-actions">
            <button className="h-11 rounded-md bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]">Save Draft</button>
            <button className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" disabled={!canSubmit} onClick={() => setConfirm(true)}>
              Submit for Approval <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-7">
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">Confirm submission</h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--secondary)]">Your report will be sent for review per your batch's approval workflow.</p>
            <div className="safe-actions mt-6 justify-end">
              <button className="h-11 rounded-md bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting...' : 'Confirm Submission'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
