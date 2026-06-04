import { Plus, Search, Shield, ShieldCheck, UserMinus, UserPlus, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createUser, deleteUser, getUsers, updateUser } from '../../api/services/userService.js'
import { assignUserRole } from '../../api/services/rolesService.js'
import { getCourses } from '../../api/services/courseService.js'
import { getBatches } from '../../api/services/batchService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'
import { roleLabel } from '../../lib/utils.js'
import { useUiStore } from '../../store/uiStore.js'

const ROLES = ['admin', 'coordinator', 'academic_guide', 'industry_mentor', 'student']
const BLANK_USER = { first_name: '', last_name: '', email: '', password: '', role: 'coordinator', is_active: true }
const BLANK_ROLE  = { role_name: 'coordinator', course_id: '', batch_id: '' }

const parseRoles = (raw) => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') return raw.replace(/^\{|\}$/g, '').split(',').filter(Boolean)
  return []
}

export default function UserManagementPage() {
  const [users, setUsers]         = useState(null)
  const [courses, setCourses]     = useState([])
  const [batches, setBatches]     = useState([])
  const [query, setQuery]         = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [addOpen, setAddOpen]     = useState(false)
  const [roleOpen, setRoleOpen]   = useState(false)
  const [targetUser, setTargetUser] = useState(null)
  const [form, setForm]           = useState(BLANK_USER)
  const [roleForm, setRoleForm]   = useState(BLANK_ROLE)
  const [saving, setSaving]       = useState(false)
  const addToast = useUiStore((s) => s.addToast)
  useScrollLock(addOpen || roleOpen)

  const load = () => getUsers().then((r) => setUsers(r.data || []))

  useEffect(() => {
    load()
    getCourses().then((r) => setCourses(r.data || []))
  }, [])

  useEffect(() => {
    if (roleForm.course_id) {
      getBatches({ course_id: roleForm.course_id }).then((r) => setBatches(r.data || []))
    } else {
      setBatches([])
    }
  }, [roleForm.course_id])

  const filtered = useMemo(() => {
    if (!users) return []
    return users.filter((u) => {
      const roles = parseRoles(u.roles)
      const matchRole = roleFilter === 'all' || roles.includes(roleFilter)
      const q = query.toLowerCase()
      const matchQ = !q || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q)
      return matchRole && matchQ
    })
  }, [users, query, roleFilter])

  const roleCounts = ROLES.map((r) => ({
    value: r, label: roleLabel(r),
    count: (users || []).filter((u) => parseRoles(u.roles).includes(r)).length,
  }))

  // ── Add User ─────────────────────────────────────────────────────────────
  const f = (key) => ({
    value: key === 'is_active' ? undefined : form[key],
    checked: key === 'is_active' ? form[key] : undefined,
    onChange: (e) => setForm((p) => ({ ...p, [key]: key === 'is_active' ? e.target.checked : e.target.value })),
  })

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createUser({ ...form })
      addToast({ type: 'success', title: `${form.first_name} ${form.last_name} added.` })
      setAddOpen(false)
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create user', message: err.response?.data?.message || 'Something went wrong' })
    } finally { setSaving(false) }
  }

  // ── Toggle Active ─────────────────────────────────────────────────────────
  const toggleActive = async (user) => {
    try {
      const r = await updateUser(user.id, { is_active: !user.is_active })
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !user.is_active } : u))
      addToast({ type: 'info', title: `${user.first_name} ${!user.is_active ? 'activated' : 'deactivated'}.` })
    } catch (err) {
      addToast({ type: 'error', title: 'Update failed', message: err.response?.data?.message })
    }
  }

  // ── Assign Role ───────────────────────────────────────────────────────────
  const openRoleAssign = (user) => {
    setTargetUser(user)
    setRoleForm(BLANK_ROLE)
    setRoleOpen(true)
  }

  const handleAssignRole = async (e) => {
    e.preventDefault()
    if (!targetUser) return
    setSaving(true)
    try {
      await assignUserRole(
        targetUser.id, roleForm.role_name,
        roleForm.course_id || null, roleForm.batch_id || null
      )
      addToast({ type: 'success', title: `Role "${roleLabel(roleForm.role_name)}" assigned to ${targetUser.first_name}.` })
      setRoleOpen(false)
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Role assignment failed', message: err.response?.data?.message })
    } finally { setSaving(false) }
  }

  const rf = (key) => ({
    value: roleForm[key],
    onChange: (e) => setRoleForm((p) => ({ ...p, [key]: e.target.value })),
  })

  if (!users) return <SkeletonCard rows={8} />

  return (
    <div className="fade-page">
      <PageHeader
        title="User Management"
        subtitle="Manage all system users, their roles, and course/batch assignments."
        action={
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => { setForm(BLANK_USER); setAddOpen(true) }}>
            <UserPlus size={17} /> Add User
          </button>
        }
      />

      {/* Role count cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {roleCounts.map(({ value, label, count }) => (
          <button
            key={value}
            className={`card p-4 text-center transition hover:border-[color:var(--accent)] ${roleFilter === value ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]' : ''}`}
            onClick={() => setRoleFilter((f) => f === value ? 'all' : value)}
          >
            <p className="text-2xl font-semibold text-[color:var(--text)]">{count}</p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--secondary)]">{label}</p>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">All Users</h2>
            <p className="text-sm text-[color:var(--secondary)]">{filtered.length} of {users.length} users</p>
          </div>
          <label className="flex h-10 w-72 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4">
            <Search size={14} className="text-[color:var(--muted)]" />
            <input className="w-full bg-transparent text-sm outline-none" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>{['User', 'Roles', 'Status', 'Joined', 'Last Login', 'Actions'].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const roles = parseRoles(u.roles)
                return (
                  <tr key={u.id} className="table-row border-b border-[color:var(--border)]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-sm font-semibold text-[color:var(--accent)]">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-[color:var(--text)]">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-[color:var(--secondary)]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5">
                      <div className="flex flex-wrap gap-1">
                        {roles.length > 0
                          ? roles.map((r) => (
                            <span key={r} className="inline-flex items-center gap-1 rounded-full bg-[color:var(--surface)] px-2.5 py-1 text-xs font-semibold text-[color:var(--text)]">
                              <ShieldCheck size={10} className="text-[color:var(--accent)]" />
                              {roleLabel(r)}
                            </span>
                          ))
                          : <span className="text-[color:var(--muted)] text-xs">No role</span>
                        }
                      </div>
                    </td>
                    <td className="px-5"><StatusBadge status={u.is_active ? 'active' : 'inactive'} /></td>
                    <td className="px-5 text-[color:var(--secondary)]">{formatDate(u.created_at)}</td>
                    <td className="px-5 text-[color:var(--secondary)]">{u.last_login_at ? formatDate(u.last_login_at) : '—'}</td>
                    <td className="px-5">
                      <div className="flex items-center gap-1">
                        <button
                          className="flex items-center gap-1.5 rounded-full bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white transition"
                          onClick={() => openRoleAssign(u)}
                          title="Assign role"
                        >
                          <Shield size={11} /> Role
                        </button>
                        <button
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${u.is_active ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                          onClick={() => toggleActive(u)}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {u.is_active ? <UserMinus size={11} /> : <UserPlus size={11} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add User Drawer ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="drawer-panel lg:!w-[min(480px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">New User</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Add System User</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setAddOpen(false)}><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <UF label="First Name" required><input className="input w-full" placeholder="First name" required {...f('first_name')} /></UF>
                  <UF label="Last Name" required><input className="input w-full" placeholder="Last name" required {...f('last_name')} /></UF>
                </div>
                <UF label="Email" required><input className="input w-full" type="email" placeholder="user@dypatil.edu" required {...f('email')} /></UF>
                <UF label="Password" required>
                  <input className="input w-full" type="password" placeholder="Min 8 characters" minLength={8} required {...f('password')} />
                </UF>
                <UF label="Initial Role">
                  <select className="input w-full" {...f('role')}>
                    {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </UF>
                <div className="flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">Active Account</p>
                    <p className="mt-0.5 text-xs text-[color:var(--secondary)]">User can log in immediately</p>
                  </div>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_active ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
                <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => setAddOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Role Drawer ── */}
      {roleOpen && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setRoleOpen(false)}>
          <div className="drawer-panel lg:!w-[min(440px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Assign Role</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{targetUser.first_name} {targetUser.last_name}</h2>
                <p className="text-sm text-[color:var(--secondary)]">{targetUser.email}</p>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setRoleOpen(false)}><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleAssignRole} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
                <div className="rounded-3xl bg-[color:var(--surface)] p-4 text-sm text-[color:var(--secondary)]">
                  Roles can be scoped globally or to a specific course and batch. Leave course/batch empty for a global role.
                </div>
                <UF label="Role" required>
                  <select className="input w-full" required {...rf('role_name')}>
                    {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </UF>
                <UF label="Course (optional — leave empty for global)">
                  <select className="input w-full" {...rf('course_id')}>
                    <option value="">Global (all courses)</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </UF>
                {roleForm.course_id && batches.length > 0 && (
                  <UF label="Batch (optional — leave empty for all batches in course)">
                    <select className="input w-full" {...rf('batch_id')}>
                      <option value="">All batches in course</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </UF>
                )}
              </div>
              <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
                <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => setRoleOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Assigning…' : 'Assign Role'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function UF({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[color:var(--text)]">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
