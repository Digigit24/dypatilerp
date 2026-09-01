import {
  AlertTriangle, CheckCircle2, CheckSquare, Eye, FileText, Loader2, Mail, RefreshCw, Save, Search, Send, Square, Trash2, Upload, Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  deleteAllDraftAdmissionLetters, emailAllAdmissionLetters, emailOneAdmissionLetter, generateAllAdmissionLetters,
  generateOneAdmissionLetter, getAdmissionLettersRoster, getEmailAllAdmissionLettersStatus, getGenerateAllAdmissionLettersStatus,
  publishAllAdmissionLetters, publishSelectedAdmissionLetters, updateBatch,
} from '../../api/services/batchService.js'
import { getStudents, previewOfficialLetter } from '../../api/services/studentService.js'
import { previewAdmissionLetterhead } from '../../api/services/settingsService.js'
import OfficialLettersDrawer from '../../components/admin/OfficialLettersDrawer.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { useCourseStore } from '../../store/courseStore.js'
import { useLabels } from '../../store/labelStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { usePermStore } from '../../store/permStore.js'
import { formatDate, scholarName } from '../../lib/formatters.js'

const PAGE_SIZE = 100

const dedupeBy = (rows, key) => {
  const seen = new Set()
  const out = []
  for (const r of rows) { const k = r?.[key]; if (k != null && !seen.has(k)) { seen.add(k); out.push(r) } }
  return out
}

