import { CalendarDays, ChevronRight, GitBranch, Layers, Plus, Trash2, Users, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createBatch, deleteBatch, getBatches, updateApprovalConfig, updateBatch,
} from '../../api/services/batchService.js'
import { getCourses } from '../../api/services/courseService.js'
import { getUsers } from '../../api/services/userService.js'
import ApprovalConfigurator from '../../components/shared/ApprovalConfigurator.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'

const BLANK = {
  course_id: '', name: '', code: '', status: 'upcoming',
  start_date: '', end_date: '', max_students: 30, description: '',
}

const FACULTY_ROLES = ['coordinator', 'academic_guide', 'industry_mentor', 'admin']

export default function BatchesPage() {
  const [items, setItems]           = useState(null)
  const [courses, setCourses]       = useState([])
  const [facultyUsers, setFaculty]  = useState([])
  const [drawerOpen, setDrawer]     = useState(false)
  const [workflowBatch, setWorkflow]= useState(null) // batch being configured
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(BLANK)
  const [stages, setStages]         = useState([])
  const [saving, setSaving]         = useState(false)
  const { currentCourse } = useCourseStore()
  const addToast = useUiStore((s) => s.addToast)
  useScrollLock(drawerOpen || !!workflowBatch)

  const load = () =>
    getBatches(currentCourse?.id ? { course_id: currentCourse.id } : {})
      .then((r) => setItems(r.data || []))

  useEffect(() => {
    load()
    getCourses().then((r) => setCourses(r.data || []))
    getUsers().then((r) => {
      const all = r.data || []
      setFaculty(all.filter((u) => {
        const roles = Array.isArray(u.roles) ? u.roles : (u.roles || '').replace(/^\{|\}$/g, '').split(',').filter(Boolean)
        return roles.some((r) => FACULTY_ROLES.includes(r))
      }))
    })
  }, [currentCourse?.id])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...BLANK, course_id: currentCourse?.id || '' })
    setDrawer(true)
  }
  const openEdit = (b) => {
    setEditing(b)
    setForm({ course_id: b.course_id, name: b.name, code: b.code, status: b.status,
      start_date: b.start_date?.split('T')[0] || '', end_date: b.end_date?.split('T')[0] || '',
      max_students: b.max_students, description: b.description || '' })
    setDrawer(true)
  }
  const openWorkflow = (b) => {
    setWorkflow(b)
    setStages(b.approval_config?.stages || [])
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateBatch(editing.id, form)
        addToast({ type: 'success', title: 'Batch updated.' })
      } else {
        await createBatch(form)
        addToast({ type: 'success', title: 'Batch created.' })
      }
      setDrawer(false)
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message || err.message })
    } finally { setSaving(false) }
  }

  const handleDelete = async (b) => {
    if (!confirm(`Delete batch "${b.name}"?`)) return
    try {
      await deleteBatch(b.id)
      addToast({ type: 'success', title: 'Batch deleted.' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Cannot delete', message: err.response?.data?.message })
    }
  }

  const handleSaveWorkflow = async () => {
    if (!workflowBatch) return
    setSaving(true)
    try {
      await updateApprovalConfig(workflowBatch.id, stages)
      addToast({ type: 'success', title: 'Approval workflow saved.' })
      setWorkflow(null)
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message })
    } finally { setSaving(false) }
  }

  const ff = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: key === 'max_students' ? Number(e.target.value) : e.target.value })),
  })

  if (!items) return <SkeletonCard />

  return (
    <div className="fade-page">
      <PageHeader
        title="Batches"
        subtitle="Manage fellowship cohorts, capacity, and approval workflows."
        action={
          <button className="btn-primary inline-flex items-center gap-2" onClick={openAdd}>
            <Plus size={17} /> Create Batch
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        {items.map((b) => {
          const pct  = Math.round(((b.enrolled_count || 0) / (b.max_students || 1)) * 100)
          const hasWorkflow = b.approval_config?.stages?.length > 0
          return (
            <div className="card p-6 flex flex-col" key={b.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold tracking-tight text-[color:var(--text)]">{b.name}</h2>
                  <p className="mt-0.5 text-xs font-bold text-[color:var(--accent)] tracking-wide">{b.course_code} · {b.code}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <StatusBadge status={b.status} />
                  <button className="grid h-7 w-7 place-items-center rounded-full hover:bg-red-50 text-[color:var(--muted)] hover:text-red-500 transition"
                    onClick={() => handleDelete(b)}><Trash2 size={13} /></button>
                </div>
              </div>

              {/* Enrollment bar */}
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${pct}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-3xl bg-[color:var(--surface)] p-4">
                  <Users size={16} className="mb-2 text-[color:var(--accent)]" />
                  <p className="font-semibold text-[color:var(--text)]">{b.enrolled_count || 0}/{b.max_students}</p>
                  <p className="text-xs text-[color:var(--secondary)]">enrolled</p>
                </div>
                <div className="rounded-3xl bg-[color:var(--surface)] p-4">
                  <CalendarDays size={16} className="mb-2 text-[color:var(--accent)]" />
                  <p className="font-semibold text-[color:var(--text)]">{b.start_date?.split('T')[0]} →</p>
                  <p className="text-xs text-[color:var(--secondary)]">{b.end_date?.split('T')[0]}</p>
                </div>
              </div>

              {/* Workflow indicator */}
              <div className="mt-3 flex items-center gap-2 rounded-3xl border border-[color:var(--border)] px-4 py-2.5">
                <GitBranch size={14} className={hasWorkflow ? 'text-[color:var(--accent)]' : 'text-[color:var(--muted)]'} />
                <span className="text-xs text-[color:var(--secondary)] flex-1">
                  {hasWorkflow
                    ? `${b.approval_config.stages.length}-stage custom workflow`
                    : 'Default 3-stage workflow'}
                </span>
                <button
                  className="text-xs font-semibold text-[color:var(--accent)] hover:underline"
                  onClick={() => openWorkflow(b)}
                >
                  Configure
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link className="btn-primary inline-flex items-center gap-1.5 text-sm" to={`/admin/batches/${b.id}/students`}>
                  <Users size={13} /> Students
                </Link>
                <button className="flex items-center gap-1.5 rounded-2xl bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface-strong)] transition"
                  onClick={() => openEdit(b)}>
                  Edit Batch
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {items.length === 0 && (
        <div className="card flex flex-col items-center py-20 text-center">
          <Layers size={40} className="text-[color:var(--accent)] opacity-30" />
          <p className="mt-4 font-semibold text-[color:var(--text)]">No batches yet</p>
          <p className="mt-1 text-sm text-[color:var(--secondary)]">Create the first cohort for this course.</p>
        </div>
      )}

      {/* ── Create/Edit Drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setDrawer(false)}>
          <div className="drawer-panel lg:!w-[min(520px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{editing ? 'Edit Batch' : 'New Batch'}</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{editing ? editing.name : 'Create Cohort'}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setDrawer(false)}><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
                <F label="Course" required>
                  <select className="input w-full" required {...ff('course_id')}>
                    <option value="">Select course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </select>
                </F>
                <div className="grid gap-4 sm:grid-cols-2">
                  <F label="Batch Name" required><input className="input w-full" required placeholder="Batch A – 2024" {...ff('name')} /></F>
                  <F label="Batch Code" required><input className="input w-full" required placeholder="ABRF-2024-A" {...ff('code')} /></F>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <F label="Start Date" required><input className="input w-full" type="date" required {...ff('start_date')} /></F>
                  <F label="End Date" required><input className="input w-full" type="date" required {...ff('end_date')} /></F>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <F label="Max Students"><input className="input w-full" type="number" min={1} {...ff('max_students')} /></F>
                  <F label="Status">
                    <select className="input w-full" {...ff('status')}>
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </F>
                </div>
                <F label="Description"><textarea className="input w-full resize-none" rows={3} {...ff('description')} /></F>
              </div>
              <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
                <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => setDrawer(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Batch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Approval Workflow Drawer ── */}
      {workflowBatch && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setWorkflow(null)}>
          <div className="drawer-panel lg:!w-[min(600px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Approval Workflow</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{workflowBatch.name}</h2>
                <p className="text-sm text-[color:var(--secondary)]">Define who reviews submissions in this batch.</p>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setWorkflow(null)}><XCircle size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7">
              <div className="mb-4 rounded-3xl bg-[color:var(--surface)] p-4 text-sm text-[color:var(--secondary)]">
                Stages run <strong>sequentially</strong>. Leave empty to use the default 3-stage chain. Changes take effect on the next submission.
              </div>
              <ApprovalConfigurator
                stages={stages}
                onChange={setStages}
                users={facultyUsers}
              />
            </div>
            <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
              <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => setWorkflow(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleSaveWorkflow} disabled={saving}>{saving ? 'Saving…' : 'Save Workflow'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function F({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[color:var(--text)]">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
