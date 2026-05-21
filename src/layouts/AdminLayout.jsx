import { Bell, CalendarDays, ClipboardCheck, FileText, Globe, Home, IndianRupee, Layers, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, Sun, UserCog, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Breadcrumbs from '../components/shared/Breadcrumbs.jsx'
import DevRoleSwitcher from '../components/shared/DevRoleSwitcher.jsx'
import NotificationBell from '../components/shared/NotificationBell.jsx'
import Sidebar from '../components/shared/Sidebar.jsx'
import { roleLabel } from '../lib/utils.js'
import { useAuthStore } from '../store/authStore.js'
import { useUiStore } from '../store/uiStore.js'
import useScrollLock from '../hooks/useScrollLock.js'

export default function AdminLayout() {
  const role = useAuthStore((s) => s.role)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useScrollLock(mobileOpen)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const sections = [
    { title: 'STUDENTS', items: [{ to: '/admin/applicants', label: 'Applicants', icon: Users }, { to: '/admin/students', label: 'Students', icon: UserCog }, { to: '/admin/batches', label: 'Batches', icon: Layers }] },
    { title: 'ACADEMIC', items: [{ to: '/admin/approvals', label: 'Approvals', icon: ClipboardCheck }, { to: '/admin/fees', label: 'Fees', icon: IndianRupee }] },
    { title: 'TOOLS', items: [{ to: '/admin/test-builder', label: 'Test Builder', icon: FileText }, { to: '/admin/notifications', label: 'Notifications', icon: Bell }] },
    ...(role === 'admin' ? [{ title: 'SYSTEM', items: [{ to: '/admin/users', label: 'User Management', icon: Users }, { to: '/admin/settings', label: 'Settings', icon: Settings }] }] : []),
  ]
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close sidebar" onClick={() => setMobileOpen(false)} />}
      <Sidebar
        sections={[{ title: 'HOME', items: [{ to: '/', label: 'Landing Page', icon: Globe }, { to: '/admin', label: 'Dashboard', icon: Home }] }, ...sections]}
        role={roleLabel(role)}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        footer={
          <div className="soft-panel flex items-center gap-3 rounded-3xl p-3 text-sm">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--accent-tint)] font-semibold text-[color:var(--accent)]">PS</div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[color:var(--text)]">Dr. Priya Sharma</p>
              <p className="truncate text-xs text-[color:var(--secondary)]">Coordinator</p>
            </div>
            <LogOut size={16} className="text-[color:var(--muted)]" />
          </div>
        }
      />
      <main className="admin-main" style={collapsed ? { marginLeft: 128 } : undefined}>
        <div className="admin-topbar">
          <button className="sidebar-toggle mobile-sidebar-trigger" aria-label="Open sidebar" onClick={() => setMobileOpen(true)}>
            <Menu size={19} />
          </button>
          <button className="sidebar-toggle desktop-sidebar-trigger" aria-label="Collapse sidebar" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <label className="admin-search soft-panel flex h-14 items-center gap-3 rounded-full px-5">
            <Search size={18} className="text-[color:var(--muted)]" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]" placeholder="Search anything..." />
          </label>
          <button className="soft-panel mobile-hide flex h-14 shrink-0 items-center gap-3 rounded-2xl px-4 text-left text-sm">
            <CalendarDays size={17} className="text-[color:var(--accent)]" />
            <span>
              <span className="block font-semibold text-[color:var(--text)]">Batch 2024</span>
              <span className="block text-xs text-[color:var(--secondary)]">Year 1 - Full Time</span>
            </span>
          </button>
          <button className="theme-icon-button shrink-0" aria-label="Toggle dark mode" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationBell />
        </div>
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <Outlet />
      </main>
      <DevRoleSwitcher />
    </div>
  )
}
