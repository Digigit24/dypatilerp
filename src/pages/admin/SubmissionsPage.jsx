/**
 * Submissions (admin) — the single home for reviewing everything scholars
 * submit. Replaces the old separate Assignments / Submissions / Approvals
 * sidenav entries: one page, sliced by tab instead of by route, since all
 * three were different filtered views of the same underlying `submissions`
 * table. Assignment *definitions* (create/edit/publish/roster) still live at
 * /admin/assignments — that's a coordinator setup action, not a submission
 * review action, so it stays a distinct flow, just reachable from here
 * instead of its own sidenav slot. Milestone definitions live in the Admin
 * Wizard's Milestones tab for the same reason.
 *
 * Row click opens the full-page preview (SubmissionPreviewPage), not a
 * drawer — the list of currently-visible submission ids is passed via
 * navigation state so the preview page can offer prev/next.
 */
import { ChevronDown, ListChecks, Loader2, RotateCcw, Search, Settings, User, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAssignments } from '../../api/services/assignmentService.js'
import { getBatches } from '../../api/services/batchService.js'
import { getSubmissions } from '../../api/services/submissionService.js'
import { getStudents } from '../../api/services/studentService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import SubmissionFileLink from '../../components/shared/SubmissionFileLink.jsx'
import { formatDate } from '../../lib/formatters.js'
import { useCourseStore } from '../../store/courseStore.js'

// Assignments have no approval chain — only draft/submitted are meaningful
// states, so the other tabs' statuses (approved/rejected/etc) would just be
// confusing dead options there.
const STATUS_OPTIONS_FULL = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_revision', label: 'Needs revision' },
  { value: 'rejected', label: 'Rejected' },
]
const STATUS_OPTIONS_ASSIGNMENT = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
]

const TABS = [
  { key: 'all',             label: 'All',              type: null },
  { key: 'progress_report', label: 'Progress Reports',  type: 'progress_report' },
  { key: 'assignment',      label: 'Assignments',       type: 'assignment' },
  { key: 'target',          label: 'Milestones',        type: 'target' },
]

// Groups multiple submission rows belonging to the same "thread" — e.g. a
// student's admin-uploaded and self-submitted copies of the same progress
// report cycle, or repeat attempts at the same assignment/milestone — into
// one bundled card instead of separate list rows. Not applied to the "All"
// tab, where rows of different kinds shouldn't merge.
const threadKeyFor = (tab, s) => {
  if (tab === 'progress_report') return `${s.student_user_id}:${s.cycle_id || `solo:${s.id}`}`
  if (tab === 'assignment') return `${s.student_user_id}:${s.assignment_id || `solo:${s.id}`}`
  if (tab === 'target') return `${s.student_user_id}:${s.target_id || `solo:${s.id}`}`
  return s.id
}

const fullName = (s) => `${s?.first_name || ''} ${s?.last_name || ''}`.trim()

const PAGE_SIZE = 50

