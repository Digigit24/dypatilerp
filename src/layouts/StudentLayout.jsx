import { Bell, FileDown, FileText, Home, LogOut, Menu, PanelLeftClose, PanelLeftOpen, PlayCircle, Settings, UserCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Breadcrumbs from '../components/shared/Breadcrumbs.jsx'
import NotificationBell from '../components/shared/NotificationBell.jsx'
import Sidebar from '../components/shared/Sidebar.jsx'
import useScrollLock from '../hooks/useScrollLock.js'
import { useAuthStore } from '../store/authStore.js'
import { useLabelStore, useLabels } from '../store/labelStore.js'
import { logout } from '../api/services/userService.js'
import { isVideoEnabled } from '../lib/features.js'

export default function StudentLayout() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const labels = useLabels()
  const loadLabels = useLabelStore((s) => s.loadLabels)
  useScrollLock(mobileOpen)
  useEffect(() => { loadLabels() }, [])

  const handleLogout = async () => {
    await logout()
    clearAuth()
    navigate('/login', { replace: true })
  }

  const displayName = currentUser
    ? `${currentUser.first_name ?? ''} ${currentUser.last_name ?? ''}`.trim()
    : labels.student

  const enrollmentNumber = currentUser?.enrollment_number ?? ''

  const sections = [{
    title: 'STUDENT',
    items: [
      { to: '/student/dashboard', label: 'Dashboard', icon: Home },
      // Submissions replaces the old Assignments / My Submissions / Progress Reports nav
      // items — StudentProfileView now hosts Progress Reports, Assignments and Milestones
      // as inner subtabs of its Submissions outer tab.
      { to: '/student/profile#submissions', label: 'Submissions', icon: FileText },
      { to: '/student/formats', label: 'Formats', icon: FileDown },
      // Fees and Research Profile are folded into My Profile as subtabs (student-side only).
      // Their legacy top-level routes still resolve for deep links.
      { to: '/student/profile', label: 'My Profile', icon: UserCircle },
      // Lectures hidden while the video feature is disabled — see CLAUDE.md
      ...(isVideoEnabled() ? [{ to: '/student/lectures', label: 'Lectures', icon: PlayCircle }] : []),
      { to: '/student/notifications', label: 'Notifications', icon: Bell },
    ],
  }]

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close sidebar" onClick={() => setMobileOpen(false)} />}
      <Sidebar
        width={240}
        sections={sections}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        footer={
          <div className="space-y-2 text-sm">
            <a className="flex gap-2 rounded-md p-2 text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" href="/student/profile"><Settings size={16} />Settings</a>
            <button className="flex gap-2 rounded-lg p-3 text-[color:var(--secondary)] w-full hover:bg-[color:var(--surface)]" onClick={handleLogout}><LogOut size={16} />Logout</button>
          </div>
        }
      />
      <main className="admin-main" style={collapsed ? { marginLeft: 128 } : undefined}>
        <div className="admin-topbar">
          <button className="sidebar-toggle mobile-sidebar-trigger" aria-label="Open sidebar" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
          <button className="sidebar-toggle desktop-sidebar-trigger" aria-label="Collapse sidebar" onClick={() => setCollapsed((v) => !v)}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
            <p className="truncate text-sm text-[color:var(--secondary)]">
              {displayName}{enrollmentNumber ? ` · ${enrollmentNumber}` : ''}
            </p>
          </div>
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
