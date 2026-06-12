import { AlertTriangle, BookOpen, GraduationCap, Layers, Loader2, PenLine, Plus, Trash2, XCircle } from 'lucide-react'
import FeeStructureEditor from '../../components/admin/FeeStructureEditor.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useEffect, useState } from 'react'
import { createCourse, deleteCourse, getCourses, updateCourse } from '../../api/services/courseService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'
import useScrollLock from '../../hooks/useScrollLock.js'
import { useNavigate } from 'react-router-dom'

const BLANK = {
  name: '', code: '', description: '',
  duration_months: 24, max_students_per_batch: 30,
  fee_structure: { '1': 50000, '2': 50000, '3': 50000, '4': 50000 },
  is_active: true,
}

export default function CoursesPage({ embedded = false }) {
  const isAdmin = useAuthStore((s) => s.role) === 'admin'
  const [deleteTarget, setDeleteTarget] = useState(null)   // course pending deletion
  const [deleting, setDeleting] = useState(false)
  const [courses, setCourses] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = add, course = edit
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  // fee_structure edited directly via FeeStructureEditor (object form)
  const addToast = useUiStore((s) => s.addToast)
  const { setCourses: storeSetCourses, setCurrentCourse } = useCourseStore()
  const navigate = useNavigate()
  useScrollLock(drawerOpen)

  const load = () => getCourses().then((r) => {
    const data = r.data || []
    setCourses(data)
    if (data.length) storeSetCourses(data)
  })

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(BLANK)
    setDrawerOpen(true)
  }

  const openEdit = (course) => {
    setEditing(course)
    setForm({
      name: course.name, code: course.code, description: course.description || '',
      duration_months: course.duration_months, max_students_per_batch: course.max_students_per_batch,
      fee_structure: course.fee_structure || {}, is_active: course.is_active,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing) {
        const r = await updateCourse(editing.id, payload)
        setCourses((cs) => cs.map((c) => (c.id === editing.id ? r.data : c)))
        addToast({ type: 'success', title: 'Course updated.' })
      } else {
        const r = await createCourse(payload)
        setCourses((cs) => [r.data, ...cs])
        addToast({ type: 'success', title: 'Course created.' })
      }
      setDrawerOpen(false)
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save course', message: err.response?.data?.message || 'Something went wrong' })
    } finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCourse(deleteTarget.id)
      setCourses((cs) => cs.filter((c) => c.id !== deleteTarget.id))
      addToast({ type: 'success', title: `Course "${deleteTarget.name}" and all its data deleted.` })
      setDeleteTarget(null)
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message || 'Something went wrong' })
    } finally { setDeleting(false) }
  }

  const f = (key) => ({
    value: key === 'is_active' ? undefined : form[key],
    checked: key === 'is_active' ? form[key] : undefined,
    onChange: (e) => setForm((p) => ({ ...p, [key]: key === 'is_active' ? e.target.checked : (key === 'duration_months' || key === 'max_students_per_batch' ? Number(e.target.value) : e.target.value) })),
  })

  if (!courses) return <SkeletonCard rows={6} />

  return (
    <div className={embedded ? '' : 'fade-page'}>
      {!embedded && (
        <PageHeader
          title="Courses"
          subtitle="Manage fellowship programs, their batches, and configuration."
          action={
            <button className="btn-primary inline-flex items-center gap-2" onClick={openAdd}>
              <Plus size={17} /> New Course
            </button>
          }
        />
      )}
      {embedded && (
        <div className="mb-4 flex justify-end">
          <button className="btn-primary inline-flex items-center gap-2" onClick={openAdd}>
            <Plus size={17} /> New Course
          </button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <div key={course.id} className="card card-hover flex flex-col p-6">
            <div className="flex items-start justify-between">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--accent-tint)]">
                <GraduationCap size={22} className="text-[color:var(--accent)]" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-[color:var(--surface)] text-[color:var(--secondary)]"
                  onClick={() => openEdit(course)} title="Edit course"
                ><PenLine size={14} /></button>
                {isAdmin && (
                  <button
                    className="grid h-8 w-8 place-items-center rounded-full hover:bg-red-50 text-[color:var(--muted)] hover:text-red-500"
                    onClick={() => setDeleteTarget(course)} title="Delete course (admin only)"
                  ><Trash2 size={14} /></button>
                )}
              </div>
            </div>

            <div className="mt-4 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[color:var(--text)]">{course.name}</h3>
                <StatusBadge status={course.is_active ? 'active' : 'inactive'} />
              </div>
              <p className="mt-0.5 text-xs font-bold text-[color:var(--accent)] tracking-wide">{course.code}</p>
              {course.description && (
                <p className="mt-2 text-sm line-clamp-2 text-[color:var(--secondary)]">{course.description}</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--secondary)]">
              <span className="flex items-center gap-1.5">
                <Layers size={12} /> {course.batch_count || 0} batches
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={12} /> {course.duration_months}m
              </span>
              <span>{course.student_count || 0} students</span>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-2xl bg-[color:var(--surface)] py-2 text-xs font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)] transition"
                onClick={() => { setCurrentCourse(course); navigate('/admin') }}
              >
                Switch to Course
              </button>
              <button
                className="flex-1 rounded-2xl bg-[color:var(--accent-tint)] py-2 text-xs font-semibold text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white transition"
                onClick={() => navigate(`/admin/courses/${course.id}/settings`)}
              >
                Settings
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}>
          <div className="drawer-panel lg:!w-[min(560px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  {editing ? 'Edit Course' : 'New Course'}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">
                  {editing ? editing.name : 'Create Fellowship Program'}
                </h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setDrawerOpen(false)}>
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Course Name" required>
                    <input className="input w-full" placeholder="Applied Business Research Fellowship" required {...f('name')} />
                  </Field>
                  <Field label="Course Code" required>
                    <input className="input w-full" placeholder="ABRF-2024" required {...f('code')} />
                  </Field>
                </div>
                <Field label="Description">
                  <textarea className="input w-full resize-none" rows={3} placeholder="Brief description of the program..." {...f('description')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Duration (months)">
                    <input className="input w-full" type="number" min={1} max={60} {...f('duration_months')} />
                  </Field>
                  <Field label="Max Students / Batch">
                    <input className="input w-full" type="number" min={1} max={200} {...f('max_students_per_batch')} />
                  </Field>
                </div>
                <Field label="Fee Structure (per semester)">
                  <FeeStructureEditor
                    value={form.fee_structure}
                    onChange={(fee_structure) => setForm((p) => ({ ...p, fee_structure }))}
                  />
                </Field>
                <div className="flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">Active</p>
                    <p className="mt-0.5 text-xs text-[color:var(--secondary)]">Course is open for new batches and applications</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_active ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
                <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Danger: cascade delete confirmation (admin only) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="w-full max-w-lg rounded-[24px] bg-[color:var(--card)] p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-500">
                <AlertTriangle size={22} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-[color:var(--text)]">Delete "{deleteTarget.name}"?</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">
                  This permanently deletes the course <strong>and everything inside it</strong>, in one go:
                </p>
              </div>
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-2xl bg-red-50/60 p-4 text-xs font-semibold text-red-700">
              <li>• {deleteTarget.batch_count ?? 0} batch(es) &amp; enrollments</li>
              <li>• {deleteTarget.student_count ?? 0} enrolled student(s)</li>
              <li>• All applicants &amp; test links</li>
              <li>• All tests, questions &amp; attempts</li>
              <li>• All submissions &amp; approvals</li>
              <li>• All fees &amp; payments</li>
              <li>• All assignments &amp; formats</li>
              <li>• All media &amp; progress reports</li>
            </ul>

            <p className="mt-3 text-xs text-[color:var(--secondary)]">
              This action cannot be undone. User accounts are kept, but they lose all enrollment and role links to this course.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[color:var(--text)]">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
