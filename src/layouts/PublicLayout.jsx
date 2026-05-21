import { Outlet } from 'react-router-dom'
import DevRoleSwitcher from '../components/shared/DevRoleSwitcher.jsx'

export default function PublicLayout() {
  return <main className="min-h-screen bg-paper p-8"><header className="mx-auto mb-8 flex max-w-6xl items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500 font-serif text-white">DYP</div><div><div className="font-serif text-2xl">D.Y. Patil College, Pune</div><p className="text-sm text-muted">Post-Doctoral Fellowship Program</p></div></header><Outlet /><DevRoleSwitcher /></main>
}
