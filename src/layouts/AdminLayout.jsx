import { Activity, Bell, BookOpen, ClipboardCheck, FileText, Globe, Home, IndianRupee, Layers, ListChecks, Loader2, LogOut, Mail, Menu, Moon, PanelLeftClose, PanelLeftOpen, PlayCircle, RefreshCw, Settings, Shield, Sun, Target, UserCog, Users, Wand2 } from 'lucide-react'
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
import { isVideoEnabled } from '../lib/features.js'

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
  // The course store is enrichment: /courses needs courses:read, which
  // guide/mentor lack. Gate it so it never 403s on the pages they can view.
  const canReadCourses = usePermStore((s) => s.can('courses', 'read'))
  const userId = currentUser?.id

  // Load DB-driven UI labels once, and (re)load permissions whenever the logged-in
  // user changes. reload() forces a fresh fetch so User B never inherits User A's
  // cached grants after a logout→login in the same tab.
  useEffect(() => { loadLabels() }, [])
  useEffect(() => { if (userId) reloadPermissions() }, [userId])

  // Load courses into store — only for roles allowed to read courses, and
  // non-blocking so a 403 can never surface a toast on an authorized page.
  useEffect(() => {
    if (USE_MOCK || !canReadCourses) return
    getCourses({ is_active: true }).then((r) => { if (r.data?.length) setCourses(r.data) }).catch(() => {})
  }, [canReadCourses]) // eslint-disable-line react-hooks/exhaustive-deps

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
        // Approvals merged into Submissions (review is one page, sliced by
        // tab). Assignments and Milestones are definition/setup pages —
        // distinct from reviewing submissions — so they keep their own slots,
        // placed right below Submissions since they're closely related.
        { to: '/admin/submissions', label: 'Submissions', icon: ListChecks,    perm: 'submissions' },
        { to: '/admin/assignments', label: 'Assignments', icon: ClipboardCheck, perm: 'assignments' },
        { to: '/admin/milestones',  label: 'Milestones',  icon: Target,         perm: 'targets' },
        { to: '/admin/fees',      label: 'Fees',      icon: IndianRupee, perm: 'fees' },
      ],
    },
    {
      title: 'TOOLS',
      items: [
        // Video is disabled — this library serves documents only. See CLAUDE.md
        { to: '/admin/lectures',      label: isVideoEnabled() ? 'Media' : 'Documents', icon: isVideoEnabled() ? PlayCircle : FileText, perm: 'lectures' },
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

  // Role-optimized ordering — same groups/permissions as above, just reshuffled
  // so each role's most-used work leads instead of a fixed admin-first order.
  // A role not listed here keeps the natural group/item order untouched.
  const ROLE_SECTION_ORDER = {
    guide:  ['ACADEMIC', labels.studentPlural.toUpperCase(), 'TOOLS'],
    mentor: ['ACADEMIC', labels.studentPlural.toUpperCase(), 'TOOLS'],
  }
  const ROLE_ITEM_PRIORITY = {
    guide:  ['/admin/submissions', '/admin/milestones', '/admin/students'],
    mentor: ['/admin/submissions', '/admin/milestones', '/admin/students'],
  }
  const byPriority = (order) => (a, b) => {
    const ai = order.indexOf(a); const bi = order.indexOf(b)
    return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi)
  }
  const sectionOrder = ROLE_SECTION_ORDER[role]
  const itemOrder = ROLE_ITEM_PRIORITY[role]
  const orderedSections = (sectionOrder
    ? [...sections].sort((a, b) => byPriority(sectionOrder)(a.title, b.title))
    : sections
  ).map((g) => (itemOrder
    ? { ...g, items: [...g.items].sort((a, b) => byPriority(itemOrder)(a.to, b.to)) }
    : g
  ))

  // Neutral loading / controlled retry state for the nav — never a fallback that
  // exposes restricted items.
  const permNotice = !permsLoaded ? (
    <div className="soft-panel flex items-center gap-2 rounded-md p-2.5 text-xs text-[color:var(--secondary)]">
      <Loader2 size={14} className="animate-spin" /> Loading menu…
    </div>
  ) : permsFailed ? (
    <div className="soft-panel rounded-lg p-3 text-xs">
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
        sections={[{ title: 'HOME', items: [{ to: '/', label: 'Landing Page', icon: Globe }, { to: '/admin', label: 'Dashboard', icon: Home }] }, ...orderedSections]}
        role={roleLabel(role)}
        notice={permNotice}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        footer={
          <div className="soft-panel flex items-center gap-3 rounded-xl p-2.5 text-sm">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--accent-tint)] font-semibold text-[color:var(--accent)]">
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
          {/* ml-auto fills the space the old topbar search box used to occupy —
              pushes the course switcher and everything after it to the right edge. */}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <CourseSwitcher />
            <button className="theme-icon-button shrink-0" aria-label="Toggle dark mode" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationBell />
          </div>
        </div>
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
