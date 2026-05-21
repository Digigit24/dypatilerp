import { Bell, BellRing, CheckCircle, Clock, Megaphone, RefreshCw, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications, markAllAsRead } from '../../api/services/notificationService.js'
import { timeAgo } from '../../lib/formatters.js'
import useScrollLock from '../../hooks/useScrollLock.js'

const Icon = ({ type }) => ({ approval: CheckCircle, revision: RefreshCw, zoom_link: Video, announcement: Megaphone, report_due: Clock }[type] || Bell)

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  useEffect(() => { getNotifications().then((r) => setItems(r.data.slice(0, 8))) }, [])
  useScrollLock(open)
  const unread = items.filter((n) => !n.is_read).length
  return <div className="relative"><button className="theme-icon-button relative" onClick={() => setOpen((v) => !v)}>{unread ? <BellRing size={18} /> : <Bell size={18} />}{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{unread}</span>}</button>{open && <><button aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default bg-transparent" onClick={() => setOpen(false)} /><div className="fixed left-3 right-3 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-hidden rounded-3xl bg-[color:var(--card)] shadow-hover ring-1 ring-[color:var(--border)] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96"><div className="flex items-center justify-between border-b border-[color:var(--border)] p-4"><b>Notifications</b><button className="text-xs text-[color:var(--accent)]" onClick={() => markAllAsRead()}>Mark all read</button></div><div className="max-h-[60vh] overflow-auto overscroll-contain">{items.map((n) => { const I = Icon({ type: n.type }); return <div key={n.id} className={`flex gap-3 border-b border-[color:var(--border)] p-4 ${!n.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/40' : ''}`}><I size={18} className="mt-1 shrink-0 text-[color:var(--accent)]"/><div className="min-w-0"><p className="text-sm font-semibold text-[color:var(--text)]">{n.title}</p><p className="text-xs leading-5 text-[color:var(--secondary)]">{n.message}</p><p className="mt-1 text-[11px] text-[color:var(--muted)]">{timeAgo(n.created_at)}</p></div></div> })}</div><Link className="block p-4 text-sm font-medium text-[color:var(--accent)]" to="/student/notifications">View all notifications →</Link></div></>}</div>
}