export default function SubmissionsPage() {
  const navigate = useNavigate()
  const { currentCourse } = useCourseStore()
  const [tab, setTab] = useState('all')
  const [items, setItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [batches, setBatches] = useState([])
  const [assignments, setAssignments] = useState([])
  const [batchFilter, setBatchFilter] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [scholars, setScholars] = useState(null)
  const [scholarFilter, setScholarFilter] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    getStudents({ limit: 1000 }).then((r) => setScholars(r.data || [])).catch(() => setScholars([]))
  }, [])

  // Debounce free-text search so it doesn't fire a request per keystroke
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(debounceRef.current)
  }, [searchInput])

  useEffect(() => {
    if (!currentCourse?.id) { setBatches([]); setAssignments([]); return }
    getBatches({ course_id: currentCourse.id }).then((r) => setBatches(r.data || [])).catch(() => {})
    getAssignments({ course_id: currentCourse.id }).then((r) => setAssignments(r.data || [])).catch(() => {})
  }, [currentCourse?.id])

  const activeType = TABS.find((t) => t.key === tab)?.type
  const statusOptions = tab === 'assignment' ? STATUS_OPTIONS_ASSIGNMENT : STATUS_OPTIONS_FULL

  // Assignments tab has no approval states — drop a stale approved/rejected/etc
  // filter left over from another tab instead of silently returning nothing.
  useEffect(() => {
    if (tab === 'assignment' && statusFilter && !STATUS_OPTIONS_ASSIGNMENT.some((o) => o.value === statusFilter)) {
      setStatusFilter('')
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const buildFilters = (extra = {}) => {
    const f = { limit: PAGE_SIZE, offset: 0, ...extra }
    if (activeType) f.submission_type = activeType
    if (batchFilter) f.batch_id = batchFilter
    if (assignmentFilter) f.assignment_id = assignmentFilter
    if (statusFilter) f.status = statusFilter
    if (scholarFilter) f.student_user_id = scholarFilter
    if (search) f.search = search
    return f
  }

  const load = () => {
    setItems(null)
    getSubmissions(buildFilters()).then((r) => { setItems(r.data || []); setTotal(r.total ?? (r.data || []).length) })
  }

  useEffect(() => { load() }, [currentCourse?.id, tab, batchFilter, assignmentFilter, statusFilter, scholarFilter, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    if (!items || loadingMore || items.length >= total) return
    setLoadingMore(true)
    getSubmissions(buildFilters({ offset: items.length }))
      .then((r) => setItems((xs) => [...(xs || []), ...(r.data || [])]))
      .finally(() => setLoadingMore(false))
  }

  const resetFilters = () => {
    setBatchFilter(''); setAssignmentFilter(''); setStatusFilter(''); setScholarFilter(''); setSearchInput(''); setSearch('')
  }
  const filtersActive = batchFilter || assignmentFilter || statusFilter || scholarFilter || search

  // Bundle same-thread submissions (see threadKeyFor) into one row per thread.
  // The "All" tab stays flat — mixing kinds under one thread key isn't meaningful.
  const groups = useMemo(() => {
    const list = items || []
    if (tab === 'all') return list.map((s) => ({ key: s.id, submissions: [s] }))
    const byKey = new Map()
    for (const s of list) {
      const key = threadKeyFor(tab, s)
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(s)
    }
    return [...byKey.values()].map((submissions) => ({
      key: submissions[0].id,
      submissions: submissions.slice().sort((a, b) => new Date(a.created_at || a.submitted_at || 0) - new Date(b.created_at || b.submitted_at || 0)),
    }))
  }, [items, tab])

  const openPreview = (group) => {
    const repIds = groups.map((g) => g.submissions[g.submissions.length - 1].id)
    const groupMap = {}
    for (const g of groups) for (const sub of g.submissions) groupMap[sub.id] = g.submissions
    const latest = group.submissions[group.submissions.length - 1]
    navigate(`/admin/submissions/${latest.id}/preview`, { state: { submissionIds: repIds, groupMap } })
  }

  if (!currentCourse?.id) {
    return (
      <div className="fade-page">
        <PageHeader title="Submissions" subtitle="Every submission across your students, in one place." />
        <div className="card p-14 text-center text-sm text-[color:var(--secondary)]">Select a course from the header first.</div>
      </div>
    )
  }

  return (
    <div className="fade-page">
      <PageHeader
        title="Submissions"
        subtitle="Every progress report, assignment and milestone submission across your students, in one place."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ScholarSelect scholars={scholars} value={scholarFilter} onChange={setScholarFilter} />
            <Link to="/admin/assignments" className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]">
              <Settings size={15} /> Manage Assignments
            </Link>
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${tab === t.key ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-[color:var(--surface)] text-[color:var(--secondary)] hover:text-[color:var(--text)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="toolbar mb-5 !gap-3">
        <label className="admin-search soft-panel flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-full px-4">
          <Search size={15} className="text-[color:var(--muted)]" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"
            placeholder="Search student name, email or title…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        {/* flex-1 sets an explicit flex-basis, which is what actually sizes a flex
            item on the main axis — that takes priority over `.input`'s own
            `width: 100%`, so these size correctly instead of each claiming the
            full row. min/max-w keeps them from going cramped or oversized, and
            .toolbar's flex-wrap lets them drop to their own line on narrow screens. */}
        <FilterSelect className="min-w-[150px] max-w-[210px]" value={batchFilter} onChange={setBatchFilter}>
          <option value="">All batches</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.code || b.name}</option>)}
        </FilterSelect>
        {tab !== 'progress_report' && tab !== 'target' && (
          <FilterSelect className="min-w-[170px] max-w-[250px]" value={assignmentFilter} onChange={setAssignmentFilter}>
            <option value="">All assignments</option>
            {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </FilterSelect>
        )}
        <FilterSelect className="min-w-[140px] max-w-[190px]" value={statusFilter} onChange={setStatusFilter}>
          {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </FilterSelect>
        {filtersActive && (
          <button onClick={resetFilters} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[color:var(--surface)] px-4 text-xs font-semibold text-[color:var(--secondary)] transition hover:bg-[color:var(--border)]">
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {items === null ? (
        <SkeletonCard rows={6} />
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <ListChecks size={30} className="text-[color:var(--muted)]" />
          <p className="text-sm font-semibold text-[color:var(--text)]">No submissions match these filters</p>
          <p className="text-xs text-[color:var(--secondary)]">Try widening the batch, assignment or status filter above.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Title / Kind</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">File</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const s = g.submissions[g.submissions.length - 1] // latest = the row's headline data
                  const fileCount = g.submissions.reduce((n, sub) => n + (Array.isArray(sub.file_urls) ? sub.file_urls.length : 0), 0)
                  const firstFile = g.submissions.map((sub) => sub.file_urls?.[0]).find(Boolean)
                  const bundled = g.submissions.length > 1
                  return (
                    <tr key={g.key} className="cursor-pointer border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface)]" onClick={() => openPreview(g)}>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/admin/students/${s.student_user_id}`} className="font-semibold text-[color:var(--text)] hover:text-[color:var(--accent)]">
                          {s.first_name} {s.last_name}
                        </Link>
                        <p className="text-xs text-[color:var(--secondary)]">{s.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[color:var(--text)]">
                          {s.title}
                          {bundled && (
                            <span className="ml-2 rounded-full bg-[color:var(--accent-tint)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent)]">
                              {g.submissions.length} parts
                            </span>
                          )}
                        </p>
                        <p className="text-xs capitalize text-[color:var(--muted)]">{s.submission_type?.replaceAll('_', ' ')}</p>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--secondary)]">{s.batch_name || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-[color:var(--secondary)]">{formatDate(s.submitted_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {firstFile
                          ? <SubmissionFileLink file={firstFile} label={fileCount > 1 ? `Open (+${fileCount - 1})` : 'Open'} />
                          : <span className="text-xs text-[color:var(--muted)]">No file</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {items.length < total && (
            <div className="flex justify-center border-t border-[color:var(--border)] p-4">
              <button onClick={loadMore} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface)] px-5 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--border)]">
                {loadingMore && <Loader2 size={14} className="animate-spin" />}
                Load more ({items.length} of {total})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Big top-right scholar picker with inline search — filters the whole page to one scholar's submissions. */
/** Pill-shaped filter dropdown — native <select> underneath (keyboard/a11y for free) with a rounded-tab look and its own chevron instead of the browser's default arrow. */
function FilterSelect({ value, onChange, className = '', children }) {
  return (
    <div className={`relative flex-1 shrink-0 ${className}`}>
      <select
        className="h-10 w-full appearance-none rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] pl-4 pr-9 text-xs font-semibold text-[color:var(--text)] transition hover:border-[color:var(--accent)] hover:bg-[color:var(--card)] focus:border-[color:var(--accent)] focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
    </div>
  )
}

function ScholarSelect({ scholars, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selected = (scholars || []).find((s) => s.user_id === value) || null
  const query = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    const list = scholars || []
    if (!query) return list.slice(0, 60)
    return list.filter((s) =>
      fullName(s).toLowerCase().includes(query)
      || (s.email || '').toLowerCase().includes(query)
      || (s.enrollment_number || '').toLowerCase().includes(query)
    ).slice(0, 60)
  }, [scholars, query])

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 min-w-[220px] items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 text-sm font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface)]"
      >
        <User size={15} className="shrink-0 text-[color:var(--accent)]" />
        <span className="min-w-0 flex-1 truncate text-left">
          {selected ? fullName(selected) : 'All scholars'}
        </span>
        {selected ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false) }}
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[color:var(--muted)] hover:bg-[color:var(--border)]"
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={15} className="shrink-0 text-[color:var(--muted)]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-2 shadow-hover">
          <label className="admin-search soft-panel flex h-10 items-center gap-2 rounded-lg px-3">
            <Search size={14} className="text-[color:var(--muted)]" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"
              placeholder="Search by name, email or enrollment no…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <div className="mt-2 max-h-72 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setQ('') }}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-[color:var(--surface)] ${!value ? 'text-[color:var(--accent)]' : 'text-[color:var(--text)]'}`}
            >
              All scholars
            </button>
            {scholars === null ? (
              <p className="p-4 text-center text-sm text-[color:var(--secondary)]">Loading scholars…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-[color:var(--secondary)]">No scholars match &quot;{q}&quot;</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.user_id}
                  type="button"
                  onClick={() => { onChange(s.user_id); setOpen(false); setQ('') }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[color:var(--surface)] ${value === s.user_id ? 'bg-[color:var(--accent-tint)]' : ''}`}
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
    </div>
  )
}
