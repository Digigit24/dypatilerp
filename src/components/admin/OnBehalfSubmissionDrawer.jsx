/**
 * OnBehalfSubmissionDrawer — admin upload surface for assignments and
 * milestones, on a scholar's behalf. Sibling to UploadProgressReportDrawer
 * (which keeps its own flow — semester + two named slots — since progress
 * reports don't have a picklist of definitions the way assignments/targets
 * do). Both kinds here submit against an existing admin-created definition:
 * pick the scholar, pick which assignment/milestone, attach one or more
 * files, optionally leave a remark, then it's sent through the normal
 * approval workflow exactly as a self-submit would be.
 */
import { FileText, Loader2, Search, UploadCloud, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  addSubmissionRemark, createSubmissionOnBehalf, submitForReviewOnBehalf, uploadSubmissionAttachment,
} from '../../api/services/submissionService.js'
import { getStudentById, getStudents } from '../../api/services/studentService.js'
import { getAssignments } from '../../api/services/assignmentService.js'
import { getTargets } from '../../api/services/targetService.js'
import { useUiStore } from '../../store/uiStore.js'

const MAX_BYTES = 25 * 1024 * 1024

const fullName = (s) => `${s?.first_name || ''} ${s?.last_name || ''}`.trim()

const KIND_META = {
  assignment: { label: 'Assignment', idField: 'assignment_id', nameField: 'title' },
  target:     { label: 'Milestone',  idField: 'target_id',     nameField: 'name' },
}

