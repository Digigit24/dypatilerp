/**
 * Persistent scholar-browsing rail for the admin submission preview screen.
 * Lives alongside SubmissionPreviewPage (never unmounts between submissions —
 * React Router re-renders the same route element on a param change, it
 * doesn't remount it) so switching submissions/scholars never flickers.
 *
 * Purely additive: reads GET /students and GET /submissions, both already
 * RBAC-scoped server-side, so a coordinator/guide/mentor with narrower
 * `students:read` scope automatically sees only their own scholars here —
 * same as every other screen that calls these endpoints. Nothing here
 * bypasses or duplicates that scoping.
 */
import { ChevronDown, Loader2, MessageSquare, PanelLeftClose, PanelLeftOpen, Search, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudents } from '../../api/services/studentService.js'
import { getSubmissions } from '../../api/services/submissionService.js'
import { formatDate } from '../../lib/formatters.js'
import StatusBadge from '../shared/StatusBadge.jsx'

const COLLAPSE_KEY = 'dyperf_submission_sidebar_collapsed'

const CATEGORIES = [
  { type: 'progress_report', label: 'Progress Reports' },
  { type: 'assignment',      label: 'Assignments' },
  { type: 'target',          label: 'Milestones' },
]

const fullName = (s) => `${s?.first_name || ''} ${s?.last_name || ''}`.trim() || '—'
const initials = (s) => fullName(s).split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

// A quick "does anything here need a look" signal, computed once a scholar's
// submissions are actually loaded (not from the aggregate counts, which only
// carry totals — see the students_count fixes earlier this session).
const needsAttention = (subs) => subs.some((s) => ['submitted', 'under_review'].includes(s.status))

