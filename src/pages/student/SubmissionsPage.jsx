import { Download, FileText, MessageSquare, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getApprovalsBySubmission } from '../../api/services/approvalService.js'
import { getSubmissionsByStudent } from '../../api/services/submissionService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'

export default function SubmissionsPage() {
  const [items, setItems] = useState(null)
  const [detail, setDetail] = useState(null)
  useScrollLock(Boolean(detail))

  useEffect(() => {
    getSubmissionsByStudent('stu_001').then(async (r) => {
      setItems(await Promise.all(r.data.map(async (s) => ({ ...s, approvals: (await getApprovalsBySubmission(s.id)).data }))))
    })
  }, [])

  if (!items) return <SkeletonCard rows={6} />

  return (
    <div className="fade-page">
      <PageHeader title="My Submissions" />
      <div className="space-y-5">
        {items.map((s) => {
          const revision = s.approvals.find((a) => a.status === 'needs_revision')
          return (
            <div className="card cursor-pointer p-6" key={s.id} onClick={() => setDetail(s)}>
              <div className="safe-row items-start">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--text)]">{s.title}</h2>
                  <p className="text-sm text-[color:var(--secondary)]">Report {s.report_period} · {formatDate(s.submitted_at)}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="safe-actions mt-5">
                {s.approvals.map((a) => <div className="rounded-full bg-[color:var(--surface)] px-4 py-2 text-xs text-[color:var(--secondary)]" key={a.id}>{a.stage}: {a.status}</div>)}
              </div>
              {revision && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-semibold">Revision requested</p>
                  <p className="mt-1">{revision.comments}</p>
                  {revision.suggested_title && <p className="mt-2"><b>Suggested title:</b> {revision.suggested_title}</p>}
                </div>
              )}
              <button className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]" onClick={(e) => { e.stopPropagation(); setDetail(s) }}>
                <MessageSquare size={16} /> View submission detail
              </button>
            </div>
          )
        })}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <aside className="drawer-panel lg:!w-[min(1040px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="safe-row border-b border-[color:var(--border)] p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Submission Detail</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{detail.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">Report {detail.report_period} · {formatDate(detail.submitted_at)}</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setDetail(null)}><XCircle size={18} /></button>
            </div>
            <div className="grid max-h-[calc(100%-96px)] gap-5 overflow-auto overscroll-contain p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <MediaPreview submission={detail} />
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <p className="font-semibold text-[color:var(--text)]">Submission Summary</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Info label="Status" value={<StatusBadge status={detail.status} />} />
                    <Info label="Title Version" value={`v${detail.title_version}`} />
                    <Info label="File" value={detail.presentation_filename || 'Not uploaded'} />
                    <Info label="Type" value={detail.presentation_type?.toUpperCase() || '-'} />
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                <div className="safe-row">
                  <p className="font-semibold text-[color:var(--text)]">Approval Thread</p>
                  <MessageSquare size={17} className="text-[color:var(--accent)]" />
                </div>
                <div className="mt-4 space-y-4">
                  {detail.approvals.map((approval) => (
                    <div className="rounded-3xl bg-[color:var(--card)] p-4" key={approval.id}>
                      <div className="safe-row items-start">
                        <p className="font-semibold capitalize text-[color:var(--text)]">{approval.stage?.replaceAll('_', ' ')}</p>
                        <StatusBadge status={approval.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]">{approval.comments || 'No comment added.'}</p>
                      {approval.suggested_title && <p className="mt-3 rounded-2xl bg-[color:var(--surface)] p-3 text-sm text-[color:var(--secondary)]"><b>Suggested title:</b> {approval.suggested_title}</p>}
                      <p className="mt-2 text-xs text-[color:var(--muted)]">{formatDate(approval.reviewed_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function MediaPreview({ submission }) {
  const type = submission?.presentation_type
  const url = submission?.presentation_url
  return <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
    <div className="safe-row">
      <div>
        <p className="font-semibold text-[color:var(--text)]">Uploaded Presentation</p>
        <p className="mt-1 text-xs text-[color:var(--secondary)]">{submission?.presentation_filename || 'No file attached'}</p>
      </div>
      {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 text-sm font-semibold text-[color:var(--accent)]"><Download size={15} /> Open</a>}
    </div>
    <div className="mt-4 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)]">
      {type === 'pdf' && url ? <iframe title="Presentation preview" src={url} className="h-72 w-full" />
        : type === 'video' && url ? <video src={url} controls className="h-72 w-full bg-black" />
          : <div className="grid h-72 place-items-center p-6 text-center">
            <div>
              <FileText className="mx-auto text-[color:var(--accent)]" size={34} />
              <p className="mt-3 font-semibold text-[color:var(--text)]">Preview unavailable</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">Open the uploaded file to review it.</p>
            </div>
          </div>}
    </div>
  </div>
}

function Info({ label, value }) {
  return <div className="rounded-2xl bg-[color:var(--card)] p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
    <div className="mt-2 text-sm font-semibold text-[color:var(--text)]">{value}</div>
  </div>
}
