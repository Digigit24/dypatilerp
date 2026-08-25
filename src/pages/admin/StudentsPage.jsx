import {
  CheckSquare, ClipboardList, Download, ExternalLink, FileSignature, Files, FileText, Filter, KeyRound, Lock,
  Loader2, RotateCcw, Square, Trash2, Upload, Users, XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProgressReportsByStudent, getSubmissionsByStudent } from '../../api/services/submissionService.js'
import { archiveStudent, bulkStudentAction, exportStudents, getStudents } from '../../api/services/studentService.js'
import { bulkSendCredentials, getUsers, sendCredentials } from '../../api/services/userService.js'
import ImportDrawer from '../../components/admin/ImportDrawer.jsx'
import OfficialLettersDrawer from '../../components/admin/OfficialLettersDrawer.jsx'
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import ResetPasswordModal from '../../components/shared/ResetPasswordModal.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'
import { useCourseStore } from '../../store/courseStore.js'
import { useLabels } from '../../store/labelStore.js'
import { usePermStore } from '../../store/permStore.js'

// Tabs map to the enrollment_status enum (active | suspended | withdrawn=archived).
const STATUS_TABS = ['all', 'active', 'suspended', 'archived']
const TAB_TO_STATUS = { active: 'active', suspended: 'suspended', archived: 'withdrawn' }

const PAGE_SIZE = 100

// Matches student-profile.service.js#ALL_SLOTS on the backend (CV, research
// proposal, publications list, research statement + 7 identity/marksheet
// scans) — the denominator for the "X/11 documents" column below.
const TOTAL_ONBOARDING_DOCS = 11

// Merge pages without ever duplicating a row (guards against double-fired loads).
const dedupeBy = (rows, key) => {
  const seen = new Set()
  const out = []
  for (const r of rows) { const k = r?.[key]; if (k != null && !seen.has(k)) { seen.add(k); out.push(r) } }
  return out
}

