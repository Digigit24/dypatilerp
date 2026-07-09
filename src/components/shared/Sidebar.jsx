import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import { useBrandingStore, useBranding } from '../../store/brandingStore.js'
import { useUiStore } from '../../store/uiStore.js'

export default function Sidebar({ sections, footer, notice, width = 260, role, collapsed = false, mobileOpen = false, onClose }) {
  const theme = useUiStore((s) => s.theme)
  const branding = useBranding()
  const loadBranding = useBrandingStore((s) => s.loadBranding)
  useEffect(() => { loadBranding() }, [])

  // Theme-aware logo: dark mode prefers the dark variant, falls back gracefully
  const logoSrc = (theme === 'dark'
    ? (branding.logoDark || branding.logoLight)
    : (branding.logoLight || branding.logoDark)) || '/logo-new.jpg'

  return (
    <aside
      className={`sidebar-shell fixed bottom-5 left-5 top-5 z-40 flex flex-col rounded-[30px] p-4 transition-all duration-300 max-[900px]:bottom-3 max-[900px]:top-3 ${mobileOpen ? 'max-[900px]:translate-x-0' : 'max-[900px]:-translate-x-[115%]'}`}
      style={{ width: collapsed ? 88 : width }}
      aria-label="Sidebar navigation"
    >
      <div className={`mb-8 shrink-0 px-2 pt-1 ${collapsed ? 'px-0' : ''}`}>
        {collapsed ? (
          <img src={logoSrc} alt="DYPERF" className="mx-auto h-12 w-12 rounded-2xl object-cover object-left" />
        ) : (
          <div>
            <img src={logoSrc} alt="DYPERF - Dr. D. Y. Patil Education and Research Foundation" className="h-auto max-h-24 w-full rounded-2xl object-contain" />
            {role && <div className="mt-3 inline-flex rounded-full bg-[color:var(--accent-tint)] px-3 py-1 text-[11px] font-semibold text-[color:var(--accent)]">{role}</div>}
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-3 overflow-auto overscroll-contain pr-1">
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

      {notice && !collapsed && <div className="mt-2 shrink-0">{notice}</div>}
      {!collapsed && <div className="mt-3 shrink-0">{footer}</div>}
    </aside>
  )
}
