/**
 * All Submissions (admin) — cross-student list of every submission (progress
 * reports, assignments, etc.), filterable by batch / assignment / status with
 * search. The backend list endpoint (GET /submissions) already existed and
 * already powers the Approvals queue and a student's own profile tab, but no
 * screen surfaced the full, unfiltered list — this page is that screen.
 */
import { Loader2, ListChecks, RotateCcw, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAssignments } from '../../api/services/assignmentService.js'
import { getBatches } from '../../api/services/batchService.js'
import { getSubmissions } from '../../api/services/submissionService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import SubmissionFileLink from '../../components/shared/SubmissionFileLink.jsx'
import { formatDate } from '../../lib/formatters.js'
import { useCourseStore } from '../../store/courseStore.js'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_revision', label: 'Needs revision' },
  { value: 'rejected', label: 'Rejected' },
]

const PAGE_SIZE = 50

export default function SubmissionsPage() {
  const { currentCourse } = useCourseStore()
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
  const debounceRef = useRef(null)

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

  const buildFilters = (extra = {}) => {
    const f = { limit: PAGE_SIZE, offset: 0, ...extra }
    if (batchFilter) f.batch_id = batchFilter
    if (assignmentFilter) f.assignment_id = assignmentFilter
    if (statusFilter) f.status = statusFilter
    if (search) f.search = search
    return f
  }

  const load = () => {
    setItems(null)
    getSubmissions(buildFilters()).then((r) => { setItems(r.data || []); setTotal(r.total ?? (r.data || []).length) })
  }

  useEffect(() => { load() }, [currentCourse?.id, batchFilter, assignmentFilter, statusFilter, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    if (!items || loadingMore || items.length >= total) return
    setLoadingMore(true)
    getSubmissions(buildFilters({ offset: items.length }))
      .then((r) => setItems((xs) => [...(xs || []), ...(r.data || [])]))
      .finally(() => setLoadingMore(false))
  }

  const resetFilters = () => {
    setBatchFilter(''); setAssignmentFilter(''); setStatusFilter(''); setSearchInput(''); setSearch('')
  }
  const filtersActive = batchFilter || assignmentFilter || statusFilter || search

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
        subtitle="Every progress report and assignment submission across your students — filter by batch, assignment or status."
      />

      {/* Filters */}
      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <label className="admin-search soft-panel flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-full px-4">
          <Search size={15} className="text-[color:var(--muted)]" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"
            placeholder="Search student name, email or title…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <select className="input w-44 py-2 text-sm" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
          <option value="">All batches</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.code || b.name}</option>)}
        </select>
        <select className="input w-56 py-2 text-sm" value={assignmentFilter} onChange={(e) => setAssignmentFilter(e.target.value)}>
          <option value="">All assignments</option>
          {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <select className="input w-40 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {filtersActive && (
          <button onClick={resetFilters} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[color:var(--surface)] px-3 text-xs font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--border)]">
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
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Title / Assignment</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">File</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface)]">
                    <td className="px-5 py-3">
                      <Link to={`/admin/students/${s.student_user_id}`} className="font-semibold text-[color:var(--text)] hover:text-[color:var(--accent)]">
                        {s.first_name} {s.last_name}
                      </Link>
                      <p className="text-xs text-[color:var(--secondary)]">{s.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[color:var(--text)]">{s.title}</p>
                      <p className="text-xs capitalize text-[color:var(--muted)]">{s.submission_type?.replaceAll('_', ' ')}</p>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--secondary)]">{s.batch_name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-[color:var(--secondary)]">{formatDate(s.submitted_at)}</td>
                    <td className="px-4 py-3">
                      {Array.isArray(s.file_urls) && s.file_urls[0]
                        ? <SubmissionFileLink file={s.file_urls[0]} label={s.file_urls.length > 1 ? `Open (+${s.file_urls.length - 1})` : 'Open'} />
                        : <span className="text-xs text-[color:var(--muted)]">No file</span>}
                    </td>
                  </tr>
                ))}
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
