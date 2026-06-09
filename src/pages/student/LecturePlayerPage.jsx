import { ArrowLeft, CheckCircle2, ChevronRight, Clock, PlayCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createSession, getProgress, getVideoById, getVideos } from '../../api/services/videoService.js'
import SecureVideoPlayer from '../../components/shared/SecureVideoPlayer.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useUiStore } from '../../store/uiStore.js'

const fmtDuration = (sec) => {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function LecturePlayerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useUiStore((s) => s.addToast)

  const [video, setVideo]       = useState(null)
  const [session, setSession]   = useState(null) // { token, expires_at }
  const [progress, setProgress] = useState(null)
  const [queue, setQueue]       = useState([])   // other videos in same course
  const [loading, setLoading]   = useState(true)
  const [streamError, setStreamError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setSession(null)
    setStreamError(null)

    Promise.all([getVideoById(id), getProgress(id)]).then(async ([vr, pr]) => {
      if (!vr.data) { navigate('/student/lectures'); return }
      setVideo(vr.data)
      setProgress(pr.data)

      // Load sibling videos for the queue
      getVideos({ course_id: vr.data.course_id, is_published: true }).then((r) =>
        setQueue((r.data || []).filter((v) => v.id !== id))
      )

      // Create streaming session
      try {
        const sr = await createSession(id)
        setSession(sr.data)
      } catch (err) {
        const msg = err.response?.data?.message || 'Could not start stream'
        setStreamError(msg)
        addToast({ type: 'error', title: 'Stream error', message: msg })
      } finally {
        setLoading(false)
      }
    })
  }, [id])

  const handleProgress = (pos, dur) => {
    setProgress((p) => p ? {
      ...p,
      last_position: pos,
      total_watch_sec: p.total_watch_sec + 1,
      completed: dur > 0 && pos >= dur * 0.9,
    } : p)
  }

  if (loading) return <SkeletonCard rows={8} />
  if (!video) return null

  const pct = progress && video.duration_sec > 0
    ? Math.min(100, Math.round((progress.last_position / video.duration_sec) * 100))
    : 0

  return (
    <div className="fade-page">
      {/* Back nav */}
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/student/lectures"
          className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
        >
          <ArrowLeft size={15} /> Back to Gallery
        </Link>
        <span className="text-xs text-[color:var(--muted)]">{video.course_name} · {video.course_code}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Left: Player + Info ── */}
        <div className="space-y-5">
          {/* Player */}
          {streamError ? (
            <div className="card flex aspect-video items-center justify-center rounded-2xl bg-black text-center">
              <div>
                <PlayCircle size={48} className="mx-auto text-white/20" />
                <p className="mt-4 font-semibold text-white/60">Stream unavailable</p>
                <p className="mt-2 text-sm text-white/40">{streamError}</p>
              </div>
            </div>
          ) : session ? (
            <SecureVideoPlayer
              videoId={id}
              sessionToken={session.token}
              durationSec={video.duration_sec}
              startPosition={progress?.last_position || 0}
              onProgress={handleProgress}
              onEnded={() => addToast({ type: 'success', title: 'Lecture completed!', message: video.title })}
              className="w-full"
            />
          ) : (
            <div className="card flex aspect-video items-center justify-center bg-black rounded-2xl">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            </div>
          )}

          {/* Progress bar */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-[color:var(--text)]">{video.title}</h1>
                {video.uploaded_by_name && (
                  <p className="mt-1 text-sm text-[color:var(--secondary)]">by {video.uploaded_by_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {progress?.completed && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={12} /> Completed
                  </span>
                )}
                <span className="text-sm text-[color:var(--muted)] flex items-center gap-1">
                  <Clock size={13} /> {fmtDuration(video.duration_sec)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-[color:var(--secondary)] mb-1.5">
                <span>Watch progress</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                <div
                  className={`h-full rounded-full transition-all ${progress?.completed ? 'bg-emerald-500' : 'bg-[color:var(--accent)]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {video.description && (
              <p className="mt-4 text-sm leading-6 text-[color:var(--secondary)]">{video.description}</p>
            )}
          </div>
        </div>

        {/* ── Right: Lecture Queue ── */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <h2 className="font-semibold text-[color:var(--text)]">Course Lectures</h2>
              <p className="text-xs text-[color:var(--secondary)]">{queue.length} more in {video.course_code}</p>
            </div>
            <div className="divide-y divide-[color:var(--border)] max-h-[calc(100vh-280px)] overflow-auto overscroll-contain">
              {/* Current video (highlighted) */}
              <div className="flex items-center gap-3 bg-[color:var(--accent-tint)] px-5 py-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--accent)] text-white">
                  <PlayCircle size={17} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[color:var(--accent)]">{video.title}</p>
                  <p className="text-xs text-[color:var(--accent)] opacity-70">{fmtDuration(video.duration_sec)} · Now playing</p>
                </div>
              </div>

              {queue.map((v) => (
                <Link
                  key={v.id}
                  to={`/student/lectures/${v.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-[color:var(--surface)] transition group"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--surface-strong)] text-[color:var(--secondary)] group-hover:bg-[color:var(--accent-tint)] group-hover:text-[color:var(--accent)] transition">
                    <PlayCircle size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--text)]">{v.title}</p>
                    <p className="text-xs text-[color:var(--muted)]">{fmtDuration(v.duration_sec)}</p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-[color:var(--muted)] group-hover:text-[color:var(--accent)]" />
                </Link>
              ))}

              {queue.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-[color:var(--secondary)]">
                  No other lectures in this course yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
