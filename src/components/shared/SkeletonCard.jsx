export default function SkeletonCard({ rows = 3 }) {
  return <div className="card p-5 space-y-3">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-4 rounded-md shimmer" style={{ width: `${90 - i * 14}%` }} />)}</div>
}
