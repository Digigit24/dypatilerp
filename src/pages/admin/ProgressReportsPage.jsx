/**
 * Admin → Progress Reports
 *
 * Lists the progress reports that actually exist as documents: submissions of
 * type 'progress_report', whose files live in object storage and whose review
 * runs through the batch approval chain. Admins and coordinators can upload a
 * report for any scholar from here; coordinators, guides and mentors can open
 * one and leave remarks on its feedback thread.
 */
import {
  CheckCircle2, Clock, FileText, RefreshCcw, Search, UploadCloud, X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApprovalsBySubmission } from '../../api/services/approvalService.js'
import { getProgressReportSubmissions } from '../../api/services/submissionService.js'
import UploadProgressReportDrawer from '../../components/admin/UploadProgressReportDrawer.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import SubmissionFileLink from '../../components/shared/SubmissionFileLink.jsx'
import SubmissionRemarks from '../../components/shared/SubmissionRemarks.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'
import { useCourseStore } from '../../store/courseStore.js'
import { usePermStore } from '../../store/permStore.js'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Pending Review' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'needs_revision', label: 'Needs Revision' },
  { key: 'draft', label: 'Draft' },
]

const nameOf = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || '—'

export default function AdminProgressReportsPage() {
  const [reports, setReports] = useState(null)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const { currentCourse } = useCourseStore()
  const canUpload = usePermStore((s) => s.hasRole('admin') || s.hasRole('coordinator'))

  useScrollLock(uploadOpen || Boolean(detail))

  const load = useCallback(() => {
    setReports(null)
    getProgressReportSubmissions({ limit: 200 })
      .then((r) => setReports(r.data || []))
      .catch(() => setReports([]))
  }, [])

  useEffect(() => { load() }, [load, currentCourse?.id])

  const stats = useMemo(() => {
    const list = reports || []
    return {
      total: list.length,
      approved: list.filter((r) => r.status === 'approved').length,
      pending: list.filter((r) => ['submitted', 'under_review'].includes(r.status)).length,
      revision: list.filter((r) => ['needs_revision', 'rejected'].includes(r.status)).length,
    }
  }, [reports])

  const visible = useMemo(() => {
    let list = reports || []
    if (status !== 'all') list = list.filter((r) => r.status === status)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        nameOf(r).toLowerCase().includes(q)
        || (r.title || '').toLowerCase().includes(q)
        || (r.batch_name || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [reports, status, search])

  return (
    <div className="fade-page">
      <PageHeader
        title="Progress Reports"
        subtitle="Every uploaded progress report, its review status and its feedback thread."
        action={
          <div className="flex flex-wrap gap-2">
            {canUpload && (
              <button
                className="btn-primary inline-flex items-center gap-2"
                onClick={() => setUploadOpen(true)}
              >
                <UploadCloud size={15} /> Upload Progress Report
              </button>
            )}
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              onClick={load}
              title="Refresh"
            >
              <RefreshCcw size={15} /> Refresh
            </button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total Reports" value={stats.total} tone="accent" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} tone="green" />
        <StatCard icon={Clock} label="Awaiting Review" value={stats.pending} tone="blue" />
        <StatCard icon={RefreshCcw} label="Needs Revision" value={stats.revision} tone="orange" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="admin-search soft-panel flex h-11 min-w-[240px] flex-1 items-center gap-2 rounded-full px-4">
          <Search size={15} className="text-[color:var(--muted)]" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"
            placeholder="Search by scholar, title or batch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${status === key ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--card)] text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {reports === null ? (
        <SkeletonCard rows={8} />
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText className="mx-auto text-[color:var(--muted)]" size={32} />
          <p className="mt-3 font-semibold text-[color:var(--text)]">
            {reports.length === 0 ? 'No progress reports yet' : 'No reports match this filter'}
          </p>
          <p className="mt-1 text-sm text-[color:var(--secondary)]">
            {reports.length === 0
              ? (canUpload ? 'Upload one for a scholar to get started.' : 'Reports appear here once they are uploaded.')
              : 'Try a different status or search term.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((r) => (
            <ReportCard key={r.id} report={r} onOpen={() => setDetail(r)} />
          ))}
        </div>
      )}

      {uploadOpen && (
        <UploadProgressReportDrawer
          onClose={() => setUploadOpen(false)}
          onUploaded={load}
        />
      )}

      {detail && (
        <ReportDetailDrawer
          report={detail}
          onClose={() => { setDetail(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function ReportCard({ report, onOpen }) {
  const name = nameOf(report)
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const files = Array.isArray(report.file_urls) ? report.file_urls : []
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card w-full p-5 text-left transition hover:border-[color:var(--accent)] hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-sm font-semibold text-[color:var(--accent)]">
          {initials || '—'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="safe-row items-start">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[color:var(--text)]">{name}</p>
              <p className="truncate text-xs text-[color:var(--secondary)]">
                {report.batch_name || '—'} · Report {report.semester || 1}
              </p>
            </div>
            <StatusBadge status={report.status} />
          </div>

          <p className="mt-3 line-clamp-2 text-sm font-semibold text-[color:var(--text)]">{report.title}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <FileText size={11} /> {files.length} file{files.length === 1 ? '' : 's'}
            </span>
            {report.remarks_count > 0 && <span>{report.remarks_count} remark{report.remarks_count === 1 ? '' : 's'}</span>}
            <span>{report.submitted_at ? formatDate(report.submitted_at) : formatDate(report.created_at)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function ReportDetailDrawer({ report, onClose }) {
  const [approvals, setApprovals] = useState(null)
  const files = Array.isArray(report.file_urls) ? report.file_urls : []

  useEffect(() => {
    let alive = true
    getApprovalsBySubmission(report.id)
      .then((r) => { if (alive) setApprovals(r.data || []) })
      .catch(() => { if (alive) setApprovals([]) })
    return () => { alive = false }
  }, [report.id])

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="drawer-panel lg:!w-[min(620px,calc(100vw-32px))] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-5 sm:p-7">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Progress Report</p>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{report.title}</h2>
            <p className="mt-1 text-sm text-[color:var(--secondary)]">
              <Link to={`/admin/students/${report.student_user_id}`} className="font-semibold text-[color:var(--accent)] hover:underline">
                {nameOf(report)}
              </Link>
              {' · '}{report.batch_name || '—'} · Report {report.semester || 1}
            </p>
            <div className="mt-2"><StatusBadge status={report.status} /></div>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)] text-[color:var(--secondary)] hover:bg-[color:var(--border)]"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-6">
          {/* Files */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Documents</p>
            {files.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--secondary)]">
                No file attached to this report.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={f.media_id || f.url || i} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--text)]">{f.name}</p>
                      {f.size ? <p className="text-xs text-[color:var(--muted)]">{(f.size / 1024 / 1024).toFixed(2)} MB</p> : null}
                    </div>
                    <SubmissionFileLink file={f} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approval chain */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Approval Chain</p>
            {approvals === null ? (
              <p className="mt-3 text-sm text-[color:var(--secondary)]">Loading…</p>
            ) : approvals.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--secondary)]">
                Not yet submitted for review.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {[...approvals].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((a) => (
                  <div key={a.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold capitalize text-[color:var(--text)]">
                        {(a.stage || '').replaceAll('_', ' ')}
                      </p>
                      <StatusBadge status={a.status} />
                    </div>
                    {a.comments && <p className="mt-2 text-sm italic text-[color:var(--secondary)]">&ldquo;{a.comments}&rdquo;</p>}
                    {a.action_at && <p className="mt-1 text-xs text-[color:var(--muted)]">{formatDate(a.action_at)}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remarks */}
          {/* Remark counts on the cards refresh when this drawer closes. */}
          <SubmissionRemarks submissionId={report.id} />
        </div>
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, tone }) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    accent: 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]',
  }
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${colors[tone]}`}>
          <Icon size={20} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-[color:var(--text)]">{value}</p>
        </div>
      </div>
    </div>
  )
}
