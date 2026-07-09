/**
 * Admin Dashboard — fully API-driven, scoped to the course selected in the
 * app header (X-Course-Id attaches automatically to every request).
 */
import {
  Activity, ArrowRight, Bell, ClipboardCheck, ClipboardList, FileDown, FileText,
  GraduationCap, IndianRupee, Kanban, PlayCircle, TrendingUp, UserPlus, Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../api/http.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useCourseStore } from '../../store/courseStore.js'
import { useLabels } from '../../store/labelStore.js'
import { usePermStore } from '../../store/permStore.js'
import { useUiStore } from '../../store/uiStore.js'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const PIPELINE_ORDER = ['submitted', 'shortlisted_test', 'test_pending', 'test_completed', 'shortlisted', 'enrolled', 'rejected']
const PIPELINE_LABELS = {
  submitted: 'Applied', shortlisted_test: 'Shortlisted for Test', test_pending: 'Test Sent',
  test_completed: 'Test Submitted', shortlisted: 'Final Shortlist', enrolled: 'Enrolled', rejected: 'Rejected',
}
const PIPELINE_COLORS = {
  submitted: 'bg-slate-400', shortlisted_test: 'bg-indigo-400', test_pending: 'bg-amber-400',
  test_completed: 'bg-blue-400', shortlisted: 'bg-violet-400', enrolled: 'bg-emerald-500', rejected: 'bg-red-400',
}

