/**
 * Assignments (admin/coordinator) — define per-batch assignments with
 * mandatory/optional approval depth. Grouped by semester for fast planning.
 */
import {
  CalendarDays, CheckCircle2, ClipboardList, Loader2, PenLine, Plus, Trash2, Users, XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  createAssignment, deleteAssignment, getAssignments, updateAssignment,
} from '../../api/services/assignmentService.js'
import { getBatches } from '../../api/services/batchService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'
import useScrollLock from '../../hooks/useScrollLock.js'

const BLANK = { title: '', description: '', semester: 1, due_date: '', is_mandatory: true, is_published: true, batch_id: '' }

export default function AssignmentsPage() {
  const { currentCourse } = useCourseStore()
  const addToast = useUiStore((s) => s.addToast)
  const [items, setItems] = useState(null)
  const [batches, setBatches] = useState([])
  const [batchFilter, setBatchFilter] = useState('')
  const [drawer, setDrawer] = useState(null)  // null | { item? }
  useScrollLock(!!drawer)

  const load = () => {
    if (!currentCourse?.id) { setItems([]); return }
    const params = { course_id: currentCourse.id }
    if (batchFilter) params.batch_id = batchFilter
    getAssignments(params).then((r) => setItems(r.data || []))
  }
  useEffect(() => {
    if (!currentCourse?.id) { setItems([]); return }
    getBatches({ course_id: currentCourse.id }).then((r) => setBatches(r.data || [])).catch(() => {})
  }, [currentCourse?.id])
  useEffect(() => { setItems(null); load() }, [currentCourse?.id, batchFilter])

  const handleDelete = async (a) => {
    if (!confirm(`Delete assignment "${a.title}"? Existing submissions stay intact.`)) return
    try {
      await deleteAssignment(a.id)
      addToast({ type: 'success', title: 'Assignment deleted.' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message })
    }
  }

  const togglePublish = async (a) => {
    await updateAssignment(a.id, { is_published: !a.is_published })
    setItems((xs) => xs.map((x) => x.id === a.id ? { ...x, is_published: !a.is_published } : x))
  }

  if (!currentCourse?.id) {
    return (
      <div className="fade-page">
        <PageHeader title="Assignments" subtitle="Create per-batch assignments with mandatory or optional approval flows." />
        <div className="card p-14 text-center text-sm text-[color:var(--secondary)]">Select a course from the header first.</div>
      </div>
    )
  }
  if (!items) return <SkeletonCard rows={5} />

  const bySemester = items.reduce((acc, a) => {
    const key = a.semester || 1
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="fade-page">
      <PageHeader
        title="Assignments"
        subtitle="Mandatory assignments run the full 3-layer approval chain; optional ones need only coordinator sign-off."
        action={
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => setDrawer({})}>
            <Plus size={16} /> New Assignment
          </button>
        }
      />

      {/* Batch filter */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setBatchFilter('')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${!batchFilter ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
          All Batches
        </button>
        {batches.map((b) => (
          <button key={b.id} onClick={() => setBatchFilter(b.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${batchFilter === b.id ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
            {b.code || b.name}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <ClipboardList size={30} className="text-[color:var(--muted)]" />
          <p className="text-sm font-semibold text-[color:var(--text)]">No assignments yet</p>
          <p className="text-xs text-[color:var(--secondary)]">Create the semester's assignment list so students can start submitting.</p>
        </div>
      ) : (
        Object.keys(bySemester).sort((a, b) => a - b).map((sem) => (
          <section key={sem} className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Semester {sem}</h2>
            <div className="space-y-3">
              {bySemester[sem].map((a) => (
                <div key={a.id} className="card group flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[color:var(--text)]">{a.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.is_mandatory ? 'bg-red-100 text-red-700' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
                        {a.is_mandatory ? 'Mandatory · 3-layer approval' : 'Optional · coordinator only'}
                      </span>
                    </div>
                    {a.description && <p className="mt-1 line-clamp-1 text-xs text-[color:var(--secondary)]">{a.description}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[color:var(--muted)]">
                      <span className="inline-flex items-center gap-1"><Users size={11} /> {a.batch_name || a.batch_code}</span>
                      {a.due_date && <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> Due {new Date(a.due_date).toLocaleDateString('en-IN')}</span>}
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={11} /> {a.submission_count}/{a.student_count} submitted · {a.approved_count} approved
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => togglePublish(a)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${a.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-[color:var(--surface)] text-[color:var(--muted)]'}`}>
                      {a.is_published ? 'Published' : 'Hidden'}
                    </button>
                    <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                      <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => setDrawer({ item: a })} title="Edit"><PenLine size={13} /></button>
                      <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--muted)] hover:bg-red-50 hover:text-red-500" onClick={() => handleDelete(a)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {drawer && (
        <AssignmentDrawer
          item={drawer.item}
          course={currentCourse}
          batches={batches}
          defaultBatch={batchFilter}
          onClose={(changed) => { setDrawer(null); if (changed) load() }}
          addToast={addToast}
        />
      )}
    </div>
  )
}

// ─── Create / Edit drawer ─────────────────────────────────────────────────────
function AssignmentDrawer({ item, course, batches, defaultBatch, onClose, addToast }) {
  const [form, setForm] = useState(() => item ? {
    title: item.title, description: item.description || '', semester: item.semester || 1,
    due_date: item.due_date ? item.due_date.slice(0, 10) : '',
    is_mandatory: !!item.is_mandatory, is_published: !!item.is_published,
    batch_id: item.batch_id,
  } : { ...BLANK, batch_id: defaultBatch || batches[0]?.id || '' })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.batch_id) return
    setSaving(true)
    try {
      const payload = {
        course_id: course.id,
        batch_id: form.batch_id,
        title: form.title.trim(),
        description: form.description.trim(),
        semester: Number(form.semester) || 1,
        due_date: form.due_date || null,
        is_mandatory: form.is_mandatory,
        is_published: form.is_published,
      }
      if (item) await updateAssignment(item.id, payload)
      else await createAssignment(payload)
      addToast({ type: 'success', title: item ? 'Assignment updated.' : 'Assignment created.' })
      onClose(true)
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message || err.message })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => onClose(false)}>
      <div className="drawer-panel lg:!w-[min(520px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{item ? 'Edit Assignment' : 'New Assignment'}</p>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{item ? item.title : `For ${course.code}`}</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => onClose(false)}><XCircle size={18} /></button>
        </div>
        <form onSubmit={save} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Title<span className="ml-1 text-red-500">*</span></span>
              <input className="input mt-1.5 w-full" required placeholder="Literature Review — Chapter 1" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Description</span>
              <textarea className="input mt-1.5 w-full resize-none" rows={3} placeholder="Scope, expectations, format to follow…" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block sm:col-span-1">
                <span className="text-sm font-semibold text-[color:var(--text)]">Batch<span className="ml-1 text-red-500">*</span></span>
                <select className="input mt-1.5 w-full" required value={form.batch_id} onChange={(e) => setForm((p) => ({ ...p, batch_id: e.target.value }))}>
                  <option value="">Select…</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[color:var(--text)]">Semester</span>
                <input className="input mt-1.5 w-full" type="number" min={1} max={12} value={form.semester} onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[color:var(--text)]">Due date</span>
                <input className="input mt-1.5 w-full" type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">Mandatory assignment</p>
                <p className="text-xs text-[color:var(--secondary)]">
                  {form.is_mandatory ? 'Full approval chain: coordinator → academic guide → industry mentor' : 'Light approval: coordinator only'}
                </p>
              </div>
              <button type="button" onClick={() => setForm((p) => ({ ...p, is_mandatory: !p.is_mandatory }))}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_mandatory ? 'bg-red-500' : 'bg-[color:var(--border)]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_mandatory ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">Published</p>
                <p className="text-xs text-[color:var(--secondary)]">Visible to students in their Assignments page</p>
              </div>
              <button type="button" onClick={() => setForm((p) => ({ ...p, is_published: !p.is_published }))}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_published ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
          <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
            <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {item ? 'Save Changes' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
