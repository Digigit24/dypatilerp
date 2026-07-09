import { BookOpen, Check, ChevronDown, Layers } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getCourses } from '../../api/services/courseService.js'
import { getBatches } from '../../api/services/batchService.js'
import { useCourseStore } from '../../store/courseStore.js'
import { usePermStore } from '../../store/permStore.js'
import { USE_MOCK } from '../../api/config.js'

export default function CourseSwitcher() {
  const { courses, currentCourse, currentBatch, setCourses, setCurrentCourse, setCurrentBatch } = useCourseStore()
  const [open, setOpen] = useState(false)
  const [batches, setBatches] = useState([])
  const ref = useRef(null)
  // /courses needs courses:read (guide/mentor lack it). Gate so it never 403s.
  const canReadCourses = usePermStore((s) => s.can('courses', 'read'))

  // Load courses — only for roles allowed to read them; non-blocking.
  useEffect(() => {
    if (USE_MOCK || !canReadCourses) return
    getCourses({ is_active: true }).then((r) => {
      if (r.data?.length) setCourses(r.data)
    }).catch(() => {})
  }, [canReadCourses])

  // Load batches for current course
  useEffect(() => {
    if (!currentCourse || USE_MOCK) return
    getBatches({ course_id: currentCourse.id }).then((r) => setBatches(r.data || []))
  }, [currentCourse?.id])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!currentCourse) return null

  const shortName = currentCourse.code?.split('-')[0] || currentCourse.name?.slice(0, 4)

  return (
    <div className="relative" ref={ref}>
      <button
        className="soft-panel mobile-hide flex h-14 shrink-0 items-center gap-3 rounded-2xl px-4 text-left text-sm"
        onClick={() => setOpen((v) => !v)}
      >
        <BookOpen size={17} className="text-[color:var(--accent)] shrink-0" />
        <span className="min-w-0">
          <span className="block font-semibold text-[color:var(--text)] truncate max-w-[140px]">
            {currentCourse.name}
          </span>
          <span className="block text-xs text-[color:var(--secondary)]">
            {currentBatch ? currentBatch.name : 'All Batches'}
          </span>
        </span>
        <ChevronDown size={14} className={`text-[color:var(--muted)] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-3xl bg-[color:var(--card)] shadow-hover ring-1 ring-[color:var(--border)]">
          {/* Course list */}
          <div className="border-b border-[color:var(--border)] p-2">
            <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Courses
            </p>
            {courses.map((c) => (
              <button
                key={c.id}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                  currentCourse.id === c.id
                    ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]'
                    : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'
                }`}
                onClick={() => { setCurrentCourse(c); setOpen(false) }}
              >
                <BookOpen size={15} className="shrink-0" />
                <span className="flex-1 text-left truncate">{c.name}</span>
                <span className="shrink-0 text-[10px] font-bold opacity-60">{c.code}</span>
                {currentCourse.id === c.id && <Check size={13} className="shrink-0" />}
              </button>
            ))}
          </div>

          {/* Batch list for selected course */}
          {batches.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Batch
              </p>
              <button
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                  !currentBatch ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'
                }`}
                onClick={() => { setCurrentBatch(null); setOpen(false) }}
              >
                <Layers size={15} className="shrink-0" />
                <span className="flex-1 text-left">All Batches</span>
                {!currentBatch && <Check size={13} className="shrink-0" />}
              </button>
              {batches.map((b) => (
                <button
                  key={b.id}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                    currentBatch?.id === b.id
                      ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]'
                      : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'
                  }`}
                  onClick={() => { setCurrentBatch(b); setOpen(false) }}
                >
                  <Layers size={15} className="shrink-0" />
                  <span className="flex-1 text-left truncate">{b.name}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {b.status}
                  </span>
                  {currentBatch?.id === b.id && <Check size={13} className="shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