// Active-scholar bulk actions (the Archived tab swaps these for "Restore").
const BULK_ACTIONS = [
  { key: 'activate', label: 'Activate', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
  { key: 'suspend',  label: 'Suspend',  color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
  { key: 'archive',  label: 'Archive',  color: 'text-red-600 bg-red-50 hover:bg-red-100' },
]

export default function StudentsPage() {
  const navigate = useNavigate()
  const labels = useLabels()
  const [items,          setItems]          = useState(null)
  const [total,          setTotal]          = useState(0)
  const [loadingMore,    setLoadingMore]    = useState(false)
  const loadedRef        = useRef(0)
  const inFlightRef      = useRef(false)
  const requestedRef     = useRef(new Set())
  const sentinelRef      = useRef(null)
  const [users,          setUsers]          = useState([])
  const [selected,       setSelected]       = useState(null)        // row detail drawer
  // 'full' shows the whole profile snapshot; 'submissions'/'progress' jump
  // straight to that one section — used by the list columns' count links.
  const [drawerMode,     setDrawerMode]     = useState('full')
  const [studentSubs,    setStudentSubs]    = useState([])
  const [studentReports, setStudentReports] = useState([])           // uploaded progress-report submissions
  const [statusFilter,   setStatusFilter]   = useState('all')
  const [selectedIds,    setSelectedIds]    = useState(new Set())   // bulk selection (user_id)
  const [bulkLoading,    setBulkLoading]    = useState(false)
  const [exportLoading,  setExportLoading]  = useState(false)
  const [showImport,     setShowImport]     = useState(false)
  const [sendingCredId,  setSendingCredId]  = useState(null)      // per-row credential send in flight (user_id)
  const [confirmDialog,  setConfirmDialog]  = useState(null)      // { title, message, confirmLabel, tone, onConfirm }
  const [confirmBusy,    setConfirmBusy]    = useState(false)
  const [resetTarget,    setResetTarget]    = useState(null)      // { id, first_name, last_name, email } pending password reset
  const [lettersTarget,  setLettersTarget]  = useState(null)      // scholar row -> Official Letters drawer
  const addToast = useUiStore((s) => s.addToast)
  const { currentCourse, currentBatch } = useCourseStore()

  // Credential-email visibility (reuses the app-wide permission source; these
  // selectors re-evaluate when permissions load, and both fail closed):
  //  - per-row send mirrors the students:update gate (Admin + Coordinator)
  //  - bulk send is admin-only, matching the backend requireRole('admin') guard
  const canSendCreds     = usePermStore((s) => s.can('students', 'update'))
  const canBulkSendCreds = usePermStore((s) => s.hasRole('admin'))
  // Reset-password endpoint is admin-only server-side; gate identically so the
  // chip never renders for a role that would just get a 403.
  const canResetPassword = usePermStore((s) => s.hasRole('admin'))
  // getUsers requires users:read (guide/mentor lack it). Gate it so it never 403s.
  const canReadUsers     = usePermStore((s) => s.can('users', 'read'))

  useScrollLock(Boolean(selected) || showImport)

  // Status filter is applied server-side so paging + counts stay correct.
  const statusParam = () => (statusFilter === 'all' ? {} : { status: TAB_TO_STATUS[statusFilter] })

  // Core scholar data (students:read) — the students list already carries
  // first_name/last_name/email, so names render without the users enrichment.
  const loadStudents = () => {
    inFlightRef.current = false
    requestedRef.current = new Set([0])
    return getStudents({ ...statusParam(), limit: PAGE_SIZE, offset: 0 })
      .then((students) => {
        const data = dedupeBy(students.data, 'id')
        setItems(data)
        setTotal(students.total ?? data.length)
        loadedRef.current = data.length
      })
  }

  // Optional user enrichment — only for roles allowed to read users, and
  // non-blocking so a 403 can never blank this authorized page.
  useEffect(() => {
    if (!canReadUsers) { setUsers([]); return }
    getUsers().then((r) => setUsers(r.data)).catch(() => setUsers([]))
  }, [canReadUsers])

  // Synchronous in-flight guard prevents a rapid double-trigger appending the same page.
  const loadMore = () => {
    if (inFlightRef.current || !items || items.length >= total) return
    const offset = loadedRef.current
    if (requestedRef.current.has(offset)) return
    requestedRef.current.add(offset)
    inFlightRef.current = true
    setLoadingMore(true)
    getStudents({ ...statusParam(), limit: PAGE_SIZE, offset })
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

  // Re-fetch when the active course, batch, or status tab changes.
  // X-Course-Id / X-Batch-Id headers are added automatically.
  useEffect(() => {
    setItems(null)
    setSelectedIds(new Set())
    loadStudents()
  }, [currentCourse?.id, currentBatch?.id, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll — load the next 100 when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [items?.length, total]) // eslint-disable-line react-hooks/exhaustive-deps

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  // The students list already carries first_name/last_name/email, so names
  // resolve without users enrichment. Never fall back to a raw UUID — use "—".
  const nameOf  = (s) => {
    if (s.first_name || s.last_name) return `${s.first_name || ''} ${s.last_name || ''}`.trim()
    const u = userMap[s.user_id]
    return u ? `${u.first_name} ${u.last_name}` : '—'
  }
  const emailOf = (s) => s.email || userMap[s.user_id]?.email || '—'
  const initials = (s) => nameOf(s).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

  // Status filtering now happens server-side, so the loaded page is already scoped.
  const filtered = items || []

  // ── Row detail ────────────────────────────────────────────────────────────
  // student.id is the batch_enrollment row's own PK — NOT the user id. Every
  // fetch keyed to "this scholar" must use student.user_id (as the rest of
  // this file already does for archive/restore/credentials).
  const openStudent = async (student, mode = 'full') => {
    setSelected(student)
    setDrawerMode(mode)
    setStudentSubs([])
    setStudentReports([])
    const [subs, reports] = await Promise.all([
      getSubmissionsByStudent(student.user_id),
      getProgressReportsByStudent(student.user_id),
    ])
    setStudentSubs(subs.data || [])
    setStudentReports(reports.data || [])
  }

  // Full-page preview (with feedback panel) instead of a sidedrawer.
  const openSubmission = (sub) => navigate(`/admin/submissions/${sub.id}/preview`)

  // ── Bulk selection ────────────────────────────────────────────────────────
  const allFilteredIds = filtered.map((s) => s.user_id)
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id))
  const someSelected   = !allSelected && allFilteredIds.some((id) => selectedIds.has(id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => { const n = new Set(prev); allFilteredIds.forEach((id) => n.delete(id)); return n })
    } else {
      setSelectedIds((prev) => new Set([...prev, ...allFilteredIds]))
    }
  }

  const toggleRow = (userId, e) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const n = new Set(prev)
      n.has(userId) ? n.delete(userId) : n.add(userId)
      return n
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  // ── Bulk action ───────────────────────────────────────────────────────────
  const runBulkAction = async (action) => {
    const ids = [...selectedIds]
    setBulkLoading(true)
    try {
      const res = await bulkStudentAction(ids, action)
      addToast({ type: 'success', title: `${res.data.updated} student(s) ${action}d.` })
      clearSelection()
      await loadStudents()
    } catch {
      addToast({ type: 'error', title: `Bulk action failed. Please try again.` })
    } finally {
      setBulkLoading(false)
    }
  }

  // ── Send login details (rotate password + email) ──────────────────────────
  // Mirrors the User Management / Student Profile credential flow exactly:
  // one click rotates to a fresh secure password and emails it; the toast is
  // driven by the returned email_sent flag.
  const sendCredsOne = (student, e) => {
    e?.stopPropagation()
    if (!student.user_id) {
      addToast({ type: 'error', title: 'No linked login account', message: `${nameOf(student)} has no user account, so login details can't be sent.` })
      return
    }
    const name = nameOf(student)
    setConfirmDialog({
      title: 'Send Login Details',
      message: `Send fresh login details to ${name} by email? This resets their password to a new secure one.`,
      confirmLabel: 'Send Details',
      tone: 'accent',
      onConfirm: () => sendCredsConfirmed(student),
    })
  }

  const sendCredsConfirmed = async (student) => {
    setConfirmBusy(true)
    setSendingCredId(student.user_id)
    try {
      const r = await sendCredentials(student.user_id)
      addToast({
        type: r.data?.email_sent ? 'success' : 'error',
        title: r.data?.email_sent ? `Login details emailed to ${r.data.email || emailOf(student)}.` : 'Password was reset but the email failed',
        message: r.data?.email_error || undefined,
      })
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to send login details', message: err.response?.data?.message })
    } finally {
      setSendingCredId(null)
      setConfirmBusy(false)
      setConfirmDialog(null)
    }
  }

  // Admin-only bulk: rotate + email fresh login details to every selected scholar.
  const bulkSendCreds = () => {
    const ids = [...selectedIds].filter(Boolean) // never send an undefined user_id
    if (!ids.length) {
      addToast({ type: 'error', title: 'No scholars with a linked login account are selected.' })
      return
    }
    setConfirmDialog({
      title: 'Send Login Details',
      message: `Send fresh login details to ${ids.length} scholar(s) by email? This resets each of their passwords to a new secure one.`,
      confirmLabel: `Send to ${ids.length}`,
      tone: 'accent',
      onConfirm: () => bulkSendCredsConfirmed(ids),
    })
  }

  const bulkSendCredsConfirmed = async (ids) => {
    setConfirmBusy(true)
    setBulkLoading(true)
    try {
      const r = await bulkSendCredentials(ids)
      const sent = r.data?.emails_sent ?? 0
      const totalSent = r.data?.total ?? ids.length
      addToast({ type: sent === totalSent ? 'success' : 'warning', title: `Credentials sent to ${sent} of ${totalSent}.` })
      clearSelection()
    } catch (err) {
      addToast({ type: 'error', title: 'Bulk send failed', message: err.response?.data?.message })
    } finally {
      setBulkLoading(false)
      setConfirmBusy(false)
      setConfirmDialog(null)
    }
  }

  // ── Single-row archive / restore (soft delete) ─────────────────────────────
  const archiveOne = (student, e) => {
    e?.stopPropagation()
    const name = nameOf(student)
    setConfirmDialog({
      title: 'Archive Scholar',
      message: `Archive ${name}? They'll be hidden from the active list but can be restored from the Archived tab.`,
      confirmLabel: 'Archive',
      tone: 'danger',
      onConfirm: () => archiveConfirmed(student),
    })
  }

  const archiveConfirmed = async (student) => {
    const name = nameOf(student)
    setConfirmBusy(true)
    try {
      await archiveStudent(student.user_id)
      addToast({ type: 'success', title: `${name} archived.` })
      await loadStudents()
    } catch {
      addToast({ type: 'error', title: 'Archive failed. Please try again.' })
    } finally {
      setConfirmBusy(false)
      setConfirmDialog(null)
    }
  }

  const restoreOne = async (student, e) => {
    e?.stopPropagation()
    const name = nameOf(student)
    try {
      await bulkStudentAction([student.user_id], 'restore')
      addToast({ type: 'success', title: `${name} restored.` })
      await loadStudents()
    } catch {
      addToast({ type: 'error', title: 'Restore failed. Please try again.' })
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true)
    try {
      await exportStudents(statusFilter === 'all' ? {} : { status: statusFilter })
      addToast({ type: 'success', title: 'Students exported as CSV.' })
    } catch {
      addToast({ type: 'error', title: 'Export failed. Please try again.' })
    } finally {
      setExportLoading(false)
    }
  }

  if (!items) return <SkeletonCard rows={8} />

  return (
    <div className="fade-page">
      <PageHeader
        title={labels.studentPlural}
        subtitle="Enrollment, guides, and progress across the active batch."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--accent)] bg-[color:var(--accent-tint)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white transition"
            >
              <Upload size={15} /> Import
            </button>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)] transition disabled:opacity-60"
            >
              {exportLoading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export
            </button>
          </div>
        }
      />

      <div className="card overflow-hidden">
        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <div className="mobile-filter-scroll flex gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`mobile-compact-button shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${
                  statusFilter === tab
                    ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]'
                    : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {statusFilter === tab ? ` (${total})` : ''}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold text-[color:var(--secondary)]">
            <Filter size={14} /> Filter
          </button>
        </div>

        {/* ── Table ── */}
        <div className="table-wrap">
          <table className="min-w-[1620px] w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                {/* Checkbox select-all */}
                <th className="px-4 py-4 w-12">
                  <button
                    className="flex items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--accent)] transition"
                    onClick={toggleAll}
                    title={allSelected ? 'Deselect all' : 'Select all'}
                  >
                    {allSelected
                      ? <CheckSquare size={18} className="text-[color:var(--accent)]" />
                      : someSelected
                        ? <div className="h-[18px] w-[18px] rounded border-2 border-[color:var(--accent)] bg-[color:var(--accent-tint)]" />
                        : <Square size={18} />}
                  </button>
                </th>
                {['Name', 'Permanent ID', 'Batch', 'Enrolled', 'Progress', 'Submissions', 'Progress Reports', 'Documents', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-4">{h}</th>
                ))}
                <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-sm text-[color:var(--muted)]">
                    <Users className="mx-auto mb-3 text-[color:var(--border)]" size={32} />
                    No students found.
                  </td>
                </tr>
              )}
              {filtered.map((s) => {
                const isChecked = selectedIds.has(s.user_id)
                return (
                  <tr
                    key={s.id}
                    className={`table-row cursor-pointer border-b border-[color:var(--border)] transition ${isChecked ? 'bg-[color:var(--accent-tint)]/40' : ''}`}
                    onClick={() => openStudent(s)}
                  >
                    {/* Checkbox cell */}
                    <td className="px-4 py-5" onClick={(e) => toggleRow(s.user_id, e)}>
                      <div className="flex items-center justify-center">
                        {isChecked
                          ? <CheckSquare size={18} className="text-[color:var(--accent)]" />
                          : <Square size={18} className="text-[color:var(--muted)]" />}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-sm font-semibold text-[color:var(--accent)]">
                          {initials(s)}
                        </div>
                        <div>
                          <p className="font-semibold text-[color:var(--text)]">{nameOf(s)}</p>
                          <p className="text-xs text-[color:var(--secondary)]">{emailOf(s)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 text-[color:var(--secondary)]">{s.permanent_id}</td>
                    <td className="px-6 text-[color:var(--secondary)]">{s.batch_name || s.batch_id}</td>
                    <td className="px-6 text-[color:var(--secondary)]">{formatDate(s.enrolled_at)}</td>
                    <td className="px-6">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${s.progress_summary?.completion_percentage ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[color:var(--secondary)]">
                          {s.progress_summary?.completion_percentage ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[color:var(--secondary)] transition hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)]"
                        onClick={() => openStudent(s, 'submissions')}
                        title="View this scholar's submissions"
                      >
                        <FileText size={13} /> {s.submissions_count ?? 0}
                      </button>
                    </td>
                    <td className="px-6" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[color:var(--secondary)] transition hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)]"
                        onClick={() => openStudent(s, 'progress')}
                        title="View this scholar's progress reports"
                      >
                        <ClipboardList size={13} /> {s.progress_reports_count ?? 0}
                      </button>
                    </td>
                    <td className="px-6" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const count = s.documents_count ?? 0
                        const complete = count >= TOTAL_ONBOARDING_DOCS
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                              complete
                                ? 'bg-emerald-50 text-emerald-600'
                                : count > 0
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-[color:var(--surface)] text-[color:var(--muted)]'
                            }`}
                            title={`${count} of ${TOTAL_ONBOARDING_DOCS} onboarding documents uploaded`}
                          >
                            <Files size={13} /> {count}/{TOTAL_ONBOARDING_DOCS}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6"><StatusBadge status={s.status} /></td>
                    <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="ml-auto grid w-max grid-cols-2 gap-1.5">
                        {canSendCreds && (
                          s.user_id ? (
                            <button
                              onClick={(e) => sendCredsOne(s, e)}
                              disabled={sendingCredId === s.user_id}
                              className="action-chip action-chip--accent"
                              title="Generate a new password and email the login details to this scholar"
                            >
                              {sendingCredId === s.user_id ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Send Login
                            </button>
                          ) : (
                            <button
                              disabled
                              className="action-chip action-chip--neutral opacity-50"
                              title="This scholar has no linked login account, so login details can't be sent."
                            >
                              <KeyRound size={13} /> Send Login
                            </button>
                          )
                        )}
                        {canResetPassword && (
                          s.user_id ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setResetTarget({ id: s.user_id, first_name: nameOf(s), last_name: '', email: emailOf(s) }) }}
                              className="action-chip action-chip--warn"
                              title="Set a custom password (or auto-generate one) for this scholar"
                            >
                              <Lock size={13} /> Reset Password
                            </button>
                          ) : (
                            <button
                              disabled
                              className="action-chip action-chip--neutral opacity-50"
                              title="This scholar has no linked login account, so their password can't be reset."
                            >
                              <Lock size={13} /> Reset Password
                            </button>
                          )
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setLettersTarget(s) }}
                          className="action-chip action-chip--accent"
                          title="Upload or view this scholar's Official Letters"
                        >
                          <FileSignature size={13} /> Official Letter
                        </button>
                        {s.status === 'withdrawn' ? (
                          <button
                            onClick={(e) => restoreOne(s, e)}
                            className="action-chip action-chip--success"
                            title="Restore scholar"
                          >
                            <RotateCcw size={13} /> Restore
                          </button>
                        ) : (
                          <button
                            onClick={(e) => archiveOne(s, e)}
                            className="action-chip action-chip--danger"
                            title="Archive (soft-delete) scholar"
                          >
                            <Trash2 size={13} /> Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Infinite-scroll sentinel + Load more ── */}
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

      {/* ── Floating bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 animate-[fadeSlideUp_0.2s_ease]">
          <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2 pr-3 border-r border-[color:var(--border)]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--accent)] text-xs font-bold text-white">
                {selectedIds.size}
              </div>
              <span className="text-sm font-semibold text-[color:var(--text)]">
                selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(statusFilter === 'archived'
                ? [{ key: 'restore', label: 'Restore', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' }]
                : BULK_ACTIONS
              ).map((a) => (
                <button
                  key={a.key}
                  onClick={() => runBulkAction(a.key)}
                  disabled={bulkLoading}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${a.color}`}
                >
                  {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : a.label}
                </button>
              ))}
              {/* Admin-only: matches the backend requireRole('admin') bulk endpoint */}
              {canBulkSendCreds && (
                <button
                  onClick={bulkSendCreds}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white disabled:opacity-60"
                  title="Generate a new password for each selected scholar and email their login details"
                >
                  {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />} Send Login Details
                </button>
              )}
            </div>
            <button
              className="ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--surface)] text-[color:var(--muted)] hover:bg-[color:var(--border)] transition"
              onClick={clearSelection}
            >
              <XCircle size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Student detail drawer ── */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-start justify-between border-b border-[color:var(--border)] p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Student Details</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{nameOf(selected)}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">{selected.permanent_id} · {emailOf(selected)}</p>
                {drawerMode !== 'full' && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-[color:var(--accent-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">
                    {drawerMode === 'submissions' ? 'Submissions' : 'Progress Reports'}
                  </span>
                )}
              </div>
              <button
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]"
                onClick={() => setSelected(null)}
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto overscroll-contain p-6 space-y-5">
              {drawerMode === 'full' && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Info label="Batch"    value={selected.batch_name || selected.batch_id} />
                    <Info label="Status"   value={<StatusBadge status={selected.status} />} />
                    <Info label="Enrolled" value={formatDate(selected.enrolled_at)} />
                    <Info label="Progress" value={`${selected.progress_summary?.completion_percentage ?? 0}%`} />
                  </div>

                  <div className="rounded-xl bg-[color:var(--surface)] p-5">
                    <p className="font-semibold text-[color:var(--text)]">Profile</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]">
                      {selected.profile?.bio || 'No bio available.'}
                    </p>
                  </div>
                </>
              )}

              {(drawerMode === 'full' || drawerMode === 'submissions') && (
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Submissions</p>
                  {studentSubs.length === 0
                    ? <p className="text-sm text-[color:var(--secondary)]">No submissions found.</p>
                    : <div className="space-y-2">
                      {studentSubs.map((sub) => {
                        const fileCount = Array.isArray(sub.file_urls) ? sub.file_urls.length : 0
                        return (
                          <button
                            key={sub.id}
                            className="w-full rounded-xl border border-[color:var(--border)] p-4 text-left transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)]"
                            onClick={() => openSubmission(sub)}
                          >
                            <div className="safe-row items-start">
                              <p className="line-clamp-2 text-sm font-semibold text-[color:var(--text)]">{sub.title}</p>
                              <StatusBadge status={sub.status} />
                            </div>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--secondary)]">
                              <span className="capitalize">{(sub.submission_type || '').replaceAll('_', ' ')}</span>
                              <span>Semester {sub.semester || 1}</span>
                              <span>{fileCount} file{fileCount === 1 ? '' : 's'}</span>
                              {sub.remarks_count > 0 && <span>{sub.remarks_count} remark{sub.remarks_count === 1 ? '' : 's'}</span>}
                              <span>{formatDate(sub.submitted_at)}</span>
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  }
                </div>
              )}

              {(drawerMode === 'full' || drawerMode === 'progress') && (
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Progress Reports</p>
                  {studentReports.length === 0
                    ? <p className="text-sm text-[color:var(--secondary)]">No progress reports yet.</p>
                    : <div className="space-y-2">
                      {studentReports.map((r) => {
                        const fileCount = Array.isArray(r.file_urls) ? r.file_urls.length : 0
                        return (
                          <button
                            key={r.id}
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-left transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)]"
                            onClick={() => openSubmission(r)}
                          >
                            <div className="safe-row items-start">
                              <p className="line-clamp-2 text-sm font-semibold text-[color:var(--text)]">{r.title}</p>
                              <StatusBadge status={r.status} />
                            </div>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--secondary)]">
                              <span>Report {r.semester || 1}</span>
                              <span>{fileCount} file{fileCount === 1 ? '' : 's'}</span>
                              {r.remarks_count > 0 && <span>{r.remarks_count} remark{r.remarks_count === 1 ? '' : 's'}</span>}
                              <span>{formatDate(r.submitted_at || r.created_at)}</span>
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  }
                </div>
              )}

              <Link
                to={`/admin/students/${selected.user_id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--accent)] bg-[color:var(--accent-tint)] py-3 text-sm font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white"
              >
                <ExternalLink size={15} /> View Full Profile
              </Link>
            </div>
          </div>
        </div>
      )}


      {/* ── Import side drawer ── */}
      {showImport && (
        <ImportDrawer
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadStudents() }}
        />
      )}

      {/* ── Confirm dialog (replaces window.confirm) ── */}
      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        tone={confirmDialog?.tone}
        busy={confirmBusy}
        onConfirm={() => confirmDialog?.onConfirm?.()}
        onClose={() => setConfirmDialog(null)}
      />

      {/* ── Admin: set a custom password ── */}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      {/* ── Official Letters — same drawer the dedicated Official Letters page uses ── */}
      {lettersTarget && (
        <OfficialLettersDrawer
          student={lettersTarget}
          onClose={() => setLettersTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[color:var(--text)]">{value}</div>
    </div>
  )
}