const BulkJobProgressBar = ({ label, progress }) => {
  const pct = Math.round((progress.processed / progress.total) * 100)
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-[color:var(--secondary)]">
        <span>{label}… {progress.processed} of {progress.total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--border)]">
        <div className="h-full rounded-full bg-[color:var(--accent)] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function OfficialLettersPage() {
  const labels = useLabels()
  const { currentCourse, currentBatch, setCurrentBatch } = useCourseStore()
  const addToast = useUiStore((s) => s.addToast)
  // Mirrors the backend's requireRole gate on generate/email actions.
  const canManageLetters = usePermStore((s) => s.hasRole('admin') || s.hasRole('coordinator'))

  const [items, setItems]             = useState(null)
  const [total, setTotal]             = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadedRef    = useRef(0)
  const inFlightRef  = useRef(false)
  const sentinelRef  = useRef(null)
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState(null) // row -> drawer target
  const [sampleLoading, setSampleLoading] = useState(false)

  // Not tied to any real scholar/batch — renders the hardcoded template with
  // every variable shown as its placeholder name, using whatever letterhead
  // assets are currently saved in Settings. Same endpoint the Settings page's
  // own "Preview Letterhead" button uses.
  const handlePreviewSample = async () => {
    setSampleLoading(true)
    try { await previewAdmissionLetterhead() }
    catch (err) { addToast({ type: 'error', title: 'Preview failed', message: err.response?.data?.message }) }
    finally { setSampleLoading(false) }
  }

  useScrollLock(Boolean(selected))

  const loadStudents = () => {
    inFlightRef.current = false
    return getStudents({ status: 'active', limit: PAGE_SIZE, offset: 0 })
      .then((r) => {
        const data = dedupeBy(r.data, 'id')
        setItems(data)
        setTotal(r.total ?? data.length)
        loadedRef.current = data.length
      })
  }

  useEffect(() => {
    setItems(null)
    loadStudents()
  }, [currentCourse?.id, currentBatch?.id])

  const loadMore = () => {
    if (inFlightRef.current || !items || items.length >= total) return
    const offset = loadedRef.current
    inFlightRef.current = true
    setLoadingMore(true)
    getStudents({ status: 'active', limit: PAGE_SIZE, offset })
      .then((r) => {
        setItems((xs) => {
          const merged = dedupeBy([...(xs || []), ...r.data], 'id')
          loadedRef.current = merged.length
          return merged
        })
        setTotal((t) => r.total ?? t)
      })
      .catch(() => {})
      .finally(() => { inFlightRef.current = false; setLoadingMore(false) })
  }

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [items?.length, total]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Admission Letters — bulk actions + per-row status, scoped to whichever
  // batch is selected in the top course/batch switcher (bulk Ref No./Generate
  // All/Email All are inherently batch-scoped; there's nothing to run them
  // against without one selected). Per-row actions in the table only need the
  // scholar's own batch_id (already on each row from getStudents), so those
  // still work even without a batch selected up top.
  const [letterMap, setLetterMap] = useState(null) // Map<user_id, rosterRow> | null
  const [refPrefixInput, setRefPrefixInput] = useState('')
  const [savingPrefix, setSavingPrefix] = useState(false)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [emailingAll, setEmailingAll] = useState(false)
  const [publishingAll, setPublishingAll] = useState(false)
  const [publishingSelected, setPublishingSelected] = useState(false)
  const [deletingDrafts, setDeletingDrafts] = useState(false)
  const [rowBusy, setRowBusy] = useState(null) // `${action}:${userId}`
  const [selectedIds, setSelectedIds] = useState(new Set()) // user_ids picked for "Publish Selected"
  const [genProgress, setGenProgress] = useState(null) // { total, processed } while a background generate-all job is running
  const [emailProgress, setEmailProgress] = useState(null) // { total, processed } while a background email-all job is running
  const genPollRef = useRef(0) // bumped to invalidate any in-flight generate-all poll loop (batch switched away, unmount, etc.)
  const emailPollRef = useRef(0) // same, for the email-all poll loop

  // Shared by both bulk jobs: poll until 'done', update live progress, and —
  // unlike a naive "poll until done" loop — surface it honestly if the job
  // ever disappears mid-run (status flips back to 'idle', e.g. the backend
  // process restarted) instead of just quietly stopping with no feedback.
  const pollBulkJob = async ({ pollRef, myPoll, initialJob, getStatus, batchId, setProgress, setBusy, onDone, kind }) => {
    let job = initialJob
    setProgress({ total: job.total, processed: job.processed })
    while (job.status === 'running' && pollRef.current === myPoll) {
      await new Promise((r) => setTimeout(r, 1500))
      if (pollRef.current !== myPoll) return
      try {
        const polled = await getStatus(batchId)
        job = polled.data
      } catch {
        continue // transient network hiccup — keep polling rather than giving up
      }
      setProgress({ total: job.total, processed: job.processed })
    }
    if (pollRef.current !== myPoll) return
    if (job.status === 'done') {
      onDone(job)
    } else if (job.status === 'idle') {
      addToast({
        type: 'error',
        title: `${kind} status was lost`,
        message: 'The server may have restarted mid-run. Check the table below and retry if any letters are missing.',
      })
    }
    loadLetterRoster(batchId)
    setBusy(false)
    setProgress(null)
  }

  const loadLetterRoster = (batchId) => {
    if (!batchId) { setLetterMap(null); return }
    getAdmissionLettersRoster(batchId)
      .then((r) => setLetterMap(new Map((r.data || []).map((row) => [row.user_id, row]))))
      .catch(() => setLetterMap(new Map()))
  }

  useEffect(() => {
    setRefPrefixInput(currentBatch?.letter_ref_prefix || '')
    setSelectedIds(new Set())
    setGenProgress(null)
    setEmailProgress(null)
    setGeneratingAll(false)
    setEmailingAll(false)
    const myGenPoll = ++genPollRef.current   // stop any poll loop still running against the previous batch
    const myEmailPoll = ++emailPollRef.current
    loadLetterRoster(currentBatch?.id)

    // Resume live progress for a job that's still running server-side — e.g.
    // the admin started Generate All, then reloaded the page or switched
    // batches and came back before it finished. Without this the button
    // looks idle even though generation/emailing is still happening.
    const batchId = currentBatch?.id
    if (!batchId) return
    getGenerateAllAdmissionLettersStatus(batchId).then((r) => {
      if (genPollRef.current !== myGenPoll || r.data.status !== 'running') return
      setGeneratingAll(true)
      pollBulkJob({
        pollRef: genPollRef, myPoll: myGenPoll, initialJob: r.data, getStatus: getGenerateAllAdmissionLettersStatus,
        batchId, setProgress: setGenProgress, setBusy: setGeneratingAll, kind: 'Generate All',
        onDone: (job) => addToast({ type: 'success', title: `Generated ${job.generated.length}, skipped ${job.skipped.length}` }),
      })
    }).catch(() => {})
    getEmailAllAdmissionLettersStatus(batchId).then((r) => {
      if (emailPollRef.current !== myEmailPoll || r.data.status !== 'running') return
      setEmailingAll(true)
      pollBulkJob({
        pollRef: emailPollRef, myPoll: myEmailPoll, initialJob: r.data, getStatus: getEmailAllAdmissionLettersStatus,
        batchId, setProgress: setEmailProgress, setBusy: setEmailingAll, kind: 'Email All',
        onDone: (job) => addToast({ type: 'success', title: `Emailed ${job.sent.length}, skipped ${job.skipped.length}` }),
      })
    }).catch(() => {})
  }, [currentBatch?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Only a generated-but-not-yet-published letter is a meaningful publish target.
  const publishableIds = letterMap
    ? [...letterMap.values()].filter((r) => r.generated && !r.published).map((r) => r.user_id)
    : []
  const allPublishableSelected = publishableIds.length > 0 && publishableIds.every((id) => selectedIds.has(id))

  const toggleSelectAll = () => {
    setSelectedIds(allPublishableSelected ? new Set() : new Set(publishableIds))
  }
  const toggleSelectOne = (userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  const handleSavePrefix = async () => {
    setSavingPrefix(true)
    try {
      const res = await updateBatch(currentBatch.id, { letter_ref_prefix: refPrefixInput.trim() })
      setCurrentBatch(res.data)
      addToast({ type: 'success', title: 'Ref No. prefix saved' })
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save prefix', message: err.response?.data?.message })
    } finally { setSavingPrefix(false) }
  }

  // Both bulk jobs run in the background on the server (see
  // admission-letter.service.js — sequential per-scholar Zata/SMTP round-trips
  // used to time out inside one HTTP request on larger batches). This kicks
  // the job off, then polls for live progress via pollBulkJob until it's done.
  const handleGenerateAll = async () => {
    const batchId = currentBatch.id
    const myPoll = ++genPollRef.current
    setGeneratingAll(true)
    setGenProgress(null)
    try {
      const started = await generateAllAdmissionLetters(batchId, refPrefixInput.trim() || undefined)
      await pollBulkJob({
        pollRef: genPollRef, myPoll, initialJob: started.data, getStatus: getGenerateAllAdmissionLettersStatus,
        batchId, setProgress: setGenProgress, setBusy: setGeneratingAll, kind: 'Generate All',
        onDone: (job) => addToast({ type: 'success', title: `Generated ${job.generated.length}, skipped ${job.skipped.length}` }),
      })
    } catch (err) {
      if (genPollRef.current === myPoll) {
        addToast({ type: 'error', title: 'Generate All failed', message: err.response?.data?.message })
        setGeneratingAll(false)
        setGenProgress(null)
      }
    }
  }

  const handleEmailAll = async () => {
    const batchId = currentBatch.id
    const myPoll = ++emailPollRef.current
    setEmailingAll(true)
    setEmailProgress(null)
    try {
      const started = await emailAllAdmissionLetters(batchId)
      await pollBulkJob({
        pollRef: emailPollRef, myPoll, initialJob: started.data, getStatus: getEmailAllAdmissionLettersStatus,
        batchId, setProgress: setEmailProgress, setBusy: setEmailingAll, kind: 'Email All',
        onDone: (job) => addToast({ type: 'success', title: `Emailed ${job.sent.length}, skipped ${job.skipped.length}` }),
      })
    } catch (err) {
      if (emailPollRef.current === myPoll) {
        addToast({ type: 'error', title: 'Email All failed', message: err.response?.data?.message })
        setEmailingAll(false)
        setEmailProgress(null)
      }
    }
  }

  const handlePublishAll = async () => {
    setPublishingAll(true)
    try {
      const r = await publishAllAdmissionLetters(currentBatch.id)
      addToast({ type: 'success', title: `Published ${r.data.published.length} letter(s)` })
      setSelectedIds(new Set())
      loadLetterRoster(currentBatch.id)
    } catch (err) {
      addToast({ type: 'error', title: 'Publish All failed', message: err.response?.data?.message })
    } finally { setPublishingAll(false) }
  }

  const handlePublishSelected = async () => {
    setPublishingSelected(true)
    try {
      const r = await publishSelectedAdmissionLetters(currentBatch.id, [...selectedIds])
      addToast({ type: 'success', title: `Published ${r.data.published.length} letter(s)` })
      setSelectedIds(new Set())
      loadLetterRoster(currentBatch.id)
    } catch (err) {
      addToast({ type: 'error', title: 'Publish failed', message: err.response?.data?.message })
    } finally { setPublishingSelected(false) }
  }

  const handleDeleteAllDrafts = async () => {
    if (!confirm('Permanently delete every unpublished draft admission letter in this batch? Published letters are never affected.')) return
    setDeletingDrafts(true)
    try {
      const r = await deleteAllDraftAdmissionLetters(currentBatch.id)
      addToast({ type: 'success', title: `Deleted ${r.data.deleted} draft(s)` })
      setSelectedIds(new Set())
      loadLetterRoster(currentBatch.id)
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message })
    } finally { setDeletingDrafts(false) }
  }

  const handlePublishOne = async (student) => {
    setRowBusy(`publish:${student.user_id}`)
    try {
      await publishSelectedAdmissionLetters(student.batch_id, [student.user_id])
      addToast({ type: 'success', title: `Published for ${displayNameOf(student)}` })
      if (student.batch_id === currentBatch?.id) loadLetterRoster(currentBatch.id)
    } catch (err) {
      addToast({ type: 'error', title: 'Publish failed', message: err.response?.data?.message })
    } finally { setRowBusy(null) }
  }

  const handleGenerateOne = async (student) => {
    if (!student.batch_id) { addToast({ type: 'error', title: 'This scholar has no active batch enrollment.' }); return }
    setRowBusy(`generate:${student.user_id}`)
    try {
      await generateOneAdmissionLetter(student.batch_id, student.user_id)
      addToast({ type: 'success', title: 'Letter generated' })
      if (student.batch_id === currentBatch?.id) loadLetterRoster(currentBatch.id)
    } catch (err) {
      addToast({ type: 'error', title: 'Generate failed', message: err.response?.data?.message })
    } finally { setRowBusy(null) }
  }

  const handleEmailOne = async (student) => {
    setRowBusy(`email:${student.user_id}`)
    try {
      await emailOneAdmissionLetter(student.batch_id, student.user_id)
      addToast({ type: 'success', title: `Emailed to ${student.email}` })
      if (student.batch_id === currentBatch?.id) loadLetterRoster(currentBatch.id)
    } catch (err) {
      addToast({ type: 'error', title: 'Send failed', message: err.response?.data?.message })
    } finally { setRowBusy(null) }
  }

  const handlePreviewOne = async (userId) => {
    setRowBusy(`preview:${userId}`)
    try { await previewOfficialLetter(userId, 'admission_confirmation') }
    catch (err) { addToast({ type: 'error', title: 'Preview failed', message: err.response?.data?.message }) }
    finally { setRowBusy(null) }
  }

  const nameOf = (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—'
  // Initials stay off the "Dr."-prefixed display name — a "D?" avatar would be confusing.
  const initials = (s) => nameOf(s).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const displayNameOf = (s) => scholarName(s) || nameOf(s)

  const q = search.trim().toLowerCase()
  const filtered = (items || []).filter((s) => !q
    || nameOf(s).toLowerCase().includes(q)
    || (s.email || '').toLowerCase().includes(q)
    || (s.permanent_id || '').toLowerCase().includes(q))

  const missingPrefix = !!currentBatch && !currentBatch.letter_ref_prefix?.trim()
  const scholarsMissingFields = letterMap ? [...letterMap.values()].filter((r) => r.missing_fields.length > 0) : []

  if (!items) return <SkeletonCard rows={8} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Official Letters"
        subtitle={`Upload and issue Admission Confirmation, Guide Approval and Title Approval letters for each ${labels.student?.toLowerCase() || 'scholar'}.`}
        action={
          canManageLetters && (
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition disabled:opacity-60"
              onClick={handlePreviewSample}
              disabled={sampleLoading}
              title="Preview the Admission Confirmation Letter template with every variable shown as its placeholder — not tied to any real scholar"
            >
              {sampleLoading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Preview Sample Template
            </button>
          )
        }
      />

      {currentBatch && (missingPrefix || scholarsMissingFields.length > 0) && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            {missingPrefix && (
              <p className="font-semibold">This batch has no Ref No. prefix set yet — set one below before generating letters.</p>
            )}
            {scholarsMissingFields.length > 0 && (
              <p className={missingPrefix ? 'mt-1' : 'font-semibold'}>
                {scholarsMissingFields.length} scholar{scholarsMissingFields.length === 1 ? '' : 's'} in this batch {scholarsMissingFields.length === 1 ? 'is' : 'are'} missing designation/organisation/address — their letters will be skipped until their profile is complete.
              </p>
            )}
          </div>
        </div>
      )}

      {currentBatch && canManageLetters && (
        <div className="mb-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <FileText size={16} className="text-[color:var(--accent)]" />
          <span className="text-sm font-semibold text-[color:var(--text)]">Admission Letters — {currentBatch.name}</span>
          <input
            className="input ml-auto w-56 text-sm"
            placeholder="Ref No. prefix e.g. POSTDOC26/J07"
            value={refPrefixInput}
            onChange={(e) => setRefPrefixInput(e.target.value)}
          />
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition disabled:opacity-60"
            onClick={handleSavePrefix}
            disabled={savingPrefix || !refPrefixInput.trim() || refPrefixInput.trim() === currentBatch.letter_ref_prefix}
            title="Save the Ref No. prefix without generating letters"
          >
            {savingPrefix ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
          </button>
          <button
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-60"
            onClick={handleGenerateAll}
            disabled={generatingAll || !refPrefixInput.trim()}
            title={!refPrefixInput.trim() ? 'Enter a Ref No. prefix first' : undefined}
          >
            {generatingAll ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            {generatingAll && genProgress?.total ? `Generating ${genProgress.processed}/${genProgress.total}…` : 'Generate All'}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition disabled:opacity-60"
            onClick={handlePublishAll}
            disabled={publishingAll || publishableIds.length === 0}
            title="Makes every generated-but-draft letter visible to those scholars on their own login"
          >
            {publishingAll ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Publish All
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition disabled:opacity-60"
            onClick={handlePublishSelected}
            disabled={publishingSelected || selectedIds.size === 0}
          >
            {publishingSelected ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Publish Selected{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition disabled:opacity-60"
            onClick={handleEmailAll}
            disabled={emailingAll || !letterMap || ![...letterMap.values()].some((r) => r.published && !r.sent)}
            title="Only sends to scholars whose letter is already published"
          >
            {emailingAll ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            {emailingAll && emailProgress?.total ? `Emailing ${emailProgress.processed}/${emailProgress.total}…` : 'Email All'}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-60"
            onClick={handleDeleteAllDrafts}
            disabled={deletingDrafts || !letterMap || ![...letterMap.values()].some((r) => r.generated && !r.published)}
            title="Permanently deletes every unpublished draft in this batch — published letters are never affected"
          >
            {deletingDrafts ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete All Drafts
          </button>
        </div>
        {generatingAll && genProgress?.total > 0 && (
          <BulkJobProgressBar label="Generating letters" progress={genProgress} />
        )}
        {emailingAll && emailProgress?.total > 0 && (
          <BulkJobProgressBar label="Sending emails" progress={emailProgress} />
        )}
        <p className="mt-3 text-xs text-[color:var(--secondary)]">
          Drafts can be deleted any time. Published letters are kept permanently as version history and cannot be deleted from here.
        </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <label className="admin-search soft-panel flex h-10 w-full max-w-xs items-center gap-2 rounded-full px-4">
            <Search size={14} className="text-[color:var(--muted)]" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"
              placeholder="Search by name, email or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="text-xs font-semibold text-[color:var(--secondary)]">{total} {labels.studentPlural?.toLowerCase() || 'scholars'}</span>
        </div>

        <div className="table-wrap">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                {currentBatch && canManageLetters && (
                  <th className="px-4 py-4">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      disabled={publishableIds.length === 0}
                      title="Select every generated-but-draft letter"
                      className="grid place-items-center disabled:opacity-40"
                    >
                      {allPublishableSelected ? <CheckSquare size={16} className="text-[color:var(--accent)]" /> : <Square size={16} className="text-[color:var(--muted)]" />}
                    </button>
                  </th>
                )}
                {['Name', 'Permanent ID', 'Batch', 'Status', 'Admission Letter'].map((h) => <th key={h} className="px-6 py-4">{h}</th>)}
                <th className="px-6 py-4 text-right">Letters</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={currentBatch && canManageLetters ? 7 : 6} className="px-6 py-16 text-center text-sm text-[color:var(--muted)]">
                    <Users className="mx-auto mb-3 text-[color:var(--border)]" size={32} />
                    No scholars found.
                  </td>
                </tr>
              )}
              {filtered.map((s) => {
                const letter = letterMap?.get(s.user_id)
                return (
                <tr
                  key={s.id}
                  className="table-row cursor-pointer border-b border-[color:var(--border)] transition"
                  onClick={() => setSelected(s)}
                >
                  {currentBatch && canManageLetters && (
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      {letter?.generated && !letter?.published && (
                        <button type="button" onClick={() => toggleSelectOne(s.user_id)} className="grid place-items-center">
                          {selectedIds.has(s.user_id) ? <CheckSquare size={16} className="text-[color:var(--accent)]" /> : <Square size={16} className="text-[color:var(--muted)]" />}
                        </button>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-sm font-semibold text-[color:var(--accent)]">
                        {initials(s)}
                      </div>
                      <div>
                        <p className="font-semibold text-[color:var(--text)]">{displayNameOf(s)}</p>
                        <p className="text-xs text-[color:var(--secondary)]">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 text-[color:var(--secondary)]">{s.permanent_id}</td>
                  <td className="px-6 text-[color:var(--secondary)]">{s.batch_name || s.batch_id}</td>
                  <td className="px-6"><StatusBadge status={s.status} /></td>
                  <td className="px-6" onClick={(e) => e.stopPropagation()}>
                    {!currentBatch ? (
                      <span className="text-xs text-[color:var(--muted)]">Select a batch above</span>
                    ) : !letter ? (
                      <Loader2 size={14} className="animate-spin text-[color:var(--muted)]" />
                    ) : (
                      <div className="py-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {!letter.generated ? (
                            <span className="text-[11px] text-[color:var(--muted)]">Not generated</span>
                          ) : letter.published ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                              <CheckCircle2 size={11} /> Published {formatDate(letter.published_at)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                              Draft — Generated {formatDate(letter.generated_at)}
                            </span>
                          )}
                          {letter.generated && (
                            <button
                              disabled={rowBusy === `preview:${s.user_id}`}
                              onClick={() => handlePreviewOne(s.user_id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--accent-tint)] px-2 py-1 text-[11px] font-semibold text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white disabled:opacity-60"
                            >
                              {rowBusy === `preview:${s.user_id}` ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />} Preview
                            </button>
                          )}
                          {canManageLetters && (
                            <button
                              disabled={rowBusy === `generate:${s.user_id}` || letter.missing_fields.length > 0}
                              onClick={() => handleGenerateOne(s)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--border)] px-2 py-1 text-[11px] font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                            >
                              {rowBusy === `generate:${s.user_id}` ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} {letter.generated ? 'Regenerate' : 'Generate'}
                            </button>
                          )}
                          {canManageLetters && letter.generated && !letter.published && (
                            <button
                              disabled={rowBusy === `publish:${s.user_id}`}
                              onClick={() => handlePublishOne(s)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--accent)] px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
                            >
                              {rowBusy === `publish:${s.user_id}` ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} Publish
                            </button>
                          )}
                          {canManageLetters && letter.published && (
                            <button
                              disabled={rowBusy === `email:${s.user_id}`}
                              onClick={() => handleEmailOne(s)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--border)] px-2 py-1 text-[11px] font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                            >
                              {rowBusy === `email:${s.user_id}` ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} {letter.sent ? 'Resend' : 'Email'}
                            </button>
                          )}
                        </div>
                        {letter.missing_fields.length > 0 && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600">
                            <AlertTriangle size={11} className="shrink-0" /> Missing: {letter.missing_fields.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[color:var(--secondary)] transition hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)]"
                      onClick={() => setSelected(s)}
                    >
                      <FileText size={13} /> Manage
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {items.length < total && (
        <div ref={sentinelRef} className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-2.5 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
          >
            {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
            {loadingMore ? 'Loading…' : `Load more (${items.length} of ${total})`}
          </button>
        </div>
      )}

      {selected && (
        <OfficialLettersDrawer student={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
