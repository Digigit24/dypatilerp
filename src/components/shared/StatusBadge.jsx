const colors = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  shortlisted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  test_pending: 'bg-amber-50 text-amber-700 border-amber-200',
  shortlisted_test: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  test_completed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  needs_revision: 'bg-orange-50 text-orange-700 border-orange-200',
  awaiting_review: 'bg-amber-50 text-amber-700 border-amber-200',
  not_started: 'bg-stone-100 text-stone-600 border-stone-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  draft: 'bg-stone-100 text-stone-600 border-stone-200',
  upcoming: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  enrolled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  payment_received: 'bg-teal-50 text-teal-700 border-teal-200',
}

export default function StatusBadge({ status }) {
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${colors[status] || 'bg-stone-100 text-stone-600 border-stone-200'}`}>{String(status || '').replaceAll('_', ' ')}</span>
}