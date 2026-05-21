import { CalendarDays, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBatches } from '../../api/services/batchService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'

export default function BatchesPage() {
  const [items, setItems] = useState(null)
  useEffect(() => { getBatches().then((r) => setItems(r.data)) }, [])
  if (!items) return <SkeletonCard />
  return (
    <div className="fade-page">
      <PageHeader title="Batches" subtitle="Manage fellowship cohorts, capacity, and approval chains." action={<button className="btn-primary inline-flex items-center gap-2"><Plus size={17} /> Create New Batch</button>} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        {items.map((b) => {
          const pct = Math.round((b.enrolled_count / b.max_students) * 100)
          return (
            <div className="card card-hover p-6" key={b.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">{b.name}</h2>
                  <p className="mt-1 text-sm text-[color:var(--secondary)]">{b.academic_year}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-3xl bg-[color:var(--surface)] p-4">
                  <Users size={17} className="mb-2 text-[color:var(--accent)]" />
                  <p className="font-semibold text-[color:var(--text)]">{b.enrolled_count}/{b.max_students}</p>
                  <p className="text-xs text-[color:var(--secondary)]">students enrolled</p>
                </div>
                <div className="rounded-3xl bg-[color:var(--surface)] p-4">
                  <CalendarDays size={17} className="mb-2 text-[color:var(--accent)]" />
                  <p className="font-semibold text-[color:var(--text)]">{pct}%</p>
                  <p className="text-xs text-[color:var(--secondary)]">capacity filled</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-[color:var(--secondary)]">{b.start_date} to {b.end_date}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="btn-primary inline-flex items-center" to={`/admin/batches/${b.id}/students`}>View Students</Link>
                <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]">Edit Batch</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
