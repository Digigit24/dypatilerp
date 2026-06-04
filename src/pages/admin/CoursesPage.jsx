import { BookOpen, GraduationCap, Layers, PenLine, Plus, Trash2, XCircle } from 'lucide-react'
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

export default function CoursesPage() {
  const [courses, setCourses] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = add, course = edit
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [feeStr, setFeeStr] = useState('{"1":50000,"2":50000,"3":50000,"4":50000}')
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
    setFeeStr(JSON.stringify(BLANK.fee_structure, null, 0))
    setDrawerOpen(true)
  }

  const openEdit = (course) => {
    setEditing(course)
    setForm({
      name: course.name, code: course.code, description: course.description || '',
      duration_months: course.duration_months, max_students_per_batch: course.max_students_per_batch,
      fee_structure: course.fee_structure || {}, is_active: course.is_active,
    })
    setFeeStr(JSON.stringify(course.fee_structure || {}, null, 2))
    setDrawerOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      let parsedFees = {}
      try { parsedFees = JSON.parse(feeStr) } catch { parsedFees = form.fee_structure }
      const payload = { ...form, fee_structure: parsedFees }
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

  const handleDelete = async (course) => {
    if (!confirm(`Delete course "${course.name}"? This cannot be undone.`)) return
    try {
      await deleteCourse(course.id)
      setCourses((cs) => cs.filter((c) => c.id !== course.id))
      addToast({ type: 'success', title: 'Course deleted.' })
    } catch (err) {
      addToast({ type: 'error', title: 'Cannot delete course', message: err.response?.data?.message || 'Remove batches first.' })
    }
  }

  const f = (key) => ({
    value: key === 'is_active' ? undefined : form[key],
    checked: key === 'is_active' ? form[key] : undefined,
    onChange: (e) => setForm((p) => ({ ...p, [key]: key === 'is_active' ? e.target.checked : (key === 'duration_months' || key === 'max_students_per_batch' ? Number(e.target.value) : e.target.value) })),
  })

  if (!courses) return <SkeletonCard rows={6} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Courses"
        subtitle="Manage fellowship programs, their batches, and configuration."
        action={
          <button className="btn-primary inline-flex items-center gap-2" onClick={openAdd}>
            <Plus size={17} /> New Course
          </button>
        }
      />

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
                <button
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-red-50 text-[color:var(--muted)] hover:text-red-500"
                  onClick={() => handleDelete(course)} title="Delete course"
                ><Trash2 size={14} /></button>
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
                <Field label='Fee Structure (JSON: {"semester": amount})'>
                  <textarea
                    className="input w-full font-mono text-xs resize-none"
                    rows={4}
                    value={feeStr}
                    onChange={(e) => setFeeStr(e.target.value)}
                    placeholder='{"1":50000,"2":50000,"3":50000,"4":50000}'
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
