import { Bell, BookOpen, FileText, GraduationCap, Home, LogOut, Menu, PanelLeftClose, PanelLeftOpen, PenLine, Settings } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Breadcrumbs from '../components/shared/Breadcrumbs.jsx'
import DevRoleSwitcher from '../components/shared/DevRoleSwitcher.jsx'
import NotificationBell from '../components/shared/NotificationBell.jsx'
import Sidebar from '../components/shared/Sidebar.jsx'

export default function StudentLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sections = [{
    title: 'STUDENT',
    items: [
      { to: '/student/dashboard', label: 'Dashboard', icon: Home },
      { to: '/student/submit', label: 'Submit Title', icon: PenLine },
      { to: '/student/submissions', label: 'My Submissions', icon: FileText },
      { to: '/student/progress', label: 'Progress Reports', icon: BookOpen },
      { to: '/student/profile/research', label: 'Research Profile', icon: GraduationCap },
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
            <a className="flex gap-2 rounded-2xl p-3 text-[color:var(--secondary)] hover:bg-[color:var(--surface)]"><Settings size={16} />Settings</a>
            <button className="flex gap-2 rounded-2xl p-3 text-[color:var(--secondary)]"><LogOut size={16} />Logout</button>
          </div>
        }
      />
      <main className="admin-main" style={collapsed ? { marginLeft: 128 } : undefined}>
        <div className="admin-topbar">
          <button className="sidebar-toggle mobile-sidebar-trigger" aria-label="Open sidebar" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
          <button className="sidebar-toggle desktop-sidebar-trigger" aria-label="Collapse sidebar" onClick={() => setCollapsed((v) => !v)}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
            <p className="truncate text-sm text-[color:var(--secondary)]">Priya Sharma · DYP-PDF-2024-001</p>
          </div>
          <NotificationBell />
        </div>
        <Outlet />
      </main>
      <DevRoleSwitcher />
    </div>
  )
}
