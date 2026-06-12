/**
 * Formats — downloadable template files (assignment formats, submission
 * templates, etc.) uploaded by admins/coordinators for students.
 */
import { Download, FileText, Loader2, PenLine, Plus, Trash2, Upload, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createFormat, deleteFormat, getFormats, updateFormat } from '../../api/services/formatService.js'
import { createVideo, createSession, buildDownloadUrl } from '../../api/services/videoService.js'
import { getBatches } from '../../api/services/batchService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'

const fmtBytes = (b) => !b ? '—' : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`
const API_BASE = import.meta.env.VITE_API_URL || 'https://app.dyperf.com/api'

export default function FormatsPage() {
  const { currentCourse } = useCourseStore()
  const addToast = useUiStore((s) => s.addToast)
  const [items, setItems] = useState(null)
  const [batches, setBatches] = useState([])
  const [drawer, setDrawer] = useState(null)   // null | {mode:'create'} | {mode:'edit', item}
  const [downloading, setDownloading] = useState(null)
  useScrollLock(!!drawer)

  const load = () => {
    if (!currentCourse?.id) { setItems([]); return }
    getFormats({ course_id: currentCourse.id }).then((r) => setItems(r.data || []))
    getBatches({ course_id: currentCourse.id }).then((r) => setBatches(r.data || [])).catch(() => {})
  }
  useEffect(() => { setItems(null); load() }, [currentCourse?.id])

  const handleDelete = async (f) => {
    if (!confirm(`Delete format "${f.title}"? The file will also be removed.`)) return
    try {
      await deleteFormat(f.id)
      addToast({ type: 'success', title: 'Format deleted.' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message })
    }
  }

  const handleDownload = async (f) => {
    if (!f.media_id) { addToast({ type: 'error', title: 'No file attached to this format.' }); return }
    setDownloading(f.id)
    try {
      const r = await createSession(f.media_id)
      window.open(buildDownloadUrl(f.media_id, r.data.token), '_blank')
    } catch (err) {
      addToast({ type: 'error', title: 'Download failed', message: err.response?.data?.message })
    } finally { setDownloading(null) }
  }

  if (!currentCourse?.id) {
    return (
      <div className="fade-page">
        <PageHeader title="Formats" subtitle="Downloadable templates for assignments, submissions and reports." />
        <div className="card p-14 text-center text-sm text-[color:var(--secondary)]">Select a course from the header first.</div>
      </div>
    )
  }
  if (!items) return <SkeletonCard rows={5} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Formats"
        subtitle="Upload PDF/DOCX templates that students can download — assignment formats, submission templates, report structures."
        action={
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => setDrawer({ mode: 'create' })}>
            <Plus size={16} /> Add Format
          </button>
        }
      />

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <FileText size={30} className="text-[color:var(--muted)]" />
          <p className="text-sm font-semibold text-[color:var(--text)]">No formats yet</p>
          <p className="text-xs text-[color:var(--secondary)]">Upload the first template so students can download it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((f) => (
            <div key={f.id} className="card group p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
                  <FileText size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[color:var(--text)]" title={f.title}>{f.title}</p>
                  <p className="text-[11px] text-[color:var(--secondary)]">
                    {fmtBytes(f.file_size)} · {f.batch_name || 'All batches'} · {formatDate(f.created_at)}
                  </p>
                </div>
              </div>
              {f.description && (
                <p className="mt-2 line-clamp-2 text-xs text-[color:var(--secondary)]">{f.description}</p>
              )}
              <div className="mt-3 flex items-center gap-1.5">
                <button
                  onClick={() => handleDownload(f)}
                  disabled={downloading === f.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:opacity-80 disabled:opacity-50"
                >
                  {downloading === f.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Download
                </button>
                <div className="ml-auto flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => setDrawer({ mode: 'edit', item: f })} title="Edit"><PenLine size={13} /></button>
                  <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--muted)] hover:bg-red-50 hover:text-red-500" onClick={() => handleDelete(f)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {drawer && (
        <FormatDrawer
          mode={drawer.mode}
          item={drawer.item}
          course={currentCourse}
          batches={batches}
          onClose={(changed) => { setDrawer(null); if (changed) load() }}
          addToast={addToast}
        />
      )}
    </div>
  )
}

// ─── Add / Edit drawer ───────────────────────────────────────────────────────────
function FormatDrawer({ mode, item, course, batches, onClose, addToast }) {
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    batch_id: item?.batch_id || '',
  })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const fileRef = useRef(null)

  const uploadFile = (f, mediaId) => new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', f)
    formData.append('filename', f.name)
    formData.append('course_code', course.code)
    formData.append('video_id', mediaId)
    formData.append('content_type', f.type || 'application/octet-stream')
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round(e.loaded / e.total * 100)) }
    xhr.onload = () => {
      if (xhr.status < 300) {
        let body = {}
        try { body = JSON.parse(xhr.responseText) } catch { /* noop */ }
        resolve({ objectKey: body?.data?.object_key || '', fileSize: body?.data?.file_size || f.size })
      } else reject(new Error(`Upload failed: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.open('POST', `${API_BASE}/videos/upload`)
    const token = localStorage.getItem('access_token')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (mode === 'create' && !file) { addToast({ type: 'error', title: 'Please choose a file.' }); return }
    setBusy(true)
    try {
      if (mode === 'create') {
        const mediaId = crypto.randomUUID()
        const mime = file.type || 'application/octet-stream'
        const { objectKey, fileSize } = await uploadFile(file, mediaId)
        const media = await createVideo({
          course_id: course.id,
          title: form.title.trim(),
          description: form.description.trim(),
          media_type: 'document',
          mime_type: mime,
          object_key: objectKey,
          file_size: fileSize,
          duration_sec: 0,
          is_published: true,
        })
        await createFormat({
          course_id: course.id,
          batch_id: form.batch_id || null,
          title: form.title.trim(),
          description: form.description.trim(),
          media_id: media.data.id,
        })
        addToast({ type: 'success', title: 'Format uploaded.' })
      } else {
        await updateFormat(item.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          batch_id: form.batch_id || null,
        })
        addToast({ type: 'success', title: 'Format updated.' })
      }
      onClose(true)
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message || err.message })
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => !busy && onClose(false)}>
      <div className="drawer-panel lg:!w-[min(520px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{mode === 'create' ? 'Add Format' : 'Edit Format'}</p>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{mode === 'create' ? 'Upload a template' : item.title}</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => onClose(false)}><XCircle size={18} /></button>
        </div>
        <form onSubmit={save} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
            {mode === 'create' && (
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-3xl border-2 border-dashed border-[color:var(--border)] p-7 transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)]"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={24} className={file ? 'text-emerald-600' : 'text-[color:var(--muted)]'} />
                <p className="text-sm font-semibold text-[color:var(--text)]">{file ? file.name : 'Click to choose a file'}</p>
                <p className="text-xs text-[color:var(--muted)]">PDF, DOCX, XLSX — any template file</p>
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
              </div>
            )}
            {busy && pct > 0 && pct < 100 && (
              <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                <div className="h-full rounded-full bg-[color:var(--accent)] transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Title<span className="ml-1 text-red-500">*</span></span>
              <input className="input mt-1.5 w-full" required placeholder="Assignment Submission Format" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Description</span>
              <textarea className="input mt-1.5 w-full resize-none" rows={3} placeholder="When and how to use this template…" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Batch</span>
              <select className="input mt-1.5 w-full" value={form.batch_id} onChange={(e) => setForm((p) => ({ ...p, batch_id: e.target.value }))}>
                <option value="">All batches in {course.code}</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </div>
          <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
            <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" disabled={busy} onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={busy}>
              {busy && <Loader2 size={14} className="animate-spin" />}
              {busy ? (pct > 0 && pct < 100 ? `Uploading ${pct}%` : 'Saving…') : mode === 'create' ? 'Upload Format' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