export default function AdminDashboard() {
  const [d, setD] = useState(null)
  const [error, setError] = useState(null)
  const currentUser = useAuthStore((s) => s.currentUser)
  const { currentCourse, currentBatch } = useCourseStore()
  const labels = useLabels()
  const can = usePermStore((s) => s.can)
  // Subscribe to `loaded` so the dashboard re-renders once permissions resolve
  // (selecting only `can`, a stable fn ref, would not trigger a re-render).
  const permsLoaded = usePermStore((s) => s.loaded)
  const addToast = useUiStore((s) => s.addToast)
  const navigate = useNavigate()

  useEffect(() => {
    setD(null)
    setError(null)
    http.get('/dashboard/admin')
      .then(({ data: res }) => setD(res.data))
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load dashboard')
        addToast({ type: 'error', title: 'Dashboard failed to load', message: err.response?.data?.message })
        setD({})
      })
    // Refetch when the active course OR batch changes. The X-Batch-Id header
    // (attached automatically) scopes everything to the selected batch; clearing
    // it back to "All Batches" restores the course-wide overview.
  }, [currentCourse?.id, currentBatch?.id])

  // Wait for BOTH dashboard data and permissions so cards are gated correctly on
  // first paint (no flash of restricted cards before can() knows the grants).
  if (!d || !permsLoaded) return <SkeletonCard rows={8} />

  const firstName = currentUser?.first_name ?? 'there'

  if (error) {
    return (
      <div className="fade-page">
        <PageHeader title={`${greeting()}, ${firstName}`} subtitle="Dashboard" />
        <div className="card p-14 text-center text-sm text-[color:var(--secondary)]">{error} — please retry.</div>
      </div>
    )
  }

  const feesPct = d.fees?.total_due > 0 ? Math.round((d.fees.total_paid / d.fees.total_due) * 100) : 0
  const maxMonthly = Math.max(1, ...(d.monthly_applicants || []).map((m) => m.count))
  const statusMap = Object.fromEntries((d.applicants_by_status || []).map((r) => [r.status, r.count]))
  const pipelineMax = Math.max(1, ...Object.values(statusMap))

  // Only surface aggregate cards / shortcuts the user is permitted to see, using
  // the same permStore.can() the sidebar uses. Admin & coordinator hold all of
  // these modules, so their dashboard is unchanged; a guide/mentor gets a trimmed
  // view (no Applicants / Fees / Test aggregates). The backend already omits the
  // corresponding data, so this is the UI half of a consistent restriction.
  const kpis = [
    can('applicants') && {
      label: 'Applicants', value: d.applicants_total ?? 0, icon: Users,
      hint: `+${d.applicants_this_month ?? 0} this month`, to: '/admin/applicants', tone: 'accent',
    },
    can('students') && {
      label: `Active ${labels.studentPlural}`, value: d.total_active_students ?? 0, icon: GraduationCap,
      hint: `${(d.batches || []).length} batches`, to: '/admin/students', tone: 'emerald',
    },
    can('approvals') && {
      label: 'Pending Approvals', value: d.pending_approvals ?? 0, icon: ClipboardCheck,
      hint: 'awaiting review', to: '/admin/approvals', tone: 'amber',
    },
    can('tests') && {
      label: 'Tests Submitted', value: d.attempts?.submitted ?? 0, icon: FileText,
      hint: d.attempts?.avg_score != null ? `avg score ${d.attempts.avg_score}` : `${d.tests?.published ?? 0} live test${(d.tests?.published ?? 0) === 1 ? '' : 's'}`,
      to: '/admin/test-builder', tone: 'blue',
    },
    can('fees') && {
      label: 'Fees Collected', value: inr.format(d.fees?.total_paid ?? 0), icon: IndianRupee,
      hint: `${feesPct}% of ${inr.format(d.fees?.total_due ?? 0)}`, to: '/admin/fees', tone: 'violet', small: true,
    },
  ].filter(Boolean)

  const shortcuts = [
    can('applicants') && { label: 'Applicant Pipeline', icon: Kanban, to: '/admin/applicants' },
    can('applicants') && { label: 'Add Applicant', icon: UserPlus, to: '/admin/applicants' },
    can('tests') && { label: 'Test Builder', icon: FileText, to: '/admin/test-builder' },
    can('assignments') && { label: 'Assignments', icon: ClipboardList, to: '/admin/assignments' },
    can('approvals') && { label: 'Approvals', icon: ClipboardCheck, to: '/admin/approvals' },
    can('formats') && { label: 'Formats', icon: FileDown, to: '/admin/formats' },
    can('lectures') && { label: 'Media', icon: PlayCircle, to: '/admin/lectures' },
    can('notifications') && { label: 'Notifications', icon: Bell, to: '/admin/notifications' },
  ].filter(Boolean)

  const footerStats = [
    can('assignments') && ['Assignments', d.assignments?.total ?? 0, `${d.assignments?.mandatory ?? 0} mandatory`, '/admin/assignments', ClipboardList],
    can('tests') && ['Tests', d.tests?.total ?? 0, `${d.tests?.published ?? 0} published`, '/admin/test-builder', FileText],
    can('lectures') && ['Media Files', d.media_total ?? 0, 'in library', '/admin/lectures', PlayCircle],
    can('submissions') && ['Submissions', (d.submissions_by_status || []).reduce((s, r) => s + r.count, 0), `${(d.submissions_by_status || []).find((r) => r.status === 'approved')?.count ?? 0} approved`, '/admin/approvals', Activity],
  ].filter(Boolean)

  const tones = {
    accent: 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
  }

  return (
    <div className="fade-page">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={
          currentBatch
            ? `${currentCourse?.name ? currentCourse.name + ' · ' : ''}${currentBatch.name} — batch overview`
            : currentCourse ? `${currentCourse.name} — all batches overview` : 'All courses — live overview'
        }
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        {kpis.map((k) => (
          <button key={k.label} onClick={() => navigate(k.to)} className="card card-hover p-5 text-left">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[color:var(--secondary)]">{k.label}</p>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tones[k.tone]}`}>
                <k.icon size={17} />
              </span>
            </div>
            <p className={`mt-3 font-semibold tracking-tight text-[color:var(--text)] ${k.small ? 'text-2xl' : 'text-4xl'}`}>{k.value}</p>
            <p className="mt-1.5 text-xs font-medium text-[color:var(--secondary)]">{k.hint}</p>
          </button>
        ))}
      </div>

      {/* ── Quick shortcuts ── */}
      {shortcuts.length > 0 && (
      <div className="card mt-6 p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Quick Shortcuts</p>
        <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              onClick={() => navigate(s.to)}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-transparent p-3 text-center transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--surface)] text-[color:var(--secondary)] transition group-hover:bg-[color:var(--accent)] group-hover:text-white">
                <s.icon size={18} />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-[color:var(--secondary)] group-hover:text-[color:var(--accent)]">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ── Charts row (applicant admissions data) ── */}
      {can('applicants') && (
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Applications trend */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Applications Trend</h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--secondary)]"><TrendingUp size={13} /> last 6 months</span>
          </div>
          {(d.monthly_applicants || []).length === 0 ? (
            <p className="py-14 text-center text-sm text-[color:var(--secondary)]">No applications in the last 6 months.</p>
          ) : (
            <div className="mt-6 flex h-48 items-end gap-3">
              {d.monthly_applicants.map((m) => (
                <div key={m.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs font-bold text-[color:var(--text)]">{m.count}</span>
                  <div
                    className="w-full max-w-[56px] rounded-t-xl bg-[color:var(--accent)] opacity-85 transition hover:opacity-100"
                    style={{ height: `${Math.max(8, (m.count / maxMonthly) * 150)}px` }}
                  />
                  <span className="text-[10px] font-semibold text-[color:var(--muted)]">{m.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applicant pipeline breakdown */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Applicant Pipeline</h2>
            <button onClick={() => navigate('/admin/applicants')} className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)] hover:underline">
              Open board <ArrowRight size={12} />
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {PIPELINE_ORDER.map((st) => {
              const count = statusMap[st] || 0
              return (
                <div key={st} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs font-semibold text-[color:var(--secondary)]">{PIPELINE_LABELS[st]}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[color:var(--surface)]">
                    <div className={`h-full rounded-full ${PIPELINE_COLORS[st]}`} style={{ width: `${(count / pipelineMax) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-bold text-[color:var(--text)]">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      )}

      {/* ── Bottom row ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent activity */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[color:var(--text)]">Recent Activity</h2>
          {(d.recent_activity || []).length === 0 ? (
            <p className="py-10 text-center text-sm text-[color:var(--secondary)]">No recent activity.</p>
          ) : (
            <div className="mt-4 space-y-1">
              {d.recent_activity.map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate(a.type === 'applicant' ? '/admin/applicants' : '/admin/approvals')}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-[color:var(--surface)]"
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${a.type === 'applicant' ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-emerald-50 text-emerald-600'}`}>
                    {a.type === 'applicant' ? <UserPlus size={15} /> : <FileText size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[color:var(--text)]">{a.who}</span>
                    <span className="block truncate text-xs text-[color:var(--secondary)]">
                      {a.type === 'applicant' ? `applied · ${String(a.detail || '').replaceAll('_', ' ')}` : `submitted "${a.detail}"`}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-[color:var(--muted)]">{timeAgo(a.at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Batches */}
        {can('batches') && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Batches</h2>
            <button onClick={() => navigate('/admin/batches')} className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)] hover:underline">
              Manage <ArrowRight size={12} />
            </button>
          </div>
          {(d.batches || []).length === 0 ? (
            <p className="py-10 text-center text-sm text-[color:var(--secondary)]">No batches yet for this course.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {d.batches.map((b) => {
                const fill = b.max_students > 0 ? Math.min(100, Math.round((b.enrolled / b.max_students) * 100)) : 0
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[color:var(--text)]">{b.name}</p>
                      <span className="shrink-0 text-xs text-[color:var(--secondary)]">
                        {b.enrolled}/{b.max_students || '∞'} {labels.studentPlural.toLowerCase()}
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : b.status === 'upcoming' ? 'bg-indigo-50 text-indigo-700' : 'bg-[color:var(--surface)] text-[color:var(--muted)]'}`}>{b.status}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--surface)]">
                      <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${fill}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── Footer stats strip ── */}
      {footerStats.length > 0 && (
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {footerStats.map(([label, val, hint, to, Icon]) => (
          <button key={label} onClick={() => navigate(to)} className="card card-hover flex items-center gap-3 p-4 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--surface)] text-[color:var(--secondary)]"><Icon size={17} /></span>
            <span className="min-w-0">
              <span className="block text-xl font-semibold text-[color:var(--text)]">{val}</span>
              <span className="block truncate text-[11px] text-[color:var(--secondary)]">{label} · {hint}</span>
            </span>
          </button>
        ))}
      </div>
      )}
    </div>
  )
}
