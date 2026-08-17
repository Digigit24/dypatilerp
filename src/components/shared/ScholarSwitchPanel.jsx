/**
 * ScholarSwitchPanel — right-side slide-over replacing the old "All Scholars"
 * back button on the admin scholar detail page. Search + status filter over
 * the same GET /students the Students list uses, with the current scholar
 * pinned to the top. Picking a row navigates (`replace`) instead of closing
 * the panel, so switching between several scholars in a row never leaves this
 * page or re-opens the panel each time.
 *
 * Deliberately reuses the app's standard .drawer-panel chrome (used by the
 * submission-detail drawer, research-item drawer, import drawer) rather than
 * inventing a new visual pattern for "a panel on the right".
 */
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getStudents } from '../../api/services/studentService.js'
import { useLabels } from '../../store/labelStore.js'
import SkeletonCard from './SkeletonCard.jsx'
import StatusBadge from './StatusBadge.jsx'

const STATUS_TABS = [
  { key: 'active',    label: 'Active' },
  { key: 'all',       label: 'All' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'withdrawn', label: 'Archived' },
]

const fullName = (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—'
const initialsOf = (s) => fullName(s).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

export default function ScholarSwitchPanel({ currentUserId, onClose, onSelect }) {
  const labels = useLabels()
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('active')
  const [items,    setItems]    = useState(null)
  const [total,    setTotal]    = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced fetch — keeps the previous list visible (dimmed) while a new
  // search/filter request is in flight instead of flashing to empty. `pending`
  // flips true from the input/tab handlers below (a user action), not from
  // inside this effect, so there's nothing here but the async fetch itself.
  const [pending, setPending] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => {
      const params = { limit: 60, offset: 0 }
      if (search.trim()) params.search = search.trim()
      if (status !== 'all') params.status = status
      getStudents(params)
        .then((r) => { setItems(r.data || []); setTotal(r.total ?? (r.data || []).length) })
        .catch(() => setItems([]))
        .finally(() => setPending(false))
    }, 300)
    return () => clearTimeout(t)
  }, [search, status])

  // Current scholar pinned to the top so it's obvious which one you're on.
  const ordered = useMemo(() => {
    if (!items) return null
    const mine = items.filter((s) => s.user_id === currentUserId)
    const rest = items.filter((s) => s.user_id !== currentUserId)
    return [...mine, ...rest]
  }, [items, currentUserId])

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="drawer-panel lg:!w-[min(440px,calc(100vw-32px))] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Switch {labels.student}</p>
            <h2 className="mt-1 text-lg font-semibold text-[color:var(--text)]">{total} {total === 1 ? labels.student : labels.studentPlural}</h2>
          </div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)] text-[color:var(--secondary)] hover:bg-[color:var(--border)]" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 space-y-3 border-b border-[color:var(--border)] p-4">
          <label className="admin-search soft-panel flex h-10 items-center gap-2 rounded-full px-4">
            <Search size={15} className="text-[color:var(--muted)]" />
            <input
              ref={inputRef}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"
              placeholder="Search by name, email or enrollment no…"
              value={search}
              onChange={(e) => { setPending(true); setSearch(e.target.value) }}
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setPending(true); setStatus(t.key) }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${status === t.key ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--surface)] text-[color:var(--secondary)] hover:bg-[color:var(--border)]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`flex-1 overflow-auto overscroll-contain transition-opacity ${pending ? 'opacity-60' : ''}`}>
          {items === null ? (
            <div className="p-4"><SkeletonCard rows={5} /></div>
          ) : ordered.length === 0 ? (
            <p className="p-8 text-center text-sm text-[color:var(--secondary)]">
              {search ? `No ${labels.studentPlural.toLowerCase()} match "${search}"` : `No ${labels.studentPlural.toLowerCase()} found.`}
            </p>
          ) : (
            ordered.map((s) => {
              const isCurrent = s.user_id === currentUserId
              return (
                <button
                  key={s.user_id}
                  type="button"
                  disabled={isCurrent}
                  className={`flex w-full items-center gap-3 border-b border-[color:var(--border)] px-4 py-3 text-left transition ${isCurrent ? 'cursor-default bg-[color:var(--accent-tint)]' : 'hover:bg-[color:var(--surface)]'}`}
                  onClick={() => onSelect(s)}
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--surface-strong)] text-xs font-bold text-[color:var(--secondary)]">
                    {initialsOf(s)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--text)]">
                      {fullName(s)} {isCurrent && <span className="text-xs font-normal text-[color:var(--accent)]">(current)</span>}
                    </p>
                    <p className="truncate text-xs text-[color:var(--secondary)]">{s.enrollment_number || s.email}{s.batch_name ? ` · ${s.batch_name}` : ''}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
