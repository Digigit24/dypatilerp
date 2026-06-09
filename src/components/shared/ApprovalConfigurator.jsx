/**
 * ApprovalConfigurator — visual builder for a batch's dynamic approval workflow.
 *
 * Props:
 *  stages     – current stages array (controlled)
 *  onChange   – called with new stages array
 *  users      – list of selectable users [{ id, first_name, last_name, email }]
 *  readOnly   – disable editing (optional)
 */
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { roleLabel } from '../../lib/utils.js'

const STAGE_TYPES = [
  { value: 'student_guide', label: "Student's Assigned Guide" },
  { value: 'specific_user', label: 'Specific User' },
  { value: 'role',          label: 'Any User with Role' },
]
const GUIDE_TYPES  = [{ value: 'academic', label: 'Academic Guide' }, { value: 'industry', label: 'Industry Mentor' }]
const ROLE_OPTIONS = ['coordinator', 'academic_guide', 'industry_mentor', 'admin']

const BLANK_STAGE = { name: '', type: 'student_guide', guide_type: 'academic', user_id: '', role: 'coordinator' }

export default function ApprovalConfigurator({ stages = [], onChange, users = [], readOnly = false }) {
  const [addOpen, setAddOpen] = useState(false)
  const [editIdx, setEditIdx] = useState(null) // index being edited
  const [form, setForm] = useState(BLANK_STAGE)

  const save = () => {
    if (!form.name.trim()) return
    const reIndexed = [...stages]
    const entry = {
      name: form.name.trim(),
      type: form.type,
      ...(form.type === 'student_guide' ? { guide_type: form.guide_type } : {}),
      ...(form.type === 'specific_user'  ? { user_id: form.user_id } : {}),
      ...(form.type === 'role'           ? { role: form.role } : {}),
    }
    if (editIdx !== null) {
      reIndexed[editIdx] = { ...entry, order_index: editIdx + 1 }
      setEditIdx(null)
    } else {
      reIndexed.push({ ...entry, order_index: reIndexed.length + 1 })
    }
    onChange(reIndexed.map((s, i) => ({ ...s, order_index: i + 1 })))
    setForm(BLANK_STAGE)
    setAddOpen(false)
  }

  const remove = (i) => onChange(stages.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order_index: idx + 1 })))

  const move = (i, dir) => {
    const arr = [...stages]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    onChange(arr.map((s, idx) => ({ ...s, order_index: idx + 1 })))
  }

  const openEdit = (i) => {
    const s = stages[i]
    setForm({ name: s.name, type: s.type, guide_type: s.guide_type || 'academic', user_id: s.user_id || '', role: s.role || 'coordinator' })
    setEditIdx(i)
    setAddOpen(true)
  }

  const ff = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  })

  const resolveLabel = (stage) => {
    if (stage.type === 'student_guide') return `Student's ${stage.guide_type === 'academic' ? 'Academic Guide' : 'Industry Mentor'}`
    if (stage.type === 'specific_user') {
      const u = users.find((x) => x.id === stage.user_id)
      return u ? `${u.first_name} ${u.last_name}` : stage.user_id || 'Unknown user'
    }
    if (stage.type === 'role') return `Any ${roleLabel(stage.role)}`
    return '—'
  }

  return (
    <div>
      {/* Stage list */}
      {stages.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-[color:var(--border)] py-8 text-center text-sm text-[color:var(--muted)]">
          No stages configured — uses default 3-stage chain (Coordinator → Academic Guide → Industry Mentor)
        </div>
      )}

      <div className="space-y-2">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
            {/* Order badge */}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-sm font-bold text-[color:var(--accent)]">
              {i + 1}
            </span>

            {/* Stage info */}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[color:var(--text)]">{stage.name}</p>
              <p className="text-xs text-[color:var(--secondary)]">{resolveLabel(stage)}</p>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-[color:var(--surface-strong)] text-[color:var(--muted)] disabled:opacity-30"
                  onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={13} /></button>
                <button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-[color:var(--surface-strong)] text-[color:var(--muted)] disabled:opacity-30"
                  onClick={() => move(i, 1)} disabled={i === stages.length - 1}><ArrowDown size={13} /></button>
                <button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-[color:var(--surface-strong)] text-[color:var(--secondary)]"
                  onClick={() => openEdit(i)}><span className="text-xs font-semibold">Edit</span></button>
                <button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-red-50 text-[color:var(--muted)] hover:text-red-500"
                  onClick={() => remove(i)}><Trash2 size={13} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add stage button */}
      {!readOnly && !addOpen && (
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[color:var(--border)] py-3 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
          onClick={() => { setForm(BLANK_STAGE); setEditIdx(null); setAddOpen(true) }}
        >
          <Plus size={15} /> Add Stage
        </button>
      )}

      {/* Stage form (inline) */}
      {addOpen && (
        <div className="mt-3 space-y-3 rounded-3xl border-2 border-[color:var(--accent-tint)] bg-[color:var(--surface)] p-5">
          <p className="text-sm font-bold text-[color:var(--accent)]">{editIdx !== null ? 'Edit Stage' : 'New Stage'}</p>

          <label className="block">
            <span className="text-xs font-semibold text-[color:var(--text)]">Stage Name *</span>
            <input className="input mt-1 w-full" placeholder="e.g. Supervisor Review, HOD Approval" {...ff('name')} />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-[color:var(--text)]">Reviewer Type</span>
            <select className="input mt-1 w-full" {...ff('type')}>
              {STAGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          {form.type === 'student_guide' && (
            <label className="block">
              <span className="text-xs font-semibold text-[color:var(--text)]">Guide Type</span>
              <select className="input mt-1 w-full" {...ff('guide_type')}>
                {GUIDE_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </label>
          )}

          {form.type === 'specific_user' && (
            <label className="block">
              <span className="text-xs font-semibold text-[color:var(--text)]">Select User</span>
              <select className="input mt-1 w-full" {...ff('user_id')}>
                <option value="">— pick a user —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>)}
              </select>
            </label>
          )}

          {form.type === 'role' && (
            <label className="block">
              <span className="text-xs font-semibold text-[color:var(--text)]">Role</span>
              <select className="input mt-1 w-full" {...ff('role')}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </label>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" className="h-9 flex-1 rounded-[14px] bg-[color:var(--surface-strong)] text-sm font-semibold text-[color:var(--secondary)]"
              onClick={() => { setAddOpen(false); setEditIdx(null) }}>Cancel</button>
            <button type="button" className="btn-primary flex-1 h-9 text-sm" onClick={save}>
              {editIdx !== null ? 'Update Stage' : 'Add Stage'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