export default function SubmissionsSidebar({ activeSubmissionId, activeScholarId }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const [scholars, setScholars] = useState(null) // null = loading, [] = loaded empty
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  // scholarId -> 'loading' | array of submissions | Error
  const [subsById, setSubsById] = useState({})
  const autoExpandedFor = useRef(null) // last activeScholarId we auto-expanded, so it only happens once per arrival
  const rowRefs = useRef({})

  useEffect(() => {
    let alive = true
    getStudents({ limit: 1000 })
      .then((r) => { if (alive) setScholars(r.data || []) })
      .catch(() => { if (alive) setScholars([]) })
    return () => { alive = false }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  const loadSubsFor = (scholarId) => {
    setSubsById((m) => ({ ...m, [scholarId]: 'loading' }))
    getSubmissions({ student_user_id: scholarId })
      .then((r) => setSubsById((m) => ({ ...m, [scholarId]: r.data || [] })))
      .catch(() => setSubsById((m) => ({ ...m, [scholarId]: [] })))
  }

  const toggleScholar = (scholarId) => {
    setExpandedId((cur) => {
      const next = cur === scholarId ? null : scholarId
      if (next && !subsById[next]) loadSubsFor(next)
      return next
    })
  }

  // Arriving at a submission (deep link, or a click from elsewhere) whose
  // owner isn't the currently-expanded scholar — expand + reveal them, once
  // per arrival. Doesn't fight a manual expand/collapse the admin does after.
  useEffect(() => {
    if (!activeScholarId || collapsed) return
    if (autoExpandedFor.current === activeScholarId) return
    autoExpandedFor.current = activeScholarId
    setExpandedId(activeScholarId)
    if (!subsById[activeScholarId]) loadSubsFor(activeScholarId)
    requestAnimationFrame(() => rowRefs.current[activeScholarId]?.scrollIntoView({ block: 'nearest' }))
  }, [activeScholarId, collapsed]) // eslint-disable-line react-hooks/exhaustive-deps

  const openSubmission = (sub, siblingIds) => {
    navigate(`/admin/submissions/${sub.id}/preview`, { state: { submissionIds: siblingIds } })
  }

  const q = search.trim().toLowerCase()
  const filtered = (scholars || []).filter((s) => {
    if (!q) return true
    return fullName(s).toLowerCase().includes(q)
      || (s.email || '').toLowerCase().includes(q)
      || (s.permanent_id || '').toLowerCase().includes(q)
  })
  const sorted = filtered.slice().sort((a, b) => fullName(a).localeCompare(fullName(b)))

  if (collapsed) {
    return (
      <div className="flex w-14 shrink-0 flex-col items-center border-r border-[color:var(--border)] bg-[color:var(--card)] py-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--surface)]"
          title="Expand scholars"
        >
          <PanelLeftOpen size={17} />
        </button>
        <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {sorted.map((s) => (
            <button
              key={s.user_id}
              type="button"
              onClick={() => { toggleCollapsed(); toggleScholar(s.user_id) }}
              title={fullName(s)}
              className={`grid h-9 w-9 place-items-center rounded-full text-[11px] font-bold transition ${
                s.user_id === activeScholarId
                  ? 'bg-[color:var(--accent)] text-white'
                  : 'bg-[color:var(--accent-tint)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white'
              }`}
            >
              {initials(s)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--border)] px-3 py-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
          <Users size={13} /> Scholars {scholars ? `(${scholars.length})` : ''}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--surface)]"
          title="Collapse"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Not `.admin-search` — that class sets `flex: 1 1 360px` for a
          horizontal toolbar; inside this vertical sidebar the 360px basis
          applies to height instead of width, ballooning the search bar. */}
      <label className="soft-panel mx-3 mt-3 flex h-9 shrink-0 items-center gap-2 rounded-full px-3">
        <Search size={13} className="shrink-0 text-[color:var(--muted)]" />
        <input
          className="w-full bg-transparent text-xs outline-none placeholder:text-[color:var(--muted)]"
          placeholder="Search scholars…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      <div className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {scholars === null ? (
          <div className="grid h-32 place-items-center"><Loader2 size={18} className="animate-spin text-[color:var(--accent)]" /></div>
        ) : sorted.length === 0 ? (
          <p className="p-4 text-center text-xs text-[color:var(--secondary)]">No scholars match &quot;{search}&quot;</p>
        ) : (
          sorted.map((s) => (
            <ScholarRow
              key={s.user_id}
              rowRef={(el) => { rowRefs.current[s.user_id] = el }}
              scholar={s}
              expanded={expandedId === s.user_id}
              onToggle={() => toggleScholar(s.user_id)}
              subs={subsById[s.user_id]}
              activeSubmissionId={activeSubmissionId}
              onOpenSubmission={openSubmission}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ScholarRow({ scholar: s, expanded, onToggle, subs, activeSubmissionId, onOpenSubmission, rowRef }) {
  const isActiveScholar = Array.isArray(subs) && subs.some((sub) => sub.id === activeSubmissionId)
  return (
    <div ref={rowRef} className="rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition ${
          expanded || isActiveScholar ? 'bg-[color:var(--accent-tint)]' : 'hover:bg-[color:var(--surface)]'
        }`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[10px] font-bold text-[color:var(--accent)]">
          {initials(s)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-[color:var(--text)]">{fullName(s)}</span>
          <span className="block truncate text-[11px] text-[color:var(--secondary)]">{s.batch_name || s.batch_code || '—'}</span>
        </span>
        {Array.isArray(subs) && needsAttention(subs) && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Has submissions awaiting review" />
        )}
        <ChevronDown size={13} className={`shrink-0 text-[color:var(--muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="ml-3 mt-1 space-y-2 border-l border-[color:var(--border)] pl-3">
          {subs === 'loading' || subs === undefined ? (
            <div className="grid h-16 place-items-center"><Loader2 size={14} className="animate-spin text-[color:var(--accent)]" /></div>
          ) : (
            CATEGORIES.map((cat) => {
              const items = subs.filter((sub) => sub.submission_type === cat.type)
              return (
                <div key={cat.type}>
                  <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">
                    {cat.label} {items.length ? `(${items.length})` : ''}
                  </p>
                  {items.length === 0 ? (
                    <p className="px-1 py-1 text-[11px] text-[color:var(--muted)]">None yet</p>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {items.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => onOpenSubmission(sub, items.map((i) => i.id))}
                          className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition ${
                            sub.id === activeSubmissionId
                              ? 'bg-[color:var(--accent)] text-white'
                              : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {sub.title || `Semester ${sub.semester || 1}`}
                            <span className={`block text-[10px] ${sub.id === activeSubmissionId ? 'text-white/70' : 'text-[color:var(--muted)]'}`}>
                              {formatDate(sub.submitted_at || sub.created_at)}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            {sub.has_feedback && (
                              <MessageSquare
                                size={11}
                                className={sub.id === activeSubmissionId ? 'text-white/80' : 'text-sky-500'}
                                title="Feedback given"
                              />
                            )}
                            {sub.id === activeSubmissionId ? (
                              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold capitalize">
                                {sub.status?.replaceAll('_', ' ')}
                              </span>
                            ) : (
                              <StatusBadge status={sub.status} />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
