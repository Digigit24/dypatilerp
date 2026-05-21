import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, togglePublic } from '../../api/services/researchProfileService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'

export default function ResearchProfilePage() {
  const [profile,setProfile]=useState(null)
  useEffect(()=>{getProfile('stu_001').then((r)=>setProfile(r.data))},[])
  if(!profile) return <SkeletonCard/>
  const sections=[['Research Papers','research_papers'],['Patents & Copyrights','patents'],['Workshops & Seminars','workshops_seminars'],['Publications','publications']]
  return <div className="fade-page"><PageHeader title="Research Profile" action={<div className="safe-actions"><button className="rounded-2xl bg-[color:var(--card)] px-4" onClick={async()=>setProfile((await togglePublic(profile.student_id,!profile.is_public)).data)}>{profile.is_public?'Make Private':'Make Public'}</button>{profile.is_public&&<Link className="btn-primary inline-flex items-center" to={`/p/${profile.public_slug}`}>View Public Profile</Link>}</div>}/><div className="space-y-5">{sections.map(([title,key])=><div className="card p-6" key={key}><h2 className="text-xl font-semibold">{title} <span className="text-sm text-[color:var(--secondary)]">({profile[key].length})</span></h2>{profile[key].map((item)=><div className="safe-row mt-4 border-t border-[color:var(--border)] pt-4" key={item.id}><span className="line-clamp-2">{item.title || item.name}</span>{item.is_verified&&<StatusBadge status="approved"/>}</div>)}<button className="mt-4 rounded-2xl bg-[color:var(--accent-tint)] px-4 py-2 text-[color:var(--accent)]">+ Add {title}</button></div>)}</div><div className="card mt-5 p-6"><h2 className="text-xl font-semibold">Skills</h2><div className="mt-3 flex flex-wrap gap-2">{profile.skills.map((s)=><span className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-sm" key={s}>{s}</span>)}</div></div></div>
}
