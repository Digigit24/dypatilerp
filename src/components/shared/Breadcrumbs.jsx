import { ChevronRight } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export default function Breadcrumbs() {
  const parts = useLocation().pathname.split('/').filter(Boolean)
  return <div className="mb-2 flex items-center gap-1 text-xs capitalize text-[color:var(--muted)]">{parts.map((p, i) => <span key={`${p}-${i}`} className="flex items-center gap-1">{i > 0 && <ChevronRight size={12} />}{p.replaceAll('-', ' ')}</span>)}</div>
}
