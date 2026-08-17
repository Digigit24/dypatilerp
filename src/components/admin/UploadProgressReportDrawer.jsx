/**
 * UploadProgressReportDrawer — the single upload surface for progress reports.
 *
 * Used from three places, all sharing this one component so the flow and the
 * validation never drift apart:
 *   • Admin → Progress Reports page  (no student preselected → search & pick)
 *   • Admin → Scholar detail page header
 *   • Scholar detail page → Progress Reports tab
 *
 * Opens in the same side-drawer chrome as the assignment upload drawer. The
 * report is owned by the scholar, the acting admin/coordinator is recorded as
 * creator, the file is streamed to object storage by our own API (no browser →
 * storage hop) and the report is then submitted into the batch's normal
 * approval chain. Any remark typed here is posted to the report's feedback
 * thread, which is independent of that chain.
 */
import { FileText, Loader2, Search, UploadCloud, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  addSubmissionRemark, createSubmissionOnBehalf, submitForReviewOnBehalf, uploadSubmissionAttachment,
} from '../../api/services/submissionService.js'
import { getStudentById, getStudents } from '../../api/services/studentService.js'
import { useUiStore } from '../../store/uiStore.js'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED_EXT = ['pdf', 'ppt', 'pptx']

const fullName = (s) => `${s?.first_name || ''} ${s?.last_name || ''}`.trim()

