import { useEffect, useState } from 'react'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { formatDate } from '../../lib/formatters.js'
import { roleLabel } from '../../lib/utils.js'

export default function UserManagementPage(){const [users,setUsers]=useState(null); useEffect(()=>{getUsers().then((r)=>setUsers(r.data))},[]); if(!users)return <SkeletonCard rows={8}/>; return <div className="fade-page"><PageHeader title="User Management" action={<button className="btn-primary" onClick={()=>console.log('INVITE SENT to email@example.com')}>Add User</button>}/><div className="card overflow-x-auto"><table className="min-w-[820px] w-full text-left text-sm"><tbody>{users.map((u)=><tr className="table-row border-b border-[color:var(--border)]" key={u.id}><td className="px-6 py-5 font-medium">{u.first_name} {u.last_name}</td><td>{u.email}</td><td>{roleLabel(u.role)}</td><td><StatusBadge status={u.is_active?'active':'inactive'}/></td><td>{formatDate(u.date_joined)}</td></tr>)}</tbody></table></div></div>}
