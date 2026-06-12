import { ArrowLeft, CalendarDays, Save, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getBatchById, getBatches, updateBatch } from '../../api/services/batchService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import { useLabels } from '../../store/labelStore.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'

export default function BatchStudentsPage() {
  const labels = useLabels()
  const { batchId } = useParams()
  const navigate = useNavigate()
  const addToast = useUiStore((s) => s.addToast)
  const [batch, setBatch] = useState(null)
  const [students, setStudents] = useState(null)
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(null)

  useEffect(() => {
    const load = async () => {
      let resolvedBatchId = batchId
      if (!resolvedBatchId || resolvedBatchId === 'students') {
        const batches = await getBatches()
        resolvedBatchId = batches.data.find((b) => b.status === 'active')?.id || batches.data[0]?.id
        if (resolvedBatchId) navigate(`/admin/batches/${resolvedBatchId}/students`, { replace: true })
        return
      }

      const [batchRes, studentsRes, usersRes] = await Promise.all([
        getBatchById(resolvedBatchId),
        getStudents({ batch_id: resolvedBatchId }),
        getUsers(),
      ])
      setBatch(batchRes.data)
      setForm(batchRes.data)
      setStudents(studentsRes.data)
      setUsers(usersRes.data)
    }
    load()
  }, [batchId, navigate])

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const coordinator = batch ? userMap[batch.coordinator_id] : null

  const studentName = (student) => {
    const user = userMap[student.user_id]
    return user ? `${user.first_name} ${user.last_name}` : student.user_id
  }

  const save = async () => {
    const res = await updateBatch(batch.id, {
      ...form,
      max_students: Number(form.max_students),
    })
    setBatch(res.data)
    setForm(res.data)
    addToast({ type: 'success', title: 'Batch details updated' })
  }

  if (!batch || !students || !form) return <SkeletonCard rows={8} />

  const fill = Math.round((students.length / form.max_students) * 100)

  return (
    <div className="fade-page">
      <PageHeader
        title={`${batch.name} Students`}
        subtitle="Batch-wise student list and editable batch configuration for admin and coordinator review."
        action={<Link className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--secondary)]" to="/admin/batches"><ArrowLeft size={16} className="mr-2 inline" />Back to Batches</Link>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="card p-6">
            <div className="safe-row items-start">
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--text)]">Batch Details</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">Editable by admin/coordinator.</p>
              </div>
              <StatusBadge status={batch.status} />
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Batch name" value={form.name} onChange={(value) => setForm((f) => ({ ...f, name: value }))} />
              <Field label="Academic year" value={form.academic_year} onChange={(value) => setForm((f) => ({ ...f, academic_year: value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date" type="date" value={form.start_date} onChange={(value) => setForm((f) => ({ ...f, start_date: value }))} />
                <Field label="End date" type="date" value={form.end_date} onChange={(value) => setForm((f) => ({ ...f, end_date: value }))} />
              </div>
              <Field label="Max students" type="number" value={form.max_students} onChange={(value) => setForm((f) => ({ ...f, max_students: value }))} />
              <label className="block">
                <span className="text-sm font-semibold text-[color:var(--text)]">Status</span>
                <select className="input mt-2 w-full" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            <button className="btn-primary mt-6 inline-flex items-center gap-2" onClick={save}><Save size={17} />Save Details</button>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">Snapshot</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric icon={Users} label={labels.studentPlural} value={`${students.length}/${form.max_students}`} />
              <Metric icon={CalendarDays} label="Capacity" value={`${fill}%`} />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
              <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${Math.min(fill, 100)}%` }} />
            </div>
            <p className="mt-4 text-sm text-[color:var(--secondary)]">Coordinator: {coordinator ? `${coordinator.first_name} ${coordinator.last_name}` : batch.coordinator_id}</p>
          </div>
        </aside>

        <section className="card overflow-hidden">
          <div className="safe-row border-b border-[color:var(--border)] p-5">
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--text)]">Students in this Batch</h2>
              <p className="text-sm text-[color:var(--secondary)]">{students.length} enrolled students</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                <tr>{['Name', 'Student ID', 'Enrolled', 'Progress', 'Submissions', 'Status'].map((h) => <th className="px-6 py-4" key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr className="table-row border-t border-[color:var(--border)]" key={student.id}>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-[color:var(--text)]">{studentName(student)}</p>
                      <p className="text-xs text-[color:var(--secondary)]">{userMap[student.user_id]?.email || '-'}</p>
                    </td>
                    <td>{student.permanent_id}</td>
                    <td>{formatDate(student.enrolled_at)}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 rounded-full bg-[color:var(--surface-strong)]">
                          <div className="h-2 rounded-full bg-[color:var(--accent)]" style={{ width: `${student.progress_summary.completion_percentage}%` }} />
                        </div>
                        <span className="font-semibold">{student.progress_summary.completion_percentage}%</span>
                      </div>
                    </td>
                    <td>{student.progress_summary.total_submissions}</td>
                    <td><StatusBadge status={student.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[color:var(--text)]">{label}</span>
      <input className="input mt-2 w-full" type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl bg-[color:var(--surface)] p-4">
      <Icon size={17} className="mb-2 text-[color:var(--accent)]" />
      <p className="font-semibold text-[color:var(--text)]">{value}</p>
      <p className="text-xs text-[color:var(--secondary)]">{label}</p>
    </div>
  )
}
