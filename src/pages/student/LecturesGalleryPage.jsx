import { BookOpen, CheckCircle2, Circle, Clock, Play, PlayCircle, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVideos } from '../../api/services/videoService.js'
import { getProgress } from '../../api/services/videoService.js'
import { getCourses } from '../../api/services/courseService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useCourseStore } from '../../store/courseStore.js'

const SORT_OPTIONS = [
  { value: 'latest',   label: 'Latest' },
  { value: 'oldest',   label: 'Oldest' },
  { value: 'az',       label: 'A → Z' },
]

const fmtDuration = (sec) => {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const watchStatus = (log) => {
  if (!log) return 'unwatched'
  if (log.completed) return 'completed'
  if (log.total_watch_sec > 0) return 'in_progress'
  return 'unwatched'
}

const StatusBadgeVideo = ({ log }) => {
  const s = watchStatus(log)
  const map = {
    completed:   'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-amber-100 text-amber-700',
    unwatched:   'bg-[color:var(--surface)] text-[color:var(--muted)]',
  }
  const labels = { completed: 'Completed', in_progress: 'In Progress', unwatched: 'Unwatched' }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[s]}`}>
      {labels[s]}
    </span>
  )
}

export default function LecturesGalleryPage() {
  const [videos, setVideos]       = useState(null)
  const [courses, setCourses]     = useState([])
  const [progressMap, setProgress]= useState({}) // videoId → watchLog
  const [search, setSearch]       = useState('')
  const [courseFilter, setCourse] = useState('all')
  const [sort, setSort]           = useState('latest')
  const [filtersOpen, setFilters] = useState(false)
  const { currentCourse } = useCourseStore()
  const navigate = useNavigate()

  useEffect(() => {
    const params = { is_published: true }
    if (currentCourse?.id) params.course_id = currentCourse.id
    getVideos(params).then(async (r) => {
      const vids = r.data || []
      setVideos(vids)
      // Fetch progress for each video in parallel
      const logs = await Promise.all(vids.map((v) => getProgress(v.id).then((p) => [v.id, p.data])))
      setProgress(Object.fromEntries(logs))
    })
    getCourses({ is_active: true }).then((r) => setCourses(r.data || []))
  }, [currentCourse?.id])

  const filtered = useMemo(() => {
    if (!videos) return []
    let list = [...videos]
    if (courseFilter !== 'all') list = list.filter((v) => v.course_id === courseFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((v) => v.title.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q) || v.uploaded_by_name?.toLowerCase().includes(q))
    }
    if (sort === 'latest') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    if (sort === 'az')     list.sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [videos, search, courseFilter, sort])

  // Group by course
  const grouped = useMemo(() => {
    const map = {}
    for (const v of filtered) {
      const key = v.course_id
      if (!map[key]) map[key] = { course_name: v.course_name, course_code: v.course_code, videos: [] }
      map[key].videos.push(v)
    }
    return Object.values(map)
  }, [filtered])

  const stats = useMemo(() => {
    if (!videos) return {}
    const total = videos.length
    const completed = videos.filter((v) => progressMap[v.id]?.completed).length
    const inProgress = videos.filter((v) => watchStatus(progressMap[v.id]) === 'in_progress').length
    return { total, completed, inProgress }
  }, [videos, progressMap])

  if (!videos) return <SkeletonCard rows={6} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Lecture Gallery"
        subtitle="Watch your course lectures, track progress, and resume where you left off."
      />

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          ['Total Lectures', stats.total, BookOpen, 'text-[color:var(--accent)]'],
          ['Completed',      stats.completed, CheckCircle2, 'text-emerald-600'],
          ['In Progress',    stats.inProgress, PlayCircle, 'text-amber-500'],
        ].map(([label, val, Icon, cls]) => (
          <div key={label} className="card p-4 text-center">
            <Icon size={20} className={`mx-auto ${cls}`} />
            <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{val}</p>
            <p className="text-xs text-[color:var(--secondary)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="flex h-11 flex-1 min-w-[200px] items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4">
          <Search size={15} className="text-[color:var(--muted)] shrink-0" />
          <input className="w-full bg-transparent text-sm outline-none" placeholder="Search by title, description, or faculty…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <select className="input h-11 cursor-pointer pr-8 text-sm" value={courseFilter} onChange={(e) => setCourse(e.target.value)}>
          <option value="all">All Courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
        <select className="input h-11 cursor-pointer pr-8 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {grouped.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-20 text-center">
          <BookOpen size={40} className="text-[color:var(--accent)] opacity-30" />
          <p className="font-semibold text-[color:var(--text)]">No lectures found</p>
          <p className="text-sm text-[color:var(--secondary)]">
            {search ? 'Try a different search term.' : 'No published lectures for this course yet.'}
          </p>
        </div>
      ) : (
        grouped.map(({ course_name, course_code, videos: vids }) => (
          <section key={course_code} className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--accent-tint)]">
                <BookOpen size={15} className="text-[color:var(--accent)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[color:var(--text)]">{course_name}</h2>
                <p className="text-xs font-bold text-[color:var(--accent)] tracking-wide">{course_code}</p>
              </div>
              <span className="ml-auto text-xs text-[color:var(--muted)]">{vids.length} lecture{vids.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {vids.map((video) => {
                const log = progressMap[video.id]
                const pct = log && video.duration_sec > 0
                  ? Math.min(100, Math.round((log.last_position / video.duration_sec) * 100))
                  : 0
                const status = watchStatus(log)

                return (
                  <div
                    key={video.id}
                    className="card card-hover group cursor-pointer overflow-hidden flex flex-col"
                    onClick={() => navigate(`/student/lectures/${video.id}`)}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-hover)] overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-[color:var(--accent)] shadow-lg">
                          <Play size={24} fill="currentColor" />
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-white">
                          <Play size={22} className="group-hover:opacity-0 transition-opacity" />
                        </div>
                      </div>
                      {/* Duration badge */}
                      <span className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
                        {fmtDuration(video.duration_sec)}
                      </span>
                      {/* Status badge */}
                      <span className="absolute top-2 left-2">
                        <StatusBadgeVideo log={log} />
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="line-clamp-2 font-semibold text-[color:var(--text)]">{video.title}</h3>
                      {video.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-[color:var(--secondary)]">{video.description}</p>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-xs text-[color:var(--muted)]">
                        {video.uploaded_by_name && (
                          <>
                            <span className="font-medium text-[color:var(--secondary)]">{video.uploaded_by_name}</span>
                            <span>·</span>
                          </>
                        )}
                        <Clock size={11} />
                        <span>{fmtDuration(video.duration_sec)}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[color:var(--secondary)]">
                            {status === 'unwatched' ? 'Not started' : status === 'completed' ? 'Completed' : `${pct}% watched`}
                          </span>
                          {status === 'completed' && <CheckCircle2 size={13} className="text-emerald-600" />}
                          {status === 'in_progress' && <Circle size={13} className="text-amber-500" />}
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                          <div
                            className={`h-full rounded-full transition-all ${status === 'completed' ? 'bg-emerald-500' : status === 'in_progress' ? 'bg-amber-400' : 'bg-[color:var(--border)]'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
