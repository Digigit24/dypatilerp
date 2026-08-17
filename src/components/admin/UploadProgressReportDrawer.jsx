/**
 * UploadProgressReportDrawer — the single upload surface for progress reports.
 *
 * Used from the Progress Reports subtab's "Report N" chip selector, both from
 * the admin's Scholar Detail page and (indirectly, via the same shared
 * component) anywhere else that renders it. The semester is whichever chip
 * is currently selected in the parent — this drawer no longer has its own
 * period picker, so it can never disagree with the tab it was opened from.
 *
 * Same two named slots as the student's own self-submit card (Report PDF/PPT
 * + Presentation PDF/PPT — either slot takes either file type), so an
 * admin-filed report always lands in the exact same shape a self-submit
 * would, on the exact same cycle thread (createSubmissionOnBehalf resolves/
 * reuses that cycle's existing submission rather than creating a duplicate).
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
const SLOTS = [
  { slot: 'report', label: 'Progress Report' },
  { slot: 'presentation', label: 'Presentation' },
]

const fullName = (s) => `${s?.first_name || ''} ${s?.last_name || ''}`.trim()

export default function UploadProgressReportDrawer({ studentUserId = null, semester, onClose, onUploaded }) {
  const addToast = useUiStore((s) => s.addToast)
  const locked = Boolean(studentUserId)

  const [roster, setRoster] = useState(locked ? [] : null)   // null = still loading
  const [lockedStudent, setLockedStudent] = useState(null)
  const [selectedId, setSelectedId] = useState(studentUserId || '')
  const [search, setSearch] = useState('')
  const [files, setFiles] = useState({ report: null, presentation: null })
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

  const setSlotFile = (slot, file) => setFiles((prev) => ({ ...prev, [slot]: file }))

  // ── File validation mirrors the server's rules so the user finds out here ──
  const fileError = useMemo(() => {
    for (const { slot, label } of SLOTS) {
      const f = files[slot]
      if (!f) continue
      const ext = (f.name.split('.').pop() || '').toLowerCase()
      if (!ALLOWED_EXT.includes(ext)) return `${label}: "${f.name}" is not a PDF, PPT or PPTX file.`
      if (f.size > MAX_BYTES) return `${label}: "${f.name}" is larger than the 25MB limit.`
      if (f.size <= 0) return `${label}: "${f.name}" is empty.`
    }
    return null
  }, [files])

  const noBatch = Boolean(selected) && !selected.batch_id
  const bothSlotsFilled = SLOTS.every(({ slot }) => files[slot])
  const canSubmit = Boolean(selected) && !noBatch && Boolean(semester) && bothSlotsFilled && !fileError && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      // 1. Resolve (or reuse) the submission tied to this scholar's Semester-N
      //    cycle — never a second row for a cycle that already has one.
      const createdRes = await createSubmissionOnBehalf({
        student_user_id: selected.user_id,
        batch_id: selected.batch_id,
        submission_type: 'progress_report',
        semester,
      })
      const submissionId = createdRes.data?.id
      if (!submissionId) throw new Error('Could not create the report')

      // 2. Both named slots — sequential on purpose, each replaces its own slot.
      for (const { slot } of SLOTS) await uploadSubmissionAttachment(submissionId, files[slot], slot)

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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Progress Report {semester}</p>
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

          {/* Files — two named slots, either PDF or PPT/PPTX in either one */}
          <div className="grid gap-3 sm:grid-cols-2">
            {SLOTS.map(({ slot, label }) => {
              const f = files[slot]
              return (
                <label key={slot} className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">
                    {label}<span className="ml-1 text-red-500">*</span>
                  </span>
                  <div className="mt-2 rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                    {f ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-[color:var(--text)]">
                          <FileText size={13} className="shrink-0 text-[color:var(--accent)]" />
                          {f.name}
                        </span>
                        <button type="button" onClick={() => setSlotFile(slot, null)} className="shrink-0 text-[color:var(--muted)] hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="flex cursor-pointer items-center justify-center gap-1.5 text-center text-xs font-semibold text-[color:var(--secondary)] hover:text-[color:var(--accent)]">
                        <UploadCloud size={14} /> Click to add
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.ppt,.pptx"
                          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) setSlotFile(slot, file) }}
                        />
                      </span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
          <p className="text-xs text-[color:var(--muted)]">PDF, PPT or PPTX — either file type in either slot, max 25MB each.</p>
          {fileError && <p className="text-xs font-semibold text-red-600">{fileError}</p>}

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
