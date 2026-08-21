import { CheckCircle2, Download, Eye, FileText, Loader2, RefreshCw, UploadCloud, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  downloadOfficialLetter, getOfficialLetters, previewOfficialLetter, uploadOfficialLetter,
} from '../../api/services/studentService.js'
import { formatDate } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'
import { usePermStore } from '../../store/permStore.js'

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp'
const MAX_BYTES = 15 * 1024 * 1024

const fullName = (s) => `${s?.first_name || ''} ${s?.last_name || ''}`.trim()
const fmtBytes = (b) => !b ? '—' : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(Math.round(b / 1e3))} KB`

export default function OfficialLettersDrawer({ student, onClose }) {
  const addToast = useUiStore((s) => s.addToast)
  // Upload is staff-only server-side (requireRole admin/coordinator) — hide the
  // control for anyone else so a guide/mentor sees a clean read-only view.
  const canUpload = usePermStore((s) => s.hasRole('admin') || s.hasRole('coordinator'))

  const [letters, setLetters] = useState(null)   // null = loading
  const [busySlot, setBusySlot] = useState(null) // slot currently uploading
  const [actionSlot, setActionSlot] = useState(null) // slot currently preview/download-ing

  const userId = student?.user_id

  const load = () => {
    if (!userId) return
    getOfficialLetters(userId)
      .then((r) => setLetters(r.data || []))
      .catch(() => setLetters([]))
  }
  useEffect(() => { load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (slot, file) => {
    if (!file) return
    if (file.size > MAX_BYTES) {
      addToast({ type: 'error', title: 'File too large', message: `"${file.name}" is larger than the 15MB limit.` })
      return
    }
    setBusySlot(slot)
    try {
      await uploadOfficialLetter(userId, slot, file)
      addToast({ type: 'success', title: 'Letter uploaded', message: `${fullName(student)}'s letter was saved.` })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Upload failed', message: err.response?.data?.message || err.message })
    } finally {
      setBusySlot(null)
    }
  }

  const handlePreview = async (slot) => {
    setActionSlot(`preview:${slot}`)
    try { await previewOfficialLetter(userId, slot) }
    catch (err) { addToast({ type: 'error', title: 'Preview failed', message: err.response?.data?.message || err.message }) }
    finally { setActionSlot(null) }
  }

  const handleDownload = async (slot, filename) => {
    setActionSlot(`download:${slot}`)
    try { await downloadOfficialLetter(userId, slot, filename) }
    catch (err) { addToast({ type: 'error', title: 'Download failed', message: err.response?.data?.message || err.message }) }
    finally { setActionSlot(null) }
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Official Letters</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-[color:var(--text)]">{fullName(student) || 'Scholar'}</h2>
            <p className="mt-0.5 text-sm text-[color:var(--secondary)]">
              {student?.email}{student?.batch_name ? ` · ${student.batch_name}` : ''}
            </p>
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
          {!canUpload && (
            <p className="rounded-lg bg-[color:var(--surface)] px-4 py-3 text-xs text-[color:var(--secondary)]">
              Read-only — only Admin and Coordinator can upload or replace official letters.
            </p>
          )}

          {letters === null ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-[color:var(--accent)]" />
            </div>
          ) : (
            letters.map((l) => {
              const uploading = busySlot === l.slot
              return (
                <div key={l.slot} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[color:var(--text)]">{l.label}</p>
                      {l.present ? (
                        <p className="mt-0.5 truncate text-xs text-[color:var(--secondary)]">
                          {l.filename} · {fmtBytes(l.file_size)} · Uploaded {formatDate(l.uploaded_at)}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-[color:var(--muted)]">Not yet issued.</p>
                      )}
                    </div>
                    {l.present && (
                      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 size={12} /> Issued
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {l.present && (
                      <>
                        <button
                          type="button"
                          disabled={actionSlot === `preview:${l.slot}`}
                          onClick={() => handlePreview(l.slot)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white disabled:opacity-60"
                        >
                          {actionSlot === `preview:${l.slot}` ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Preview
                        </button>
                        <button
                          type="button"
                          disabled={actionSlot === `download:${l.slot}`}
                          onClick={() => handleDownload(l.slot, l.filename)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                        >
                          {actionSlot === `download:${l.slot}` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
                        </button>
                      </>
                    )}
                    {canUpload && (
                      <label className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${l.present ? 'border border-[color:var(--border)] text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]' : 'bg-[color:var(--accent)] text-white hover:opacity-90'}`}>
                        {uploading ? <Loader2 size={12} className="animate-spin" /> : l.present ? <RefreshCw size={12} /> : <UploadCloud size={12} />}
                        {uploading ? 'Uploading…' : l.present ? 'Replace' : 'Upload'}
                        <input
                          type="file"
                          className="hidden"
                          accept={ACCEPT}
                          disabled={uploading}
                          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleUpload(l.slot, f) }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {letters && letters.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-[color:var(--surface)] px-4 py-3 text-xs text-[color:var(--secondary)]">
              <FileText size={14} className="mt-0.5 shrink-0" />
              PDF, DOC, DOCX or an image scan — max 15MB each. Stored under this scholar's folder in Media Manager
              (Course → Batch → Students → {fullName(student)}).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