export default function UploadProgressReportDrawer({ studentUserId = null, onClose, onUploaded }) {
  const addToast = useUiStore((s) => s.addToast)
  const locked = Boolean(studentUserId)

  const [roster, setRoster] = useState(locked ? [] : null)   // null = still loading
  const [lockedStudent, setLockedStudent] = useState(null)
  const [selectedId, setSelectedId] = useState(studentUserId || '')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [period, setPeriod] = useState(1)
  const [files, setFiles] = useState([])
  const [remark, setRemark] = useState('')
  const [busy, setBusy] = useState(false)

  // ── Who can this report be filed for? ──────────────────────────────────────
  // Preselected: resolve just that scholar (their batch comes from the detail
  // endpoint). Otherwise: the active roster the caller is scoped to see.
  useEffect(() => {
    let alive = true
    if (locked) {
      getStudentById(studentUserId)
        .then((r) => { if (alive) setLockedStudent(r.data || null) })
        .catch(() => { if (alive) setLockedStudent(null) })
      return () => { alive = false }
    }
    getStudents({ limit: 500 })
      .then((r) => { if (alive) setRoster((r.data || []).filter((s) => s.status === 'active')) })
      .catch(() => { if (alive) setRoster([]) })
    return () => { alive = false }
  }, [locked, studentUserId])

  const selected = locked
    ? (lockedStudent && { ...lockedStudent, user_id: lockedStudent.id, batch_id: lockedStudent.batch_id })
    : (roster || []).find((s) => s.user_id === selectedId) || null

  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    const list = roster || []
    if (!q) return list.slice(0, 60)
    return list.filter((s) =>
      fullName(s).toLowerCase().includes(q)
      || (s.email || '').toLowerCase().includes(q)
      || (s.enrollment_number || '').toLowerCase().includes(q)
    ).slice(0, 60)
  }, [roster, q])

  // ── File validation mirrors the server's rules so the user finds out here ──
  const fileError = useMemo(() => {
    for (const f of files) {
      const ext = (f.name.split('.').pop() || '').toLowerCase()
      if (!ALLOWED_EXT.includes(ext)) return `"${f.name}" is not a PDF, PPT or PPTX file.`
      if (f.size > MAX_BYTES) return `"${f.name}" is larger than the 25MB limit.`
      if (f.size <= 0) return `"${f.name}" is empty.`
    }
    return null
  }, [files])

  const noBatch = Boolean(selected) && !selected.batch_id
  const canSubmit = Boolean(selected) && !noBatch && title.trim().length >= 2 && files.length > 0 && !fileError && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      // 1. Draft owned by the scholar; the acting staff member is the creator.
      const createdRes = await createSubmissionOnBehalf({
        student_user_id: selected.user_id,
        batch_id: selected.batch_id,
        title: title.trim(),
        submission_type: 'progress_report',
        semester: Number(period) || 1,
      })
      const submissionId = createdRes.data?.id
      if (!submissionId) throw new Error('Could not create the report')

      // 2. Stream each file through our API to object storage. Sequential on
      //    purpose — each call appends to the same submission's file list.
      for (const f of files) await uploadSubmissionAttachment(submissionId, f)

      // 3. Optional remark → the report's feedback thread (not the approval chain).
      const note = remark.trim()
      if (note) {
        try { await addSubmissionRemark(submissionId, note) } catch { /* non-fatal */ }
      }

      // 4. Into the batch's approval workflow, exactly as a self-submit would go.
      await submitForReviewOnBehalf(submissionId)

      addToast({
        type: 'success',
        title: `Progress report uploaded for ${fullName(selected) || 'the scholar'}.`,
        message: 'It has been sent through the batch approval workflow.',
      })
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Progress Report</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-[color:var(--text)]">Upload Report</h2>
            <p className="mt-0.5 text-sm text-[color:var(--secondary)]">
              Owned by the scholar and routed through the batch&apos;s approval workflow.
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
          {/* Scholar */}
          <div>
            <span className="text-sm font-semibold text-[color:var(--text)]">
              Scholar<span className="ml-1 text-red-500">*</span>
            </span>

            {locked ? (
              <div className="mt-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <p className="truncate text-sm font-semibold text-[color:var(--text)]">{fullName(lockedStudent) || 'Loading…'}</p>
                <p className="truncate text-xs text-[color:var(--secondary)]">
                  {lockedStudent?.email}{lockedStudent?.batch_name ? ` · ${lockedStudent.batch_name}` : ''}
                </p>
              </div>
            ) : selected ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[color:var(--text)]">{fullName(selected)}</p>
                  <p className="truncate text-xs text-[color:var(--secondary)]">
                    {selected.email}{selected.batch_name ? ` · ${selected.batch_name}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-full bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)]"
                  onClick={() => setSelectedId('')}
                >
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
                    placeholder="Search by name, email or enrollment no…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[color:var(--border)]">
                  {roster === null ? (
                    <p className="p-4 text-center text-sm text-[color:var(--secondary)]">Loading scholars…</p>
                  ) : filtered.length === 0 ? (
                    <p className="p-4 text-center text-sm text-[color:var(--secondary)]">
                      {q ? `No scholars match "${search}"` : 'No active scholars found.'}
                    </p>
                  ) : (
                    filtered.map((s) => (
                      <button
                        key={s.user_id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-2.5 text-left text-sm last:border-0 hover:bg-[color:var(--surface)]"
                        onClick={() => { setSelectedId(s.user_id); setSearch('') }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-[color:var(--text)]">{fullName(s)}</span>
                          <span className="block truncate text-xs text-[color:var(--secondary)]">
                            {s.email}{s.batch_name ? ` · ${s.batch_name}` : ''}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {noBatch && (
              <p className="mt-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                This scholar has no active batch enrollment — a report cannot be filed.
              </p>
            )}
          </div>

          {/* Title */}
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">
              Report title<span className="ml-1 text-red-500">*</span>
            </span>
            <input
              className="input mt-2 w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. First Progress Report"
            />
          </label>

          {/* Period */}
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">Report period</span>
            <select className="input mt-2 w-full" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>Report {n}</option>
              ))}
            </select>
          </label>

          {/* Files */}
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">
              Document<span className="ml-1 text-red-500">*</span>{' '}
              <span className="font-normal text-[color:var(--muted)]">(PDF, PPT or PPTX — max 25MB each)</span>
            </span>
            <div className="mt-2 flex items-center gap-2">
              <FileText size={16} className="shrink-0 text-[color:var(--accent)]" />
              <input
                className="block w-full text-sm text-[color:var(--secondary)] file:mr-3 file:rounded-xl file:border-0 file:bg-[color:var(--accent-tint)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--accent)]"
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </div>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f) => (
                  <li key={f.name} className="text-xs text-[color:var(--secondary)]">
                    {f.name} · {(f.size / 1024 / 1024).toFixed(2)} MB
                  </li>
                ))}
              </ul>
            )}
            {fileError && <p className="mt-2 text-xs font-semibold text-red-600">{fileError}</p>}
          </label>

          {/* Remark */}
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">
              Feedback <span className="font-normal text-[color:var(--muted)]">(optional)</span>
            </span>
            <textarea
              className="textarea mt-2 h-24 w-full"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Notes for the scholar and reviewers — saved to the report's feedback thread, separate from the approval decision."
            />
          </label>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
          <button
            type="button"
            className="h-11 flex-1 rounded-md bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={submit}
            disabled={!canSubmit}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={15} />}
            {busy ? 'Uploading…' : 'Upload & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
