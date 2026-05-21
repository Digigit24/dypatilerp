import { Link } from 'react-router-dom'
import { LayoutDashboard, PlayCircle } from 'lucide-react'

export default function ConfirmationPage() {
  return <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-3xl place-items-center px-4 py-12">
    <div className="card w-full p-10 text-center">
      <h1 className="text-3xl font-semibold">Confirmed</h1>
      <p className="mt-2 text-[var(--secondary)]">Your application is ready for the next step.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/test/test_001" className="btn-primary inline-flex items-center gap-2"><PlayCircle size={18} />Start Test Now</Link>
        <Link to="/admin" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 font-semibold"><LayoutDashboard size={18} />Dashboard</Link>
      </div>
    </div>
  </div>
}
