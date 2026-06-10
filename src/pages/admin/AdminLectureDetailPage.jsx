/**
 * AdminLectureDetailPage — enterprise-grade lecture detail view.
 */
import {
  ArrowLeft, BarChart2, BookOpen, Calendar, CheckCircle2, Clock,
  Eye, HardDrive, Info, Loader, PlayCircle, Shield, TrendingUp,
  Users, Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  buildThumbnailUrl, createSession, getVideoAnalytics, getVideoById,
} from '../../api/services/videoService.js'
import SecureVideoPlayer from '../../components/shared/SecureVideoPlayer.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { formatDate } from '../../lib/formatters.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDur = (sec) => {
  if (!sec) return '--:--'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}
const fmtBytes = (b) => {
  if (!b) return '—'
  return b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`
}
const fmtSec = (s) => {
  if (!s) return '0s'
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return m > 0 ? `${m}m ${r}s` : `${r}s`
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`h-11 w-11 shrink-0 rounded-xl ${bg} grid place-items-center`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[color:var(--text)]">{value}</p>
        <p className="text-xs text-[color:var(--muted)]">{label}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminLectureDetailPage() {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const location      = useLocation()
  // Set when returning from Picture-in-Picture via "Back to tab"
  const pipResumeAt   = location.state?.pipResumeAt ?? 0

  const [video,     setVideo]     = useState(null)
  const [session,   setSession]   = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [aLoading,  setALoading]  = useState(true)
  const [streamErr, setStreamErr] = useState(null)
  const [tab,       setTab]       = useState('analytics')

  useEffect(() => {
    setLoading(true)
    setSession(null)
    setStreamErr(null)

    getVideoById(id).then(async (vr) => {
      if (!vr.data) { navigate('/admin/lectures'); return }
      setVideo(vr.data)
      setLoading(false)
      try {
        const sr = await createSession(id)
        setSession(sr.data)
      } catch (err) {
        setStreamErr(err.response?.data?.message || 'Could not start stream')
      }
    })

    setALoading(true)
    getVideoAnalytics(id)
      .then((r) => setAnalytics(r.data))
      .catch(() => setAnalytics(null))
      .finally(() => setALoading(false))
  }, [id])

  if (loading) return <SkeletonCard rows={10} />
  if (!video) return null

  const posterUrl      = session?.poster_url || buildThumbnailUrl(id)
  const completionRate = analytics?.total_viewers > 0
    ? Math.round((analytics.completions / analytics.total_viewers) * 100)
    : 0

  return (
    <div className="fade-page space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/admin/lectures')}
          className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
        >
          <ArrowLeft size={15} /> Lectures
        </button>
        <span className="hidden sm:block text-sm text-[color:var(--muted)]">/</span>
        <span className="hidden sm:block text-sm font-semibold text-[color:var(--text)] truncate max-w-[220px]">{video.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-mono text-[color:var(--muted)]">{video.course_code}</span>
          {video.is_published ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={10} /> Published
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Draft</span>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">

        {/* LEFT */}
        <div className="space-y-4 min-w-0">

          {/* Player area */}
          <div className="group relative">
            {streamErr ? (
              <div className="aspect-video flex flex-col items-center justify-center rounded-xl bg-[#0a0f1a] gap-4">
                <div className="h-16 w-16 rounded-full bg-white/5 grid place-items-center">
                  <PlayCircle size={32} className="text-white/20" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white/60 text-sm">Preview unavailable</p>
                  <p className="mt-1 text-xs text-white/30">{streamErr}</p>
                </div>
              </div>
            ) : session ? (
              <SecureVideoPlayer
                videoId={id}
                sessionToken={session.token}
                posterUrl={posterUrl}
                durationSec={video.duration_sec}
                startPosition={pipResumeAt}
                autoplay={pipResumeAt > 0}
                className="w-full shadow-2xl"
              />
            ) : (
              <div className="aspect-video flex items-center justify-center rounded-xl bg-[#0a0f1a]">
                <div className="flex flex-col items-center gap-3">
                  <Loader size={28} className="animate-spin text-indigo-400/60" />
                  <p className="text-xs text-white/30">Initialising player…</p>
                </div>
              </div>
            )}

            {/* Keyboard hint tooltip */}
            {session && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex gap-2 rounded-lg bg-black/70 px-3 py-1.5 text-[10px] text-white/50 backdrop-blur-sm whitespace-nowrap">
                  <span>Space play/pause</span><span>·</span>
                  <span>← → ±10s</span><span>·</span>
                  <span>↑↓ volume</span><span>·</span>
                  <span>F fullscreen</span><span>·</span>
                  <span>M mute</span>
                </div>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-[color:var(--text)] leading-tight">{video.title}</h1>
                {video.uploaded_by_name && (
                  <p className="mt-1 text-sm text-[color:var(--secondary)]">
                    by <span className="font-semibold">{video.uploaded_by_name}</span>
                  </p>
                )}
              </div>
              {video.duration_sec > 0 && (
                <span className="shrink-0 rounded-md border border-[color:var(--border)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent)] tracking-widest">HD</span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[color:var(--secondary)]">
              <span className="flex items-center gap-1.5"><Clock size={13} className="text-[color:var(--accent)]" />{fmtDur(video.duration_sec)}</span>
              <span className="flex items-center gap-1.5"><BookOpen size={13} className="text-[color:var(--accent)]" />{video.course_name} ({video.course_code})</span>
              {video.file_size > 0 && <span className="flex items-center gap-1.5"><HardDrive size={13} className="text-[color:var(--accent)]" />{fmtBytes(video.file_size)}</span>}
              <span className="flex items-center gap-1.5"><Calendar size={13} className="text-[color:var(--accent)]" />{formatDate(video.created_at)}</span>
              <span className="flex items-center gap-1.5"><Shield size={13} className="text-[color:var(--accent)]" />DRM-lite stream</span>
            </div>

            {video.description && (
              <p className="text-sm leading-relaxed text-[color:var(--secondary)] border-t border-[color:var(--border)] pt-4">
                {video.description}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-[color:var(--surface)] p-1 gap-1">
            {[['analytics', BarChart2, 'Analytics'], ['details', Info, 'Details']].map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  tab === key ? 'bg-[color:var(--card)] text-[color:var(--accent)] shadow-sm' : 'text-[color:var(--secondary)] hover:text-[color:var(--text)]'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Analytics */}
          {tab === 'analytics' && (
            <div className="space-y-4">
              {aLoading ? (
                <div className="card flex items-center justify-center py-16">
                  <Loader size={22} className="animate-spin text-[color:var(--accent)]" />
                </div>
              ) : !analytics ? (
                <div className="card p-6 text-center text-sm text-[color:var(--secondary)]">Analytics unavailable.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={Eye}          label="Total Viewers"   value={analytics.total_viewers}          color="text-blue-600"    bg="bg-blue-50" />
                    <StatCard icon={CheckCircle2} label="Completions"     value={analytics.completions}            color="text-emerald-600" bg="bg-emerald-50" />
                    <StatCard icon={TrendingUp}   label="Completion Rate" value={`${completionRate}%`}             color="text-violet-600"  bg="bg-violet-50" />
                    <StatCard icon={Zap}          label="Avg Watch Time"  value={fmtSec(analytics.avg_position)}  color="text-amber-600"   bg="bg-amber-50" />
                  </div>

                  {/* Student watch log */}
                  <div className="card overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-5 py-4">
                      <Users size={14} className="text-[color:var(--accent)]" />
                      <h3 className="font-semibold text-[color:var(--text)] text-sm">Student Activity</h3>
                      <span className="ml-auto text-xs text-[color:var(--muted)]">{analytics.watch_logs?.length || 0} students</span>
                    </div>

                    {!analytics.watch_logs?.length ? (
                      <div className="px-5 py-10 text-center">
                        <Eye size={28} className="mx-auto mb-2 text-[color:var(--muted)] opacity-30" />
                        <p className="text-sm text-[color:var(--secondary)]">No views yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[color:var(--border)] max-h-[440px] overflow-auto overscroll-contain">
                        {analytics.watch_logs.map((log) => {
                          const pct = video.duration_sec > 0
                            ? Math.min(100, Math.round((log.last_position / video.duration_sec) * 100))
                            : 0
                          return (
                            <div key={log.id} className="px-5 py-3.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[color:var(--text)]">{log.student_name}</p>
                                  <p className="truncate text-xs text-[color:var(--muted)]">{log.email}</p>
                                </div>
                                {log.completed ? (
                                  <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                    <CheckCircle2 size={10} /> Done
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-xs font-bold text-[color:var(--secondary)]">{pct}%</span>
                                )}
                              </div>
                              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                                <div
                                  className={`h-full rounded-full ${log.completed ? 'bg-emerald-500' : 'bg-[color:var(--accent)]'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="mt-1 flex justify-between text-[10px] text-[color:var(--muted)]">
                                <span>{fmtSec(log.total_watch_sec)} watched</span>
                                <span>stopped at {fmtDur(log.last_position)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Details */}
          {tab === 'details' && (
            <div className="card overflow-hidden divide-y divide-[color:var(--border)]">
              {[
                ['Course',      video.course_name,                          BookOpen],
                ['Course Code', video.course_code,                          null],
                ['Batch',       video.batch_name || 'All batches',          null],
                ['Duration',    fmtDur(video.duration_sec),                 Clock],
                ['File Size',   fmtBytes(video.file_size),                  HardDrive],
                ['Sort Order',  video.sort_order ?? '—',                    null],
                ['Added',       formatDate(video.created_at),               Calendar],
                ['Status',      video.is_published ? 'Published' : 'Draft', null],
              ].map(([label, val, Icon]) => (
                <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] shrink-0">
                    {Icon && <Icon size={11} />}{label}
                  </span>
                  <span className="text-sm font-medium text-[color:var(--text)] text-right truncate">{val}</span>
                </div>
              ))}
              {video.object_key && (
                <div className="px-5 py-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] mb-1.5">Object Key</p>
                  <p className="break-all text-xs font-mono text-[color:var(--secondary)] leading-relaxed">{video.object_key}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