export default function OnBehalfSubmissionDrawer({ kind, studentUserId = null, onClose, onUploaded }) {
  const addToast = useUiStore((s) => s.addToast)
  const locked = Boolean(studentUserId)
  const meta = KIND_META[kind]

  const [roster, setRoster] = useState(locked ? [] : null)
  const [lockedStudent, setLockedStudent] = useState(null)
  const [selectedId, setSelectedId] = useState(studentUserId || '')
  const [search, setSearch] = useState('')
  const [defs, setDefs] = useState(null)
  const [defId, setDefId] = useState('')
  const [files, setFiles] = useState([])
  const [remark, setRemark] = useState('')
  const [busy, setBusy] = useState(false)

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

  // Once a scholar (and therefore batch) is known, load that batch's
  // published assignment/milestone definitions to pick from.
  useEffect(() => {
    setDefId('')
    if (!selected?.batch_id) { setDefs(null); return }
    let alive = true
    setDefs(null)
    const loader = kind === 'assignment'
      ? getAssignments({ batch_id: selected.batch_id })
      : getTargets({ batch_id: selected.batch_id, student_user_id: selected.user_id })
    loader
      .then((r) => { if (alive) setDefs((r.data || []).filter((d) => kind !== 'assignment' || d.is_published !== false)) })
      .catch(() => { if (alive) setDefs([]) })
    return () => { alive = false }
  }, [selected?.batch_id, selected?.user_id, kind])

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

  // Milestones take exactly one file per submission; assignments allow several.
  const addFiles = (fileList) => setFiles((prev) => (kind === 'target' ? Array.from(fileList).slice(0, 1) : [...prev, ...Array.from(fileList)]))
  const removeFile = (i) => setFiles((prev) => prev.filter((_, j) => j !== i))
  const fileError = useMemo(() => {
    for (const f of files) {
      if (f.size > MAX_BYTES) return `"${f.name}" is larger than the 25MB limit.`
      if (f.size <= 0) return `"${f.name}" is empty.`
    }
    return null
  }, [files])

  const selectedDef = (defs || []).find((d) => d.id === defId) || null
  const noBatch = Boolean(selected) && !selected.batch_id
  const canSubmit = Boolean(selected) && !noBatch && Boolean(defId) && files.length > 0 && !fileError && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      const createdRes = await createSubmissionOnBehalf({
        student_user_id: selected.user_id,
        [meta.idField]: defId,
      })
      const submissionId = createdRes.data?.id
      if (!submissionId) throw new Error('Could not create the submission')

      for (const f of files) await uploadSubmissionAttachment(submissionId, f)

      const note = remark.trim()
      if (note) {
        try { await addSubmissionRemark(submissionId, note) } catch { /* non-fatal */ }
      }

      await submitForReviewOnBehalf(submissionId)

      addToast({
        type: 'success',
        title: `${meta.label} uploaded for ${fullName(selected) || 'the scholar'}.`,
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
      <div className="drawer-panel lg:!w-[min(560px,calc(100vw-32px))] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{meta.label}</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-[color:var(--text)]">Upload {meta.label}</h2>
            <p className="mt-0.5 text-sm text-[color:var(--secondary)]">
              Owned by the scholar and routed through the batch&apos;s approval workflow.
            </p>
          </div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)] text-[color:var(--secondary)] hover:bg-[color:var(--border)]" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

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
                <button type="button" className="shrink-0 rounded-full bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)]" onClick={() => setSelectedId('')}>
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
                This scholar has no active batch enrollment — a submission cannot be filed.
              </p>
            )}
          </div>

          {/* Definition picker */}
          {selected && !noBatch && (
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--text)]">
                {meta.label}<span className="ml-1 text-red-500">*</span>
              </span>
              <select className="input mt-2 w-full" value={defId} onChange={(e) => setDefId(e.target.value)} disabled={defs === null}>
                <option value="">
                  {defs === null ? 'Loading…' : defs.length === 0 ? `No ${meta.label.toLowerCase()}s in this batch` : `Select a ${meta.label.toLowerCase()}…`}
                </option>
                {(defs || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d[meta.nameField] || d.module_name}{d.semester ? ` (Sem ${d.semester})` : ''}
                    {kind === 'assignment' && d.submission_count != null ? ` — ${d.submission_count} submitted` : ''}
                    {kind === 'target' && d.my_submission_status ? ` — already ${d.my_submission_status.replace('_', ' ')}` : ''}
                  </option>
                ))}
              </select>
              {selectedDef?.description && <p className="mt-1.5 text-xs text-[color:var(--secondary)]">{selectedDef.description}</p>}
            </label>
          )}

          {/* Files */}
          <div>
            <span className="text-sm font-semibold text-[color:var(--text)]">
              {kind === 'target' ? 'File' : 'Files'}<span className="ml-1 text-red-500">*</span>{' '}
              <span className="font-normal text-[color:var(--muted)]">{kind === 'target' ? '(one file, max 25MB)' : '(multiple allowed, max 25MB each)'}</span>
            </span>
            {!(kind === 'target' && files.length > 0) && (
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-6 text-center text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]">
                <UploadCloud size={16} /> {kind === 'target' ? 'Click to add a file' : 'Click to add files'}
                <input type="file" multiple={kind !== 'target'} className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
              </label>
            )}
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-[color:var(--surface)] px-3 py-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[color:var(--text)]">
                      <FileText size={12} className="shrink-0 text-[color:var(--accent)]" />
                      {f.name} <span className="shrink-0 text-[color:var(--muted)]">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </span>
                    <button onClick={() => removeFile(i)} className="shrink-0 text-[color:var(--muted)] hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            {fileError && <p className="mt-2 text-xs font-semibold text-red-600">{fileError}</p>}
          </div>

          {/* Remark */}
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">
              Remark / feedback <span className="font-normal text-[color:var(--muted)]">(optional)</span>
            </span>
            <textarea
              className="textarea mt-2 h-24 w-full"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Notes for the scholar and reviewers — saved to the feedback thread, separate from the approval decision."
            />
          </label>
        </div>

        <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
          <button type="button" className="h-11 flex-1 rounded-md bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50" onClick={submit} disabled={!canSubmit}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={15} />}
            {busy ? 'Uploading…' : 'Upload & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
