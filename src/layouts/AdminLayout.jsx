import { Activity, Bell, BookOpen, ClipboardCheck, FileText, Globe, Home, IndianRupee, Layers, Loader2, LogOut, Mail, Menu, Moon, PanelLeftClose, PanelLeftOpen, PlayCircle, RefreshCw, Search, Settings, Shield, Sun, UserCog, Users, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Breadcrumbs from '../components/shared/Breadcrumbs.jsx'
import CourseSwitcher from '../components/shared/CourseSwitcher.jsx'
import NotificationBell from '../components/shared/NotificationBell.jsx'
import Sidebar from '../components/shared/Sidebar.jsx'
import { roleLabel } from '../lib/utils.js'
import { useAuthStore } from '../store/authStore.js'
import { useCourseStore } from '../store/courseStore.js'
import { useLabelStore, useLabels } from '../store/labelStore.js'
import { usePermStore } from '../store/permStore.js'
import { useUiStore } from '../store/uiStore.js'
import useScrollLock from '../hooks/useScrollLock.js'
import { logout } from '../api/services/userService.js'
import { USE_MOCK } from '../api/config.js'
import { getCourses } from '../api/services/courseService.js'

export default function AdminLayout() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const role = useAuthStore((s) => s.role)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const { setCourses } = useCourseStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const labels = useLabels()
  const loadLabels = useLabelStore((s) => s.loadLabels)
  useScrollLock(mobileOpen)

  const can = usePermStore((s) => s.can)
  const permsLoaded = usePermStore((s) => s.loaded)
  const permsFailed = usePermStore((s) => s.failed)
  const reloadPermissions = usePermStore((s) => s.reload)
  const userId = currentUser?.id

  // Load DB-driven UI labels once, and (re)load permissions whenever the logged-in
  // user changes. reload() forces a fresh fetch so User B never inherits User A's
  // cached grants after a logout→login in the same tab.
  useEffect(() => { loadLabels() }, [])
  useEffect(() => { if (userId) reloadPermissions() }, [userId])

  // Load courses into store on mount
  useEffect(() => {
    if (USE_MOCK) return
    getCourses({ is_active: true }).then((r) => { if (r.data?.length) setCourses(r.data) })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const handleLogout = async () => {
    await logout()
    clearAuth()
    usePermStore.getState().reset() // drop this user's grants so the next login loads fresh
    navigate('/login', { replace: true })
  }

  const displayName = currentUser
    ? `${currentUser.first_name ?? ''} ${currentUser.last_name ?? ''}`.trim()
    : 'User'
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  // module key per nav item — items hidden when read permission is missing
  const sectionsRaw = [
    {
      title: labels.studentPlural.toUpperCase(),
      items: [
        { to: '/admin/applicants', label: 'Applicants',       icon: Users,   perm: 'applicants' },
        { to: '/admin/students',   label: labels.studentPlural, icon: UserCog, perm: 'students' },
        { to: '/admin/batches',    label: 'Batches',          icon: Layers,  perm: 'batches' },
        { to: '/admin/formats',    label: 'Formats',          icon: FileText, perm: 'formats' },
        { to: '/admin/progress',   label: 'Progress Reports', icon: BookOpen, perm: 'progress_reports' },
      ],
    },
    {
      title: 'ACADEMIC',
      items: [
        { to: '/admin/assignments', label: 'Assignments', icon: ClipboardCheck, perm: 'assignments' },
        { to: '/admin/approvals', label: 'Approvals', icon: ClipboardCheck, perm: 'approvals' },
        { to: '/admin/fees',      label: 'Fees',      icon: IndianRupee, perm: 'fees' },
      ],
    },
    {
      title: 'TOOLS',
      items: [
        { to: '/admin/lectures',      label: 'Media',         icon: PlayCircle, perm: 'lectures' },
        { to: '/admin/test-builder',  label: 'Test Builder',  icon: FileText,   perm: 'tests' },
        { to: '/admin/notifications', label: 'Notifications', icon: Bell,       perm: 'notifications' },
      ],
    },
    ...(role === 'admin' ? [{
      title: 'SYSTEM',
      items: [
        { to: '/admin/wizard',     label: 'Admin Wizard',        icon: Wand2 },
        { to: '/admin/users',      label: 'Users',               icon: Users },
        { to: '/admin/roles',      label: 'Roles & Permissions', icon: Shield },
        { to: '/admin/audit-logs', label: 'Audit Logs',          icon: Activity },
        { to: '/admin/email-templates', label: 'Email Templates', icon: Mail },
        { to: '/admin/settings',   label: 'Settings',            icon: Settings },
      ],
    }] : []),
  ]

  // Hide items the user can't read; drop empty groups. can() fails closed, so
  // while permissions are still loading the perm-gated groups stay hidden (the
  // full menu never flashes); they appear once the fetch resolves.
  const sections = sectionsRaw
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.perm || can(it.perm, 'read')) }))
    .filter((g) => g.items.length > 0)

  // Neutral loading / controlled retry state for the nav — never a fallback that
  // exposes restricted items.
  const permNotice = !permsLoaded ? (
    <div className="soft-panel flex items-center gap-2 rounded-2xl p-3 text-xs text-[color:var(--secondary)]">
      <Loader2 size={14} className="animate-spin" /> Loading menu…
    </div>
  ) : permsFailed ? (
    <div className="soft-panel rounded-2xl p-3 text-xs">
      <p className="font-semibold text-[color:var(--text)]">Menu unavailable</p>
      <p className="mb-2 mt-0.5 text-[color:var(--secondary)]">Couldn’t load your permissions.</p>
      <button
        onClick={() => reloadPermissions()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent-tint)] px-2.5 py-1.5 font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white"
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  ) : null

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close sidebar" onClick={() => setMobileOpen(false)} />}
      <Sidebar
        sections={[{ title: 'HOME', items: [{ to: '/', label: 'Landing Page', icon: Globe }, { to: '/admin', label: 'Dashboard', icon: Home }] }, ...sections]}
        role={roleLabel(role)}
        notice={permNotice}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        footer={
          <div className="soft-panel flex items-center gap-3 rounded-3xl p-3 text-sm">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--accent-tint)] font-semibold text-[color:var(--accent)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[color:var(--text)]">{displayName}</p>
              <p className="truncate text-xs text-[color:var(--secondary)]">{roleLabel(role)}</p>
            </div>
            <button aria-label="Log out" onClick={handleLogout} className="text-[color:var(--muted)] hover:text-[color:var(--text)]">
              <LogOut size={16} />
            </button>
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
          <CourseSwitcher />
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
    </div>
  )
}
