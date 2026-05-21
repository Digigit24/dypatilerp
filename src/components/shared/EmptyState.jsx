export default function EmptyState({ title = 'Nothing here yet', subtitle = 'New records will appear here when available.', action }) {
  return (
    <div className="card p-10 text-center text-muted">
      <svg viewBox="0 0 160 120" className="mx-auto mb-4 h-24 w-32" fill="none"><rect x="28" y="24" width="104" height="72" rx="18" fill="#FFF1F5"/><path d="M50 52h60M50 68h42" stroke="#E54873" strokeWidth="6" strokeLinecap="round"/><circle cx="116" cy="32" r="12" fill="#E54873" opacity=".25"/></svg>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm">{subtitle}</p>
      {action}
    </div>
  )
}
