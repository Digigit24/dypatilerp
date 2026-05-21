import { useEffect, useState } from 'react'
import { getNotifications, markAsRead } from '../../api/services/notificationService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { timeAgo } from '../../lib/formatters.js'

export default function NotificationsPage() {
  const [items,setItems]=useState(null)
  useEffect(()=>{getNotifications().then((r)=>setItems(r.data))},[])
  if(!items) return <SkeletonCard rows={8}/>
  return <div><PageHeader title="Notifications"/><div className="card overflow-hidden">{items.map((n)=><button key={n.id} className={`block w-full border-b p-5 text-left ${!n.is_read?'bg-blue-50/40':''}`} onClick={()=>markAsRead(n.id)}><p className="font-semibold">{n.title}</p><p className="text-sm text-muted">{n.message}</p><p className="mt-1 text-xs text-stone-400">{timeAgo(n.created_at)}</p></button>)}</div></div>
}
