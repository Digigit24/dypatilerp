import { Bell, BookOpen, ClipboardCheck, FileText, Globe, GraduationCap, Home, IndianRupee, Layers, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, Shield, Sun, UserCog, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Breadcrumbs from '../components/shared/Breadcrumbs.jsx'
import CourseSwitcher from '../components/shared/CourseSwitcher.jsx'
import DevRoleSwitcher from '../components/shared/DevRoleSwitcher.jsx'
import NotificationBell from '../components/shared/NotificationBell.jsx'
import Sidebar from '../components/shared/Sidebar.jsx'
import { roleLabel } from '../lib/utils.js'
import { useAuthStore } from '../store/authStore.js'
import { useCourseStore, getModulePrefs } from '../store/courseStore.js'
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
  const { currentCourse, setCourses } = useCourseStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  useScrollLock(mobileOpen)

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
    navigate('/login', { replace: true })
  }

  const displayName = currentUser
    ? `${currentUser.first_name ?? ''} ${currentUser.last_name ?? ''}`.trim()
    : 'User'
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  // Preference-aware sidebar items
  const prefs = getModulePrefs(currentCourse)
  const show = (key) => prefs[key] !== false

  const sections = [
    {
      title: 'STUDENTS',
      items: [
        show('applicants')   && { to: '/admin/applicants', label: 'Applicants', icon: Users },
        show('students')     && { to: '/admin/students',   label: 'Students',   icon: UserCog },
        show('batches')      && { to: '/admin/batches',    label: 'Batches',    icon: Layers },
        show('progress')     && { to: '/admin/progress',   label: 'Progress Reports', icon: BookOpen },
      ].filter(Boolean),
    },
    {
      title: 'ACADEMIC',
      items: [
        show('approvals')    && { to: '/admin/approvals',  label: 'Approvals', icon: ClipboardCheck },
        show('fees')         && { to: '/admin/fees',       label: 'Fees',      icon: IndianRupee },
      ].filter(Boolean),
    },
    {
      title: 'TOOLS',
      items: [
        show('test-builder') && { to: '/admin/test-builder',  label: 'Test Builder',  icon: FileText },
        show('notifications')&& { to: '/admin/notifications', label: 'Notifications', icon: Bell },
      ].filter(Boolean),
    },
    ...(role === 'admin' ? [{
      title: 'SYSTEM',
      items: [
        show('courses') && { to: '/admin/courses', label: 'Courses', icon: GraduationCap },
        show('users')   && { to: '/admin/users',   label: 'Users',   icon: Users },
        show('roles')   && { to: '/admin/roles',   label: 'Roles & Permissions', icon: Shield },
        show('settings')&& { to: '/admin/settings',label: 'Settings',icon: Settings },
      ].filter(Boolean),
    }] : []),
  ].filter((s) => s.items.length > 0)

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
      {import.meta.env.DEV && <DevRoleSwitcher />}
    </div>
  )
}
