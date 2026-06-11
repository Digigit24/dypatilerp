import { CreditCard, IndianRupee, PlusCircle, ReceiptText, WalletCards, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getFees, markFeePaid } from '../../api/services/feeService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'
import { useCourseStore } from '../../store/courseStore.js'

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const FEE_TYPES = [
  'Registration, Test & Interview Fee',
  'Semester 1 Program Fee',
  'Semester 2 Program Fee',
  'Administration Fee',
  'Coursework Fee',
  'Progress Report Fee',
  'Thesis Submission & Defence Fee',
]

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
]

const BLANK_PAY = { student_id: '', fee_type: FEE_TYPES[0], amount: '', status: 'paid', transaction_id: '', payment_mode: 'cash', remarks: '' }

export default function FeesPage() {
  const [fees, setFees] = useState(null)
  const [students, setStudents] = useState([])
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('all')
  const [payOpen, setPayOpen] = useState(false)
  const [payForm, setPayForm] = useState(BLANK_PAY)
  const [saving, setSaving] = useState(false)
  const addToast = useUiStore((s) => s.addToast)
  const { currentCourse } = useCourseStore()
  useScrollLock(payOpen)

  // Re-fetch when active course changes; X-Course-Id header is added automatically
  useEffect(() => {
    setFees(null)
    Promise.all([getFees(), getStudents(), getUsers()]).then(([feeRes, studentRes, userRes]) => {
      setFees(feeRes.data)
      setStudents(studentRes.data)
      setUsers(userRes.data)
    })
  }, [currentCourse?.id])

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

  const pf = (key) => ({ value: payForm[key], onChange: (e) => setPayForm((f) => ({ ...f, [key]: e.target.value })) })

  const openPayment = () => {
    setPayForm({ ...BLANK_PAY, student_id: students[0]?.id || '' })
    setPayOpen(true)
  }

  const handlePayment = async (e) => {
    e.preventDefault()
    setSaving(true)
    const mockFeeId = fees[0]?.id
    if (mockFeeId && payForm.status === 'paid') {
      const res = await markFeePaid(mockFeeId, {
        transaction_id: payForm.transaction_id || undefined,
        payment_mode: payForm.payment_mode,
        remarks: payForm.remarks,
      })
      setFees((fs) => fs.map((f) => (f.id === mockFeeId ? res.data : f)))
    }
    setSaving(false)
    setPayOpen(false)
    addToast({ type: 'success', title: 'Payment recorded successfully.' })
  }

  return (
    <div className="fade-page">
      <PageHeader
        title="Fees"
        subtitle="Track submitted fees, pending dues, and recent transactions across students."
        action={
          <button className="btn-primary inline-flex items-center gap-2" onClick={openPayment}>
            <PlusCircle size={17} /> Record Payment
          </button>
        }
      />

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
                  <td className="px-6">{fee.fee_type}</td>
                  <td className="px-6">{formatDate(fee.due_date)}</td>
                  <td className="px-6 font-semibold">{formatCurrency(fee.amount)}</td>
                  <td className="px-6"><StatusBadge status={fee.status} /></td>
                  <td className="px-6">{fee.transaction_id || '-'}</td>
                  <td className="px-6 capitalize">{fee.payment_mode?.replaceAll('_', ' ') || '-'}</td>
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

      {/* ── Manual Payment drawer ── */}
      {payOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setPayOpen(false)}>
          <div className="drawer-panel lg:!w-[min(520px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Manual Entry</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Record Payment</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setPayOpen(false)}><XCircle size={18} /></button>
            </div>

            <form onSubmit={handlePayment} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">

                <PF label="Student" required>
                  <select className="input w-full" required {...pf('student_id')}>
                    <option value="">Select student</option>
                    {students.map((s) => {
                      const u = userMap[s.user_id]
                      return <option key={s.id} value={s.id}>{u ? `${u.first_name} ${u.last_name}` : s.id} · {s.permanent_id}</option>
                    })}
                  </select>
                </PF>

                <PF label="Fee Type" required>
                  <select className="input w-full" required {...pf('fee_type')}>
                    {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </PF>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PF label="Amount (₹)" required>
                    <input className="input w-full" type="number" min="0" placeholder="75000" required {...pf('amount')} />
                  </PF>
                  <PF label="Payment Status" required>
                    <select className="input w-full" required {...pf('status')}>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </PF>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PF label="Payment Mode">
                    <select className="input w-full" {...pf('payment_mode')}>
                      {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </PF>
                  <PF label="Transaction / Reference ID">
                    <input className="input w-full" placeholder="TXN-DYP-XXXX" {...pf('transaction_id')} />
                  </PF>
                </div>

                <PF label="Remarks">
                  <textarea className="textarea h-24 w-full" placeholder="Any notes about this payment…" {...pf('remarks')} />
                </PF>

                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <p className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Mode note</p>
                  <p className="mt-1 text-sm text-[color:var(--secondary)]">
                    {payForm.payment_mode === 'cash'
                      ? 'Cash payment — no transaction ID required. Mark as manual entry.'
                      : 'Online / digital payment — please enter the transaction reference ID above.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
                <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => setPayOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving…' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PF({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[color:var(--text)]">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
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
