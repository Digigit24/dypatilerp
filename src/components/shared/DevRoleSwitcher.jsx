import { ChevronUp, ShieldCheck, UserRoundCog } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROLES } from '../../lib/constants.js'
import { roleLabel } from '../../lib/utils.js'
import { useAuthStore } from '../../store/authStore.js'

const home = {
  admin: '/admin',
  coordinator: '/admin/approvals',
  academic_guide: '/admin/approvals',
  industry_mentor: '/admin/approvals',
  student: '/student/dashboard',
  applicant: '/apply',
}

export default function DevRoleSwitcher() {
  const [open, setOpen] = useState(false)
  const role = useAuthStore((s) => s.role)
  const setRole = useAuthStore((s) => s.setRole)
  const navigate = useNavigate()
  const roles = Object.values(ROLES)

  const switchRole = (nextRole) => {
    setRole(nextRole)
    setOpen(false)
    navigate(home[nextRole])
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-[calc(100vw-2rem)]">
      {open && (
        <div className="mb-3 w-72 overflow-hidden rounded-[28px] bg-[color:var(--card)] p-2 shadow-hover ring-1 ring-[color:var(--border)]">
          <div className="px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Demo Role</p>
            <p className="text-sm text-[color:var(--secondary)]">Jump between role dashboards instantly.</p>
          </div>
          <div className="grid gap-1">
            {roles.map((r) => (
              <button
                key={r}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${role === r ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}
                onClick={() => switchRole(r)}
              >
                <UserRoundCog size={17} />
                <span className="flex-1">{roleLabel(r)}</span>
                {role === r && <ShieldCheck size={16} />}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className="flex items-center gap-3 rounded-full bg-[color:var(--text)] px-4 py-3 text-sm font-semibold text-[color:var(--card)] shadow-hover"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[color:var(--accent)] text-white">D</span>
        <span className="hidden sm:inline">Switch Role: {roleLabel(role)}</span>
        <span className="sm:hidden">{roleLabel(role)}</span>
        <ChevronUp size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  )
}
