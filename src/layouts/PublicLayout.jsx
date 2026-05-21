import { Link, Outlet } from 'react-router-dom'
import { LayoutDashboard, Moon, PenLine, PlayCircle, Sun } from 'lucide-react'
import DevRoleSwitcher from '../components/shared/DevRoleSwitcher.jsx'
import { useUiStore } from '../store/uiStore.js'

export default function PublicLayout() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  return <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="mr-auto flex min-w-0 items-center gap-3">
          <img src="/logo-new.jpg" alt="DYPERF" className="h-12 w-auto max-w-[190px] rounded-xl object-contain sm:h-14" />
        </Link>
        <span className="rounded-full border border-[var(--border)] bg-[var(--accent-tint)] px-3 py-2 text-xs font-semibold text-[var(--accent)]">Demo mode</span>
        <nav className="flex flex-wrap items-center gap-2">
          <Link to="/apply" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--accent)] px-3 text-sm font-semibold text-white shadow-sm sm:px-4"><PenLine size={16} />Apply</Link>
          <Link to="/test/test_001" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--text)] sm:px-4"><PlayCircle size={16} />Test</Link>
          <Link to="/admin" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--text)] sm:px-4"><LayoutDashboard size={16} />Dashboard</Link>
          <button type="button" className="theme-icon-button !h-10 !w-10" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </nav>
      </div>
    </header>
    <Outlet />
    <DevRoleSwitcher />
  </main>
}
