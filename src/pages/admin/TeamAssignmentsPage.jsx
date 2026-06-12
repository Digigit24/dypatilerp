/**
 * Team Assignments — the admin setup wizard for staffing a course.
 *
 * Per course (from the header context):
 *   · course-level team (coordinators/guides across all batches)
 *   · per-batch team — assign a coordinator, academic guide, industry mentor
 *   · inline user creation, one-click unassign
 *   · jump to each batch's approval chain config
 *
 * Assignments are user_roles rows scoped by course/batch — exactly what the
 * scoped permission system (scope = course / batch) keys on.
 */
import {
  CheckCircle2, ClipboardCheck, Layers, Loader2, Plus, Shield, UserPlus, Users, X, XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAssignment, getAssignments, getRoles, removeAssignment } from '../../api/services/rolesService.js'
import { createUser, getUsers } from '../../api/services/userService.js'
import { getBatches } from '../../api/services/batchService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'
import useScrollLock from '../../hooks/useScrollLock.js'

const STAFF_ROLES = ['coordinator', 'academic_guide', 'industry_mentor']

// Postgres text[] can arrive as a real array or as "{a,b}" depending on the driver
const rolesOf = (u) => {
  if (Array.isArray(u.roles)) return u.roles
  if (typeof u.roles === 'string') return u.roles.replace(/^\{|\}$/g, '').split(',').filter(Boolean)
  return []
}
const ROLE_TONES = {
  coordinator: 'bg-indigo-50 text-indigo-700',
  academic_guide: 'bg-emerald-50 text-emerald-700',
  industry_mentor: 'bg-amber-50 text-amber-700',
  admin: 'bg-red-50 text-red-600',
}

