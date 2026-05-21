import { CreditCard, IndianRupee, ReceiptText, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getFees } from '../../api/services/feeService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate } from '../../lib/formatters.js'

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

export default function FeesPage() {
  const [fees, setFees] = useState(null)
  const [students, setStudents] = useState([])
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('all')

  useEffect(() => {
    Promise.all([getFees(), getStudents(), getUsers()]).then(([feeRes, studentRes, userRes]) => {
      setFees(feeRes.data)
      setStudents(studentRes.data)
      setUsers(userRes.data)
    })
  }, [])

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const studentMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])
  const studentName = (studentId) => {
    const student = studentMap[studentId]
    const user = student ? userMap[student.user_id] : null
    return user ? `${user.first_name} ${user.last_name}` : studentId
  }

  if (!fees) return <SkeletonCard rows={8} />

  const filtered = fees.filter((fee) => status === 'all' || fee.status === status)
  const totalCollected = fees.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)
  const pendingAmount = fees.filter((f) => f.status !== 'paid').reduce((sum, f) => sum + f.amount, 0)
  const paidCount = fees.filter((f) => f.status === 'paid').length
  const pendingCount = fees.filter((f) => f.status !== 'paid').length

  return (
    <div className="fade-page">
      <PageHeader title="Fees" subtitle="Track submitted fees, pending dues, and recent transactions across students." />

      <div className="responsive-kpis">
        <Metric icon={IndianRupee} label="Collected" value={formatCurrency(totalCollected)} hint={`${paidCount} paid records`} />
        <Metric icon={WalletCards} label="Pending" value={formatCurrency(pendingAmount)} hint={`${pendingCount} pending/overdue`} />
        <Metric icon={ReceiptText} label="Transactions" value={fees.filter((f) => f.transaction_id).length} hint="Reconciled receipts" />
        <Metric icon={CreditCard} label="Payment UI" value="Ready" hint="Gateway integration later" />
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="safe-row border-b border-[color:var(--border)] p-5">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--text)]">Student Fee Records</h2>
            <p className="text-sm text-[color:var(--secondary)]">{filtered.length} records shown</p>
          </div>
          <select className="input !min-h-11 w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[940px] w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>{['Student', 'Fee Type', 'Due Date', 'Amount', 'Status', 'Transaction', 'Mode'].map((h) => <th className="px-6 py-4" key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((fee) => (
                <tr className="table-row border-t border-[color:var(--border)]" key={fee.id}>
                  <td className="px-6 py-5">
                    <p className="font-semibold text-[color:var(--text)]">{studentName(fee.student_id)}</p>
                    <p className="text-xs text-[color:var(--secondary)]">{studentMap[fee.student_id]?.permanent_id}</p>
                  </td>
                  <td>{fee.fee_type}</td>
                  <td>{formatDate(fee.due_date)}</td>
                  <td className="font-semibold">{formatCurrency(fee.amount)}</td>
                  <td><StatusBadge status={fee.status} /></td>
                  <td>{fee.transaction_id || '-'}</td>
                  <td className="capitalize">{fee.payment_mode?.replaceAll('_', ' ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-xl font-semibold text-[color:var(--text)]">Last Transactions</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {fees.filter((f) => f.transaction_id).slice(0, 6).map((fee) => (
            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4" key={fee.id}>
              <div className="safe-row items-start">
                <div>
                  <p className="font-semibold text-[color:var(--text)]">{studentName(fee.student_id)}</p>
                  <p className="text-xs text-[color:var(--secondary)]">{fee.transaction_id}</p>
                </div>
                <StatusBadge status={fee.status} />
              </div>
              <p className="mt-3 text-lg font-semibold text-[color:var(--accent)]">{formatCurrency(fee.amount)}</p>
              <p className="text-xs text-[color:var(--secondary)]">{formatDate(fee.paid_at)} · {fee.payment_mode?.replaceAll('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <div className="card card-hover p-6">
      <div className="safe-row">
        <p className="text-sm font-semibold text-[color:var(--secondary)]">{label}</p>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><Icon size={19} /></span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--text)]">{value}</p>
      <p className="mt-2 text-xs font-medium text-[color:var(--secondary)]">{hint}</p>
    </div>
  )
}
