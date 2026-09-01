import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, Download, Eye, FileText,
  Loader2, Mail, RefreshCw, Trash2, UploadCloud, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  deleteAdmissionLetterVersion, downloadOfficialLetter, getAdmissionLetterHistory, getOfficialLetters,
  previewAdmissionLetterVersion, previewOfficialLetter, uploadOfficialLetter,
} from '../../api/services/studentService.js'
import { emailOneAdmissionLetter, generateOneAdmissionLetter, publishSelectedAdmissionLetters } from '../../api/services/batchService.js'
import { getProfileDetails } from '../../api/services/studentProfileService.js'
import { formatDate, scholarName } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'
import { usePermStore } from '../../store/permStore.js'

// Mirrors the backend's missingFields() check in admission-letter.service.js
// — fetched independently here so the warning/disabled-state works no matter
// which page opened this drawer, not just the ones that already have a
// batch roster loaded.
const missingLetterFields = (profile) => {
  const missing = []
  if (!profile?.current_designation?.trim()) missing.push('designation')
  if (!profile?.current_organisation?.trim()) missing.push('organisation')
  if (!profile?.current_organisation_address?.trim()) missing.push('organisation address')
  return missing
}

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp'
const MAX_BYTES = 15 * 1024 * 1024
// The one slot with a template generator (see admission-letter.service.js) —
// every other slot stays exactly as it was: manual upload only.
const GENERATED_SLOT = 'admission_confirmation'

