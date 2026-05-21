import { CreditCard, IndianRupee, ReceiptText, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getFeesByStudent } from '../../api/services/feeService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

export default function StudentFeesPage() {
  const [fees, setFees] = useState(null)
  const [paying, setPaying] = useState(null)
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => { getFeesByStudent('stu_001').then((r) => setFees(r.data)) }, [])
  if (!fees) return <SkeletonCard rows={6} />

  const paid = fees.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)
  const due = fees.filter((f) => f.status !== 'paid').reduce((sum, f) => sum + f.amount, 0)

  return (
    <div className="fade-page">
      <PageHeader title="Fees" subtitle="View submitted fees, receipts, and pending installments." />

      <div className="responsive-kpis">
        <Metric icon={IndianRupee} label="Paid" value={formatCurrency(paid)} />
        <Metric icon={CreditCard} label="Pending" value={formatCurrency(due)} />
        <Metric icon={ReceiptText} label="Receipts" value={fees.filter((f) => f.receipt_url).length} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] mt-6">
        <div className="space-y-4">
          {fees.map((fee) => (
            <div className="card p-6" key={fee.id}>
              <div className="safe-row items-start">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--text)]">{fee.fee_type}</h2>
                  <p className="text-sm text-[color:var(--secondary)]">Due {formatDate(fee.due_date)} · Installment {fee.installment}</p>
                </div>
                <StatusBadge status={fee.status} />
              </div>
              <div className="mt-5 safe-row">
                <div>
                  <p className="text-3xl font-semibold text-[color:var(--text)]">{formatCurrency(fee.amount)}</p>
                  <p className="mt-1 text-xs text-[color:var(--secondary)]">{fee.transaction_id ? `Transaction ${fee.transaction_id}` : fee.remarks}</p>
                </div>
                {fee.status === 'paid' ? (
                  <button className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--secondary)]">View Receipt</button>
                ) : (
                  <button className="btn-primary inline-flex items-center gap-2" onClick={() => setPaying(fee)}><CreditCard size={17} /> Pay Now</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <aside className="card p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">Payment Options</h2>
          <p className="mt-1 text-sm text-[color:var(--secondary)]">Gateway integration will be added later. UI is ready for handoff.</p>
          <div className="mt-5 space-y-3">
            {['UPI', 'Credit / Debit Card', 'Net Banking', 'Bank Transfer'].map((option) => (
              <div className="safe-row rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4" key={option}>
                <span className="font-semibold text-[color:var(--text)]">{option}</span>
                <ShieldCheck size={17} className="text-[color:var(--accent)]" />
              </div>
            ))}
          </div>
        </aside>
      </div>

      {paying && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm" onClick={() => setPaying(null)}>
          <div className="card w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">Payment Preview</h2>
            <p className="mt-2 text-sm text-[color:var(--secondary)]">This is a UI placeholder. Payment gateway integration will be connected later.</p>
            <div className="mt-5 rounded-3xl bg-[color:var(--surface)] p-5">
              <p className="text-sm text-[color:var(--secondary)]">{paying.fee_type}</p>
              <p className="mt-2 text-3xl font-semibold text-[color:var(--text)]">{formatCurrency(paying.amount)}</p>
            </div>
            <div className="safe-actions mt-6 justify-end">
              <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={() => setPaying(null)}>Close</button>
              <button className="btn-primary" onClick={() => { addToast({ type: 'info', title: 'Payment integration pending' }); setPaying(null) }}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="card p-6">
      <Icon size={20} className="text-[color:var(--accent)]" />
      <p className="mt-4 text-sm font-semibold text-[color:var(--secondary)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[color:var(--text)]">{value}</p>
    </div>
  )
}
