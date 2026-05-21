import { NavLink } from 'react-router-dom'
export default function Sidebar({ sections, footer, width = 260, role, collapsed = false, mobileOpen = false, onClose }) {
  return (
    <aside
      className={`sidebar-shell fixed bottom-5 left-5 top-5 z-40 rounded-[30px] p-4 transition-all duration-300 max-[900px]:bottom-3 max-[900px]:top-3 ${mobileOpen ? 'max-[900px]:translate-x-0' : 'max-[900px]:-translate-x-[115%]'}`}
      style={{ width: collapsed ? 88 : width }}
      aria-label="Sidebar navigation"
    >
      <div className={`mb-8 flex items-start gap-3 px-2 pt-1 ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#171717] font-semibold text-white">D</div>
        <div className={`min-w-0 ${collapsed ? 'hidden' : ''}`}>
          <div className="text-lg font-bold leading-tight tracking-tight text-[color:var(--text)]">DY PERF</div>
          <div className="mt-1 text-[11px] leading-snug text-[color:var(--secondary)]">PD Patil Education &<br />Research Foundation</div>
          {role && <div className="mt-3 inline-flex rounded-full bg-[color:var(--accent-tint)] px-3 py-1 text-[11px] font-semibold text-[color:var(--accent)]">{role}</div>}
        </div>
      </div>

      <nav className="max-h-[calc(100vh-230px)] space-y-3 overflow-auto pb-8 pr-1">
        {sections.map((section) => (
          <div key={section.title}>
            {section.title !== 'HOME' && !collapsed && <p className="mb-1 px-4 text-[10px] font-bold tracking-[0.16em] text-[color:var(--muted)]">{section.title}</p>}
            <div className="space-y-1">
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin' || to === '/student/dashboard'}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''} flex h-12 items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} rounded-2xl font-nav text-sm font-semibold`
                  }
                >
                  {Icon && <Icon size={17} strokeWidth={1.8} />}
                  {!collapsed && <span className="flex-1 truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && <div className="absolute bottom-4 left-4 right-4">{footer}</div>}
    </aside>
  )
}
