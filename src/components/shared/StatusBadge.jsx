const colors = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  shortlisted: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  test_pending: 'bg-amber-50 text-amber-700 border-amber-100',
  shortlisted_test: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-100',
  test_completed: 'bg-blue-50 text-blue-700 border-blue-100',
  needs_revision: 'bg-orange-50 text-orange-700 border-orange-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
  overdue: 'bg-red-50 text-red-700 border-red-100',
  draft: 'bg-stone-100 text-stone-600 border-stone-200',
  upcoming: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  enrolled: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  payment_received: 'bg-teal-50 text-teal-700 border-teal-100',
}

export default function StatusBadge({ status }) {
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold capitalize ${colors[status] || 'bg-stone-100 text-stone-600 border-stone-200'}`}>{String(status || '').replaceAll('_', ' ')}</span>
}
