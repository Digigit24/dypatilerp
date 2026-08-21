import { FileText, Loader2, Search, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getStudents } from '../../api/services/studentService.js'
import OfficialLettersDrawer from '../../components/admin/OfficialLettersDrawer.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { useCourseStore } from '../../store/courseStore.js'
import { useLabels } from '../../store/labelStore.js'

const PAGE_SIZE = 100

const dedupeBy = (rows, key) => {
  const seen = new Set()
  const out = []
  for (const r of rows) { const k = r?.[key]; if (k != null && !seen.has(k)) { seen.add(k); out.push(r) } }
  return out
}

export default function OfficialLettersPage() {
  const labels = useLabels()
  const { currentCourse, currentBatch } = useCourseStore()

  const [items, setItems]             = useState(null)
  const [total, setTotal]             = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadedRef    = useRef(0)
  const inFlightRef  = useRef(false)
  const sentinelRef  = useRef(null)
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState(null) // row -> drawer target

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

  const nameOf = (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—'
  const initials = (s) => nameOf(s).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

  const q = search.trim().toLowerCase()
  const filtered = (items || []).filter((s) => !q
    || nameOf(s).toLowerCase().includes(q)
    || (s.email || '').toLowerCase().includes(q)
    || (s.permanent_id || '').toLowerCase().includes(q))

  if (!items) return <SkeletonCard rows={8} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Official Letters"
        subtitle={`Upload and issue Admission Confirmation, Guide Approval and Title Approval letters for each ${labels.student?.toLowerCase() || 'scholar'}.`}
      />

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
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                {['Name', 'Permanent ID', 'Batch', 'Status'].map((h) => <th key={h} className="px-6 py-4">{h}</th>)}
                <th className="px-6 py-4 text-right">Letters</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-sm text-[color:var(--muted)]">
                    <Users className="mx-auto mb-3 text-[color:var(--border)]" size={32} />
                    No scholars found.
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="table-row cursor-pointer border-b border-[color:var(--border)] transition"
                  onClick={() => setSelected(s)}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-sm font-semibold text-[color:var(--accent)]">
                        {initials(s)}
                      </div>
                      <div>
                        <p className="font-semibold text-[color:var(--text)]">{nameOf(s)}</p>
                        <p className="text-xs text-[color:var(--secondary)]">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 text-[color:var(--secondary)]">{s.permanent_id}</td>
                  <td className="px-6 text-[color:var(--secondary)]">{s.batch_name || s.batch_id}</td>
                  <td className="px-6"><StatusBadge status={s.status} /></td>
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
              ))}
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
