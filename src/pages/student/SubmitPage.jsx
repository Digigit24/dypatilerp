import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ArrowRight, CheckCircle2, Clock3, FileText, Info, Paperclip, RotateCcw, UploadCloud, X } from 'lucide-react'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { createSubmission } from '../../api/services/submissionService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

const history = [
  { version: 2, title: 'Machine Learning Applications in Early Cancer Detection', date: '20 Sep 2024', status: 'approved' },
  { version: 1, title: 'AI in Cancer Detection', date: '15 Sep 2024', status: 'needs_revision' },
]

export default function SubmitPage() {
  const [file, setFile] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const addToast = useUiStore((s) => s.addToast)
  const currentUser = useAuthStore((s) => s.currentUser)
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>CRISPR Screening for Biomarker Discovery</p>',
    editorProps: {
      attributes: {
        class: 'min-h-[150px] rounded-[24px] bg-transparent text-2xl font-semibold leading-snug outline-none md:text-[32px]',
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
      'video/mp4': ['.mp4'],
    },
  })

  const title = editor?.getText().trim() || ''
  const validTitle = title.length >= 20 && title.length <= 200
  const canSubmit = validTitle && file && !submitting

  const submit = async () => {
    setSubmitting(true)
    await createSubmission({
      student_id: currentUser?.id,
      batch_id: currentUser?.batch_id,
      report_period: 2,
      title,
      presentation_filename: file?.name,
      presentation_type: file?.name?.split('.').pop() || 'pdf',
    })
    addToast({ type: 'success', title: 'Submission sent for approval' })
    setSubmitting(false)
    setConfirm(false)
  }

  return (
    <div className="fade-page">
      <PageHeader
        title="Submit Title & Presentation"
        subtitle="Prepare a clean research title and upload your presentation for the approval chain."
        action={<button className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--secondary)]">Save Draft</button>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <div className="card overflow-hidden">
            <div className="border-b border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5">
              <div className="safe-row">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted)]">Research Title</p>
                  <p className="mt-1 text-sm text-[color:var(--secondary)]">Use a specific, measurable title. Keep it between 20 and 200 characters.</p>
                </div>
                <StatusBadge status={validTitle ? 'approved' : 'draft'} />
              </div>
            </div>
            <div className="p-5 md:p-7">
              <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-soft">
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
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted)]">Presentation Upload</p>
                <h2 className="mt-2 text-xl font-semibold text-[color:var(--text)]">Attach your presentation file</h2>
              </div>
              <Paperclip className="text-[color:var(--accent)]" size={22} />
            </div>

            <div
              {...getRootProps()}
              className={`mt-5 grid min-h-[220px] cursor-pointer place-items-center rounded-[28px] border border-dashed p-6 text-center transition ${isDragActive ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]' : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]'}`}
            >
              <input {...getInputProps()} />
              <div className="max-w-md">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                  <UploadCloud size={28} />
                </div>
                <p className="mt-4 text-lg font-semibold text-[color:var(--text)]">{isDragActive ? 'Drop it here' : 'Drop your file here or click to upload'}</p>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">Supported: PDF, PPT, PPTX, MP4. Max 100MB.</p>
              </div>
            </div>

            {file && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><FileText size={19} /></div>
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
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Approval Chain</h2>
            <div className="mt-5 space-y-4">
              <Step icon={Clock3} title="Coordinator Review" subtitle="Initial scope and title check" />
              <Step icon={CheckCircle2} title="Academic Guide" subtitle="Academic rigor review" />
              <Step icon={CheckCircle2} title="Industry Mentor" subtitle="Practice relevance review" />
            </div>
            <div className="mt-5 rounded-3xl bg-[color:var(--accent-tint)] p-4 text-sm leading-6 text-[color:var(--secondary)]">
              <Info size={16} className="mb-2 text-[color:var(--accent)]" />
              You can save a draft anytime. Submit only when your title and file are ready for review.
            </div>
          </div>

          <div className="card p-6">
            <div className="safe-row">
              <h2 className="text-lg font-semibold text-[color:var(--text)]">Submission History</h2>
              <RotateCcw size={17} className="text-[color:var(--muted)]" />
            </div>
            <div className="mt-4 space-y-3">
              {history.map((item) => (
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4" key={item.version}>
                  <div className="safe-row items-start">
                    <p className="text-sm font-semibold text-[color:var(--text)]">Version {item.version}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[color:var(--secondary)]">{item.title}</p>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">{item.date}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-4 z-20 mt-6 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-hover md:pr-72">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="px-2">
            <p className="text-sm font-semibold text-[color:var(--text)]">Ready to submit?</p>
            <p className="text-xs text-[color:var(--secondary)]">{validTitle ? 'Title looks good' : 'Title must be 20-200 characters'} · {file ? 'File attached' : 'Attach a presentation file'}</p>
          </div>
          <div className="safe-actions">
            <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]">Save Draft</button>
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
            <p className="mt-3 text-sm leading-6 text-[color:var(--secondary)]">Your submission will go through Coordinator Review, Academic Guide, and Industry Mentor approval.</p>
            <div className="safe-actions mt-6 justify-end">
              <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting...' : 'Confirm Submission'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Step({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[color:var(--text)]">{title}</p>
        <p className="text-sm text-[color:var(--secondary)]">{subtitle}</p>
      </div>
    </div>
  )
}
