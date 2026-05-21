import { ShieldCheck, UserPlus, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'
import { roleLabel } from '../../lib/utils.js'
import { useUiStore } from '../../store/uiStore.js'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'academic_guide', label: 'Academic Guide' },
  { value: 'industry_mentor', label: 'Industry Mentor' },
  { value: 'student', label: 'Student' },
]

const BLANK = { first_name: '', last_name: '', email: '', role: 'coordinator', is_active: true }

export default function UserManagementPage() {
  const [users, setUsers] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const addToast = useUiStore((s) => s.addToast)
  useScrollLock(addOpen)

  useEffect(() => { getUsers().then((r) => setUsers(r.data)) }, [])

  if (!users) return <SkeletonCard rows={8} />

  const f = (key) => ({
    value: key === 'is_active' ? undefined : form[key],
    checked: key === 'is_active' ? form[key] : undefined,
    onChange: (e) => setForm((prev) => ({ ...prev, [key]: key === 'is_active' ? e.target.checked : e.target.value })),
  })

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    const newUser = {
      id: `usr_${Date.now()}`,
      ...form,
      phone: '',
      avatar_url: null,
      date_joined: new Date().toISOString(),
      last_login: null,
    }
    setUsers((prev) => [newUser, ...prev])
    setSaving(false)
    setAddOpen(false)
    addToast({ type: 'success', title: `${form.first_name} ${form.last_name} added. Invite email sent.` })
  }

  const roleCounts = ROLES.map(({ value, label }) => ({ label, count: users.filter((u) => u.role === value).length }))

  return (
    <div className="fade-page">
      <PageHeader
        title="User Management"
        subtitle="Manage admins, coordinators, guides, mentors, and students."
        action={
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => { setForm(BLANK); setAddOpen(true) }}>
            <UserPlus size={17} /> Add User
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {roleCounts.map(({ label, count }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-2xl font-semibold text-[color:var(--text)]">{count}</p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--secondary)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[color:var(--text)]">All Users</h2>
          <p className="text-sm text-[color:var(--secondary)]">{users.length} users in the system</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                {['User', 'Email', 'Role', 'Status', 'Joined', 'Last Login'].map((h) => (
                  <th key={h} className="px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="table-row border-b border-[color:var(--border)]">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--accent-tint)] text-sm font-semibold text-[color:var(--accent)]">
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <p className="font-semibold text-[color:var(--text)]">{u.first_name} {u.last_name}</p>
                    </div>
                  </td>
                  <td className="px-6 text-[color:var(--secondary)]">{u.email}</td>
                  <td className="px-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--text)]">
                      <ShieldCheck size={12} className="text-[color:var(--accent)]" />
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-6"><StatusBadge status={u.is_active ? 'active' : 'inactive'} /></td>
                  <td className="px-6 text-[color:var(--secondary)]">{formatDate(u.date_joined)}</td>
                  <td className="px-6 text-[color:var(--secondary)]">{u.last_login ? formatDate(u.last_login) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add User drawer ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="drawer-panel lg:!w-[min(480px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">System User</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Add New User</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setAddOpen(false)}>
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <UF label="First Name" required>
                    <input className="input w-full" placeholder="First name" required {...f('first_name')} />
                  </UF>
                  <UF label="Last Name" required>
                    <input className="input w-full" placeholder="Last name" required {...f('last_name')} />
                  </UF>
                </div>

                <UF label="Email Address" required>
                  <input className="input w-full" type="email" placeholder="user@dypatil.edu" required {...f('email')} />
                </UF>

                <UF label="User Type / Role" required>
                  <select className="input w-full" required {...f('role')}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </UF>

                <div className="flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">Active Account</p>
                    <p className="mt-0.5 text-xs text-[color:var(--secondary)]">User can log in immediately after creation</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_active}
                    onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_active ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--accent-tint)] p-4">
                  <p className="text-xs font-semibold text-[color:var(--accent)]">Invite will be sent</p>
                  <p className="mt-1 text-sm text-[color:var(--secondary)]">
                    An email with login credentials and onboarding instructions will be sent to the address above once you confirm.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
                <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Adding…' : 'Add User'}
                </button>
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