const fullName = (s) => scholarName(s) || `${s?.first_name || ''} ${s?.last_name || ''}`.trim()
const fmtBytes = (b) => !b ? '—' : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(Math.round(b / 1e3))} KB`

export default function OfficialLettersDrawer({ student, onClose }) {
  const addToast = useUiStore((s) => s.addToast)
  // Upload is staff-only server-side (requireRole admin/coordinator) — hide the
  // control for anyone else so a guide/mentor sees a clean read-only view.
  const canUpload = usePermStore((s) => s.hasRole('admin') || s.hasRole('coordinator'))

  const [letters, setLetters] = useState(null)   // null = loading
  const [busySlot, setBusySlot] = useState(null) // slot currently uploading
  const [actionSlot, setActionSlot] = useState(null) // slot currently preview/download-ing
  const [missingFields, setMissingFields] = useState(null) // null = loading, [] = complete
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState(null) // null = not loaded yet
  const [historyBusy, setHistoryBusy] = useState(null) // `${action}:${mediaId}`

  const userId = student?.user_id

  const load = () => {
    if (!userId) return
    getOfficialLetters(userId)
      .then((r) => setLetters(r.data || []))
      .catch(() => setLetters([]))
  }
  useEffect(() => { load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setShowHistory(false)
    setHistory(null)
  }, [userId])

  const loadHistory = () => {
    setHistory(null)
    getAdmissionLetterHistory(userId)
      .then((r) => setHistory(r.data || []))
      .catch(() => setHistory([]))
  }

  useEffect(() => {
    if (!userId) return
    setMissingFields(null)
    getProfileDetails(userId)
      .then((r) => setMissingFields(missingLetterFields(r.data)))
      .catch(() => setMissingFields([]))
  }, [userId])

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

  const handleGenerate = async () => {
    if (!student?.batch_id) {
      addToast({ type: 'error', title: 'This scholar has no active batch enrollment to generate a letter for.' })
      return
    }
    setBusySlot(GENERATED_SLOT)
    try {
      await generateOneAdmissionLetter(student.batch_id, userId)
      addToast({ type: 'success', title: 'Letter generated' })
      load()
      if (showHistory) loadHistory()
    } catch (err) {
      addToast({ type: 'error', title: 'Generate failed', message: err.response?.data?.message || err.message })
    } finally {
      setBusySlot(null)
    }
  }

  const handlePublish = async () => {
    if (!student?.batch_id) return
    setActionSlot(`publish:${GENERATED_SLOT}`)
    try {
      await publishSelectedAdmissionLetters(student.batch_id, [userId])
      addToast({ type: 'success', title: 'Letter published — the scholar can now see it on their own login.' })
      load()
      if (showHistory) loadHistory()
    } catch (err) {
      addToast({ type: 'error', title: 'Publish failed', message: err.response?.data?.message || err.message })
    } finally {
      setActionSlot(null)
    }
  }

  const handleToggleHistory = () => {
    const next = !showHistory
    setShowHistory(next)
    if (next && history === null) loadHistory()
  }

  const handlePreviewVersion = async (mediaId) => {
    setHistoryBusy(`preview:${mediaId}`)
    try { await previewAdmissionLetterVersion(userId, mediaId) }
    catch (err) { addToast({ type: 'error', title: 'Preview failed', message: err.response?.data?.message || err.message }) }
    finally { setHistoryBusy(null) }
  }

  const handleDeleteVersion = async (mediaId) => {
    if (!confirm('Permanently delete this draft version? This cannot be undone.')) return
    setHistoryBusy(`delete:${mediaId}`)
    try {
      await deleteAdmissionLetterVersion(userId, mediaId)
      addToast({ type: 'success', title: 'Draft deleted' })
      loadHistory()
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message || err.message })
    } finally {
      setHistoryBusy(null)
    }
  }

  const handleSendEmail = async () => {
    setActionSlot(`email:${GENERATED_SLOT}`)
    try {
      await emailOneAdmissionLetter(student.batch_id, userId)
      addToast({ type: 'success', title: `Emailed to ${student?.email}` })
    } catch (err) {
      addToast({ type: 'error', title: 'Send failed', message: err.response?.data?.message || err.message })
    } finally {
      setActionSlot(null)
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
              const isGenerated = l.slot === GENERATED_SLOT
              return (
                <div key={l.slot} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[color:var(--text)]">{l.label}</p>
                      {l.present ? (
                        <p className="mt-0.5 truncate text-xs text-[color:var(--secondary)]">
                          {isGenerated ? 'Generated' : l.filename} · {fmtBytes(l.file_size)} · {formatDate(l.uploaded_at)}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-[color:var(--muted)]">{isGenerated ? 'Not generated yet.' : 'Not yet issued.'}</p>
                      )}
                    </div>
                    {l.present && (
                      isGenerated ? (
                        l.published ? (
                          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 size={12} /> Published
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            Draft
                          </span>
                        )
                      ) : (
                        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 size={12} /> Issued
                        </span>
                      )
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
                        {!isGenerated && (
                          <button
                            type="button"
                            disabled={actionSlot === `download:${l.slot}`}
                            onClick={() => handleDownload(l.slot, l.filename)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                          >
                            {actionSlot === `download:${l.slot}` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
                          </button>
                        )}
                        {isGenerated && canUpload && !l.published && (
                          <button
                            type="button"
                            disabled={actionSlot === `publish:${l.slot}`}
                            onClick={handlePublish}
                            title="Makes this letter visible to the scholar on their own login"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                          >
                            {actionSlot === `publish:${l.slot}` ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />} Publish
                          </button>
                        )}
                        {isGenerated && canUpload && (
                          <button
                            type="button"
                            disabled={actionSlot === `email:${l.slot}` || !l.published}
                            onClick={handleSendEmail}
                            title={!l.published ? 'Publish the letter first' : undefined}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                          >
                            {actionSlot === `email:${l.slot}` ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Send Email
                          </button>
                        )}
                      </>
                    )}
                    {isGenerated && canUpload && (
                      <button
                        type="button"
                        disabled={uploading || missingFields === null || missingFields.length > 0}
                        onClick={handleGenerate}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {uploading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        {uploading ? 'Generating…' : l.present ? 'Regenerate' : 'Generate'}
                      </button>
                    )}
                    {canUpload && (
                      <label className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isGenerated ? 'text-[color:var(--muted)] underline hover:text-[color:var(--accent)]' : l.present ? 'border border-[color:var(--border)] text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]' : 'bg-[color:var(--accent)] text-white hover:opacity-90'}`}>
                        {isGenerated ? null : uploading ? <Loader2 size={12} className="animate-spin" /> : l.present ? <RefreshCw size={12} /> : <UploadCloud size={12} />}
                        {isGenerated ? 'or upload manually' : uploading ? 'Uploading…' : l.present ? 'Replace' : 'Upload'}
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
                  {isGenerated && missingFields?.length > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                      <AlertTriangle size={13} className="shrink-0" />
                      Missing: {missingFields.join(', ')} — complete the scholar's profile before generating.
                    </p>
                  )}

                  {isGenerated && canUpload && (
                    <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                      <button
                        type="button"
                        onClick={handleToggleHistory}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:text-[color:var(--accent)]"
                      >
                        {showHistory ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        <Clock size={13} /> Version History
                      </button>
                      <p className="mt-1 text-[11px] text-[color:var(--muted)]">
                        Every Generate/Regenerate keeps the previous version — drafts can be deleted, but a published
                        letter is kept permanently for versioning and can't be deleted here.
                      </p>

                      {showHistory && (
                        history === null ? (
                          <div className="mt-2 flex items-center gap-2 text-xs text-[color:var(--secondary)]">
                            <Loader2 size={13} className="animate-spin" /> Loading history…
                          </div>
                        ) : history.length === 0 ? (
                          <p className="mt-2 text-xs text-[color:var(--muted)]">No versions yet.</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {history.map((v) => (
                              <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg bg-[color:var(--card)] px-3 py-2">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-[color:var(--text)]">{formatDate(v.created_at)}</p>
                                  <span className={`text-[10px] font-semibold ${v.is_published ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {v.is_published ? `Published ${formatDate(v.published_at)}` : 'Draft'}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={historyBusy === `preview:${v.id}`}
                                    onClick={() => handlePreviewVersion(v.id)}
                                    title="Preview this version"
                                    className="grid h-7 w-7 place-items-center rounded-lg text-[color:var(--secondary)] hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)] disabled:opacity-60"
                                  >
                                    {historyBusy === `preview:${v.id}` ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                                  </button>
                                  {!v.is_published && (
                                    <button
                                      type="button"
                                      disabled={historyBusy === `delete:${v.id}`}
                                      onClick={() => handleDeleteVersion(v.id)}
                                      title="Delete this draft"
                                      className="grid h-7 w-7 place-items-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-60"
                                    >
                                      {historyBusy === `delete:${v.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                    </button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )
                      )}
                    </div>
                  )}
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
