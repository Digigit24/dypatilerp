/**
 * Assignments (student view) — every assignment for my batch, grouped by
 * semester. Clicking "Submit" navigates to /student/submit?assignment=<id>
 * where the full submission form lives (title, file upload, approval chain).
 */
import {
  ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock3,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyAssignments } from '../../api/services/assignmentService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'

const overdue = (a) => a.due_date && !a.my_submission_id && new Date(a.due_date) < new Date()

export default function StudentAssignmentsPage() {
  const [items, setItems] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getMyAssignments().then((r) => setItems(r.data || [])).catch(() => setItems([]))
  }, [])

  if (!items) return <SkeletonCard rows={5} />

  const bySemester = items.reduce((acc, a) => {
    const key = a.semester || 1
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const submittedCount = items.filter((a) => a.my_submission_id).length
  const mandatoryPending = items.filter((a) => a.is_mandatory && !a.my_submission_id).length

  return (
    <div className="fade-page">
      <PageHeader
        title="Assignments"
        subtitle="All assignments for your batch. Click Submit on any assignment to start your submission and send it through the approval chain."
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          ['Total', items.length, ClipboardList, 'text-[color:var(--accent)]'],
          ['Submitted', submittedCount, CheckCircle2, 'text-emerald-600'],
          ['Mandatory Pending', mandatoryPending, Clock3, 'text-amber-500'],
        ].map(([label, val, Icon, cls]) => (
          <div key={label} className="card p-4 text-center">
            <Icon size={18} className={`mx-auto ${cls}`} />
            <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{val}</p>
            <p className="text-xs text-[color:var(--secondary)]">{label}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <ClipboardList size={30} className="text-[color:var(--muted)]" />
          <p className="text-sm font-semibold text-[color:var(--text)]">No assignments yet</p>
          <p className="text-xs text-[color:var(--secondary)]">Your coordinator will publish assignments for your batch here.</p>
        </div>
      ) : (
        Object.keys(bySemester).sort((a, b) => a - b).map((sem) => (
          <section key={sem} className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Semester {sem}</h2>
            <div className="space-y-3">
              {bySemester[sem].map((a) => (
                <div
                  key={a.id}
                  className={`card flex flex-wrap items-center gap-4 p-4 ${overdue(a) ? 'border-red-200' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[color:var(--text)]">{a.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.is_mandatory ? 'bg-red-100 text-red-700' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
                        {a.is_mandatory ? 'Mandatory' : 'Optional'}
                      </span>
                      {overdue(a) && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Overdue</span>
                      )}
                    </div>
                    {a.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-[color:var(--secondary)]">{a.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      {a.due_date && (
                        <p className="inline-flex items-center gap-1 text-[11px] text-[color:var(--muted)]">
                          <CalendarDays size={11} />
                          Due {new Date(a.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      {a.is_mandatory && !a.my_submission_id && (
                        <p className="text-[11px] font-semibold text-amber-600">
                          Goes through full approval chain
                        </p>
                      )}
                      {!a.is_mandatory && !a.my_submission_id && (
                        <p className="text-[11px] text-[color:var(--muted)]">
                          Coordinator approval only
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {a.my_submission_id ? (
                      <>
                        <StatusBadge status={a.my_submission_status || 'submitted'} />
                        <button
                          onClick={() => navigate('/student/submissions')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:text-[color:var(--text)]"
                        >
                          View
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => navigate(`/student/submit?assignment=${a.id}`)}
                        className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
                      >
                        Submit <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