export default function TeamAssignmentsPage({ courseOverride = null, embedded = false }) {
  const { currentCourse: headerCourse } = useCourseStore()
  const currentCourse = courseOverride || headerCourse
  const addToast = useUiStore((s) => s.addToast)
  const navigate = useNavigate()

  const [assignments, setAssignments] = useState(null)
  const [batches, setBatches] = useState([])
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [assignModal, setAssignModal] = useState(null)   // { batch } | { batch: null }
  const [createUserOpen, setCreateUserOpen] = useState(false)
  useScrollLock(!!assignModal || createUserOpen)

  const load = () => {
    if (!currentCourse?.id) { setAssignments([]); return }
    getAssignments(currentCourse.id).then((r) => setAssignments(r.data || []))
    getBatches({ course_id: currentCourse.id }).then((r) => setBatches(r.data || [])).catch(() => {})
  }

  useEffect(() => {
    setAssignments(null)
    load()
    getRoles().then((r) => setRoles((r.data || []).filter((x) => STAFF_ROLES.includes(x.name))))
    getUsers({ limit: 500 }).then((r) => setUsers(r.data || [])).catch(() => {})
  }, [currentCourse?.id])

  const unassign = async (a) => {
    if (!confirm(`Remove ${a.first_name} ${a.last_name} as ${a.role_display}${a.batch_name ? ` of ${a.batch_name}` : ''}?`)) return
    try {
      await removeAssignment(a.id)
      addToast({ type: 'success', title: 'Assignment removed.' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to remove', message: err.response?.data?.message })
    }
  }

  if (!currentCourse?.id) {
    return (
      <div className={embedded ? '' : 'fade-page'}>
        {!embedded && <PageHeader title="Team Assignments" subtitle="Assign coordinators, guides and mentors to courses and batches." />}
        <div className="card p-14 text-center text-sm text-[color:var(--secondary)]">Select a course first.</div>
      </div>
    )
  }
  if (!assignments) return <SkeletonCard rows={6} />

  const courseLevel = assignments.filter((a) => !a.batch_id)
  const byBatch = (batchId) => assignments.filter((a) => a.batch_id === batchId)

  return (
    <div className={embedded ? '' : 'fade-page'}>
      {!embedded && (
        <PageHeader
          title="Team Assignments"
          subtitle={`Staff ${currentCourse.name}: scoped permissions follow these assignments — a batch coordinator manages that batch only.`}
        />
      )}
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-xs text-[color:var(--secondary)]">
          Scoped permissions follow these assignments — a batch coordinator manages that batch only.
        </p>
        <button
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
          onClick={() => setCreateUserOpen(true)}
        >
          <UserPlus size={15} /> Create User
        </button>
      </div>

      {/* ── Course-level team ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><Shield size={16} /></span>
            <div>
              <p className="text-sm font-semibold text-[color:var(--text)]">Course-level Team</p>
              <p className="text-[11px] text-[color:var(--secondary)]">Access to every batch in {currentCourse.code}</p>
            </div>
          </div>
          <button className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs" onClick={() => setAssignModal({ batch: null })}>
            <Plus size={13} /> Assign
          </button>
        </div>
        <AssignmentChips items={courseLevel} onRemove={unassign} empty="No course-level staff yet." />
      </div>

      {/* ── Per-batch teams ── */}
      <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Batch Teams</h2>
      {batches.length === 0 ? (
        <div className="card p-10 text-center text-sm text-[color:var(--secondary)]">No batches in this course yet — create one in Batches first.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {batches.map((b) => {
            const team = byBatch(b.id)
            const hasCoordinator = team.some((t) => t.role_name === 'coordinator')
            return (
              <div key={b.id} className="card p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--surface)] text-[color:var(--secondary)]"><Layers size={16} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--text)]">{b.name}</p>
                      <p className="text-[11px] text-[color:var(--secondary)]">{b.code} · {b.status}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                      onClick={() => navigate('/admin/batches')}
                      title="Configure this batch's approval chain"
                    >
                      <ClipboardCheck size={12} /> Approval Chain
                    </button>
                    <button className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => setAssignModal({ batch: b })}>
                      <Plus size={13} /> Assign
                    </button>
                  </div>
                </div>
                {!hasCoordinator && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                    No coordinator assigned — submissions for this batch have no first approver.
                  </p>
                )}
                <AssignmentChips items={team} onRemove={unassign} empty="Nobody assigned to this batch yet." />
              </div>
            )
          })}
        </div>
      )}

      {assignModal && (
        <AssignModal
          batch={assignModal.batch}
          course={currentCourse}
          roles={roles}
          users={users}
          onClose={(changed) => { setAssignModal(null); if (changed) load() }}
          addToast={addToast}
        />
      )}
      {createUserOpen && (
        <CreateUserModal
          roles={roles}
          course={currentCourse}
          batches={batches}
          onClose={(created) => {
            setCreateUserOpen(false)
            if (created) {
              getUsers({ limit: 500 }).then((r) => setUsers(r.data || []))
              load()
            }
          }}
          addToast={addToast}
        />
      )}
    </div>
  )
}

