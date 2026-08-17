/**
 * Milestones (admin/coordinator) — define per-batch milestones, grouped by
 * semester for fast planning. Mirrors AssignmentsPage.jsx deliberately: same
 * shape as an assignment (a batch-scoped definition scholars submit
 * against), just with a single approver instead of assignments' none/chain
 * choice. No due date field — the semester itself governs timing.
 */
import {
  CheckCircle2, Loader2, PenLine, Plus, Target, Trash2, Users, XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  bulkCreateTargets, deleteTarget, getTargets, updateTarget,
} from '../../api/services/targetService.js'
import { getBatches } from '../../api/services/batchService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'

const BLANK = { name: '', description: '', semester: 1, is_mandatory: true, batch_id: '' }

export default function MilestonesPage() {
  const { currentCourse } = useCourseStore()
  const addToast = useUiStore((s) => s.addToast)
  const [items, setItems] = useState(null)
  const [batches, setBatches] = useState([])
  const [batchFilter, setBatchFilter] = useState('')
  const [drawer, setDrawer] = useState(null)  // null | { item? }

  const load = () => {
    if (!currentCourse?.id) { setItems([]); return }
    const params = { course_id: currentCourse.id }
    if (batchFilter) params.batch_id = batchFilter
    getTargets(params).then((r) => setItems(r.data || []))
  }
  useEffect(() => {
    if (!currentCourse?.id) { setItems([]); return }
    getBatches({ course_id: currentCourse.id }).then((r) => setBatches(r.data || [])).catch(() => {})
  }, [currentCourse?.id])
  useEffect(() => { setItems(null); load() }, [currentCourse?.id, batchFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (t) => {
    if (!confirm(`Delete milestone "${t.name}"? Refused if a scholar has already submitted against it.`)) return
    try {
      await deleteTarget(t.id)
      addToast({ type: 'success', title: 'Milestone deleted.' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message })
    }
  }

  if (!currentCourse?.id) {
    return (
      <div className="fade-page">
        <PageHeader title="Milestones" subtitle="Create per-batch milestones — scholars submit against them, one approver signs off." />
        <div className="card p-14 text-center text-sm text-[color:var(--secondary)]">Select a course from the header first.</div>
      </div>
    )
  }
  if (!items) return <SkeletonCard rows={5} />

  const bySemester = items.reduce((acc, t) => {
    const key = t.semester || 1
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <div className="fade-page">
      <PageHeader
        title="Milestones"
        subtitle="Each milestone is created once per batch — scholars submit against it, a single approver signs off."
        action={
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => setDrawer({})}>
            <Plus size={16} /> New Milestone
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
          <Target size={30} className="text-[color:var(--muted)]" />
          <p className="text-sm font-semibold text-[color:var(--text)]">No milestones yet</p>
          <p className="text-xs text-[color:var(--secondary)]">Create the semester's milestone list so scholars can start submitting.</p>
        </div>
      ) : (
        Object.keys(bySemester).sort((a, b) => a - b).map((sem) => (
          <section key={sem} className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Semester {sem}</h2>
            <div className="space-y-3">
              {bySemester[sem].map((t) => (
                <div key={t.id} className="card group flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[color:var(--text)]">{t.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.is_mandatory ? 'bg-red-100 text-red-700' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
                        {t.is_mandatory ? 'Mandatory' : 'Optional'} · single approver
                      </span>
                    </div>
                    {t.description && <p className="mt-1 line-clamp-1 text-xs text-[color:var(--secondary)]">{t.description}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[color:var(--muted)]">
                      <span className="inline-flex items-center gap-1"><Users size={11} /> {t.batch_name || t.batch_code}</span>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={11} /> {t.submission_count}/{t.student_count} submitted · {t.approved_count} approved
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                      <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => setDrawer({ item: t })} title="Edit"><PenLine size={13} /></button>
                      <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--muted)] hover:bg-red-50 hover:text-red-500" onClick={() => handleDelete(t)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {drawer && (
        <MilestoneDrawer
          item={drawer.item}
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
function MilestoneDrawer({ item, batches, defaultBatch, onClose, addToast }) {
  const [form, setForm] = useState(() => item ? {
    name: item.name, description: item.description || '', semester: item.semester || 1,
    is_mandatory: !!item.is_mandatory, batch_id: item.batch_id,
  } : { ...BLANK, batch_id: defaultBatch || batches[0]?.id || '' })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.batch_id) return
    setSaving(true)
    try {
      if (item) {
        await updateTarget(item.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          semester: Number(form.semester) || 1,
          is_mandatory: form.is_mandatory,
        })
        addToast({ type: 'success', title: 'Milestone updated.' })
      } else {
        const r = await bulkCreateTargets({
          batch_id: form.batch_id,
          semester: Number(form.semester) || 1,
          targets: [{ name: form.name.trim(), description: form.description.trim() || undefined, is_mandatory: form.is_mandatory }],
        })
        addToast({ type: 'success', title: r.message || 'Milestone created.' })
      }
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{item ? 'Edit Milestone' : 'New Milestone'}</p>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{item ? item.name : 'Create a milestone'}</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => onClose(false)}><XCircle size={18} /></button>
        </div>
        <form onSubmit={save} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Name<span className="ml-1 text-red-500">*</span></span>
              <input
                className="input mt-1.5 w-full"
                required
                autoFocus
                placeholder="Literature Review — Chapter 1"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Description</span>
              <textarea className="input mt-1.5 w-full resize-none" rows={3} placeholder="Scope, expectations, format to follow…" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-[color:var(--text)]">Batch<span className="ml-1 text-red-500">*</span></span>
                <select className="input mt-1.5 w-full" required disabled={!!item} value={form.batch_id} onChange={(e) => setForm((p) => ({ ...p, batch_id: e.target.value }))}>
                  <option value="">Select…</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[color:var(--text)]">Semester</span>
                <input className="input mt-1.5 w-full" type="number" min={1} max={12} value={form.semester} onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))} />
                <span className="mt-1 block text-[10px] text-[color:var(--muted)]">No due date — the semester itself governs timing.</span>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">Mandatory milestone</p>
                <p className="text-xs text-[color:var(--secondary)]">Single approver signs off (configured per batch in the Admin Wizard)</p>
              </div>
              <button type="button" onClick={() => setForm((p) => ({ ...p, is_mandatory: !p.is_mandatory }))}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_mandatory ? 'bg-red-500' : 'bg-[color:var(--border)]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_mandatory ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
          <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
            <button type="button" className="h-11 flex-1 rounded-md bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {item ? 'Save Changes' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
