export default function SkeletonCard({ rows = 3 }) {
  return <div className="card p-6 space-y-4">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-5 rounded-full shimmer" style={{ width: `${90 - i * 14}%` }} />)}</div>
}
