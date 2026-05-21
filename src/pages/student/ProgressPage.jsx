import { useEffect, useState } from 'react'
import { generateProgressReportPDF, getProgressReportByStudent } from '../../api/services/progressReportService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useUiStore } from '../../store/uiStore.js'

export default function ProgressPage() {
  const [reports, setReports] = useState(null)
  const [tab, setTab] = useState(0)
  const addToast = useUiStore((s) => s.addToast)
  useEffect(() => { getProgressReportByStudent('stu_001').then((r) => setReports(r.data)) }, [])
  if (!reports) return <SkeletonCard />
  const r = reports[tab]

  return (
    <div className="fade-page">
      <PageHeader title="Progress Reports" subtitle="Priya Sharma · Batch 2024-A · Overall completion 62%" />
      <div className="mobile-filter-scroll mb-5 flex gap-2">
        {[1, 2, 3, 4].map((n, i) => (
          <button className={`mobile-compact-button shrink-0 rounded-full px-4 py-2 ${tab === i ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--card)] text-[color:var(--secondary)]'}`} onClick={() => setTab(Math.min(i, reports.length - 1))} key={n}>Report {n}</button>
        ))}
      </div>
      <div className="card p-6">
        <div className="safe-row items-start">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">{r.period_label}</h2>
          <StatusBadge status={r.status} />
        </div>
        <ProgressDonut value={r.completion_percentage} />
        {r.submissions.map((s) => (
          <div className="safe-row border-t border-[color:var(--border)] py-4" key={s.submission_id}>
            <span className="line-clamp-2">{s.title}</span>
            <StatusBadge status={s.final_status} />
          </div>
        ))}
        <button className="btn-primary mt-6" onClick={async () => { await generateProgressReportPDF(r.id); addToast({ type: 'success', title: 'PDF generated' }) }}>Download PDF</button>
      </div>
    </div>
  )
}

function ProgressDonut({ value }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  return (
    <svg viewBox="0 0 120 120" className="my-6 h-40 max-w-full">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--surface-strong)" strokeWidth="16" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#36B37E"
        strokeWidth="16"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="65" textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--text)">{value}%</text>
    </svg>
  )
}
