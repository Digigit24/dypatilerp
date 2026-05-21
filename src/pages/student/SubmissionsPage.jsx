import { MessageSquare, XCircle } from 'lucide-react'
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
  const [thread, setThread] = useState(null)
  useScrollLock(Boolean(thread))

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
            <div className="card p-6" key={s.id}>
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
              <button className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]" onClick={() => setThread(s)}>
                <MessageSquare size={16} /> View approval thread
              </button>
            </div>
          )
        })}
      </div>

      {thread && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setThread(null)}>
          <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="safe-row border-b border-[color:var(--border)] p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Approval Thread</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{thread.title}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setThread(null)}><XCircle size={18} /></button>
            </div>
            <div className="max-h-[calc(100%-96px)] overflow-auto overscroll-contain p-6">
              <div className="space-y-4">
                {thread.approvals.map((approval) => (
                  <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4" key={approval.id}>
                    <div className="safe-row items-start">
                      <p className="font-semibold capitalize text-[color:var(--text)]">{approval.stage?.replaceAll('_', ' ')}</p>
                      <StatusBadge status={approval.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]">{approval.comments || 'No comment added.'}</p>
                    {approval.suggested_title && <p className="mt-3 rounded-2xl bg-[color:var(--card)] p-3 text-sm text-[color:var(--secondary)]"><b>Suggested title:</b> {approval.suggested_title}</p>}
                    <p className="mt-2 text-xs text-[color:var(--muted)]">{formatDate(approval.reviewed_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