// ─── Assignment chips ────────────────────────────────────────────────────────────
function AssignmentChips({ items, onRemove, empty }) {
  if (!items.length) return <p className="mt-3 text-xs text-[color:var(--muted)]">{empty}</p>
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((a) => (
        <span key={a.id} className={`group flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-xs font-semibold ${ROLE_TONES[a.role_name] || 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
          <Users size={11} />
          {a.first_name} {a.last_name}
          <span className="opacity-70">· {a.role_display}</span>
          <button
            onClick={() => onRemove(a)}
            className="grid h-5 w-5 place-items-center rounded-full opacity-0 transition hover:bg-black/10 group-hover:opacity-100"
            title="Remove assignment"
          >
            <X size={10} />
          </button>
        </span>
      ))}
    </div>
  )
}

// ─── Assign modal ────────────────────────────────────────────────────────────────
function AssignModal({ batch, course, roles, users, onClose, addToast }) {
  const [userSearch, setUserSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id || '')
  const [busy, setBusy] = useState(false)

  const staffUsers = users.filter((u) => {
    const q = userSearch.toLowerCase()
    const name = `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`.toLowerCase()
    const userRoles = rolesOf(u)
    const isStudentOnly = userRoles.length > 0 && userRoles.every((r) => ['student', 'applicant'].includes(r))
    return !isStudentOnly && (!q || name.includes(q))
  })

  const confirm = async () => {
    if (!userId || !roleId) return
    setBusy(true)
    try {
      await createAssignment({ user_id: userId, role_id: roleId, course_id: course.id, batch_id: batch?.id || null })
      addToast({ type: 'success', title: `Assigned${batch ? ` to ${batch.name}` : ' at course level'}.` })
      onClose(true)
    } catch (err) {
      addToast({ type: 'error', title: 'Assignment failed', message: err.response?.data?.message })
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => onClose(false)}>
      <div className="w-full max-w-md rounded-[24px] bg-[color:var(--card)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Assign Staff</h2>
            <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
              {batch ? `${batch.name} (${batch.code})` : `${course.name} — all batches`}
            </p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => onClose(false)}><XCircle size={16} /></button>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-[color:var(--text)]">Role</span>
          <select className="input mt-1.5 w-full" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="text-sm font-semibold text-[color:var(--text)]">User</span>
          <input className="input mt-1.5 w-full text-sm" placeholder="Search staff by name or email…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
        </label>
        <div className="mt-2 max-h-44 divide-y divide-[color:var(--border)] overflow-y-auto rounded-xl border border-[color:var(--border)]">
          {staffUsers.length === 0 && <p className="py-4 text-center text-xs text-[color:var(--secondary)]">No matching staff users. Use "Create User" first.</p>}
          {staffUsers.slice(0, 30).map((u) => (
            <label key={u.id} className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition hover:bg-[color:var(--surface)] ${userId === u.id ? 'bg-[color:var(--accent-tint)]' : ''}`}>
              <input type="radio" name="assign_user" className="h-3.5 w-3.5 accent-[color:var(--accent)]" checked={userId === u.id} onChange={() => setUserId(u.id)} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[color:var(--text)]">{u.first_name} {u.last_name}</span>
                <span className="block truncate text-[11px] text-[color:var(--secondary)]">{u.email} · {rolesOf(u).join(', ') || 'no roles'}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn-primary inline-flex items-center gap-2 text-sm" disabled={!userId || !roleId || busy} onClick={confirm}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Assign
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create user modal ───────────────────────────────────────────────────────────
function CreateUserModal({ roles, course, batches, onClose, addToast }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', role_id: roles[0]?.id || '', batch_id: '' })
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const u = await createUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      if (form.role_id && u.data?.id) {
        await createAssignment({
          user_id: u.data.id,
          role_id: form.role_id,
          course_id: course.id,
          batch_id: form.batch_id || null,
        })
      }
      addToast({ type: 'success', title: `User created${form.role_id ? ' and assigned' : ''}.` })
      onClose(true)
    } catch (err) {
      addToast({ type: 'error', title: 'Create failed', message: err.response?.data?.message })
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => onClose(false)}>
      <form className="w-full max-w-md rounded-[24px] bg-[color:var(--card)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Create User</h2>
        <p className="mt-0.5 text-xs text-[color:var(--secondary)]">Creates the account and (optionally) assigns it straight into {course.code}.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input className="input" required placeholder="First name" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
          <input className="input" required placeholder="Last name" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
          <input className="input col-span-2" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="input col-span-2" required type="password" minLength={6} placeholder="Temporary password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          <select className="input" value={form.role_id} onChange={(e) => setForm((p) => ({ ...p, role_id: e.target.value }))}>
            <option value="">No role yet</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}
          </select>
          <select className="input" value={form.batch_id} onChange={(e) => setForm((p) => ({ ...p, batch_id: e.target.value }))}>
            <option value="">Course-level (all batches)</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => onClose(false)}>Cancel</button>
          <button type="submit" className="btn-primary inline-flex items-center gap-2 text-sm" disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Create
          </button>
        </div>
      </form>
    </div>
  )
}
