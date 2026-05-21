import {
  Award, BookOpen, ExternalLink, FileText, GraduationCap, Globe, Link2,
  Pencil, Plus, Save, Shield, Upload, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, togglePublic, updateProfile } from '../../api/services/researchProfileService.js'
import { getStudentById, updateStudent } from '../../api/services/studentService.js'
import { getUserById } from '../../api/services/userService.js'
import StatusBadge from './StatusBadge.jsx'
import SkeletonCard from './SkeletonCard.jsx'
import { formatDate } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'

const CERT_TYPES = [
  { key: 'phd_certificate', label: 'PhD Certificate', desc: 'Doctoral degree certificate from your institution' },
  { key: 'id_proof', label: 'Government ID', desc: 'Aadhaar, Passport, or PAN card' },
  { key: 'publications_proof', label: 'Publication Proof', desc: 'Journal acceptance letters or published copies' },
  { key: 'recommendation', label: 'Recommendation Letter', desc: 'From PhD supervisor or head of institution' },
  { key: 'other', label: 'Other Documents', desc: 'Any additional supporting documents' },
]

const MOCK_UPLOADED = { phd_certificate: true, id_proof: true, publications_proof: false, recommendation: false, other: false }

const RESEARCH_SECTIONS = [
  { key: 'research_papers', label: 'Research Papers', icon: FileText },
  { key: 'patents', label: 'Patents & Copyrights', icon: Shield },
  { key: 'workshops_seminars', label: 'Workshops & Seminars', icon: BookOpen },
  { key: 'publications', label: 'Publications', icon: Award },
]

export default function StudentProfileView({ studentId, isAdminView = false }) {
  const [student, setStudent] = useState(null)
  const [user, setUser] = useState(null)
  const [research, setResearch] = useState(null)
  const [tab, setTab] = useState('profile')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [certs, setCerts] = useState(MOCK_UPLOADED)
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    if (!studentId) return
    getStudentById(studentId).then((r) => {
      setStudent(r.data)
      getUserById(r.data.user_id).then((u) => setUser(u.data))
    })
    getProfile(studentId).then((r) => setResearch(r.data)).catch(() => setResearch(null))
  }, [studentId])

  if (!student || !user) return <SkeletonCard rows={8} />

  const name = `${user.first_name} ${user.last_name}`
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2)

  const startEdit = (section, values) => { setEditing(section); setDraft(values) }
  const cancelEdit = () => { setEditing(null); setDraft({}) }

  const saveEdit = async (section) => {
    if (section === 'bio') {
      const updated = await updateStudent(studentId, { profile: { ...student.profile, bio: draft.bio, linkedin_url: draft.linkedin_url } })
      setStudent(updated.data)
    }
    if (section === 'academic' && research) {
      const updated = await updateProfile(studentId, { research_areas: draft.research_areas?.split(',').map((s) => s.trim()).filter(Boolean) || research.research_areas, skills: draft.skills?.split(',').map((s) => s.trim()).filter(Boolean) || research.skills })
      setResearch(updated.data)
    }
    setEditing(null)
    addToast({ type: 'success', title: 'Profile updated.' })
  }

  const handleTogglePublic = async () => {
    if (!research) return
    const updated = await togglePublic(studentId, !research.is_public)
    setResearch(updated.data)
    addToast({ type: 'success', title: research.is_public ? 'Profile set to private.' : 'Profile is now public.' })
  }

  const d = (key) => ({ value: draft[key] ?? '', onChange: (e) => setDraft((p) => ({ ...p, [key]: e.target.value })) })

  return (
    <div>
      {/* ── Profile header card ── */}
      <div className="card mb-6 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[color:var(--accent)] to-indigo-500 opacity-80" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-3xl border-4 border-[color:var(--card)] bg-[color:var(--accent-tint)] text-2xl font-bold text-[color:var(--accent)]">
              {initials}
            </div>
            <div className="flex flex-wrap gap-2">
              {research && (
                <button
                  onClick={handleTogglePublic}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${research.is_public ? 'bg-emerald-50 text-emerald-700' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}
                >
                  <Globe size={14} />
                  {research.is_public ? 'Public Profile' : 'Make Public'}
                </button>
              )}
              {research?.is_public && (
                <Link to={`/p/${research.public_slug}`} className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]">
                  <ExternalLink size={14} /> View Public
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-semibold text-[color:var(--text)]">{name}</h1>
            <p className="mt-1 text-sm text-[color:var(--secondary)]">{student.permanent_id} · {student.batch_id?.replace('batch_', 'Batch ').replace('_', '-')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={student.status} />
              {user.linkedin_url || student.profile?.linkedin_url ? (
                <a href={student.profile?.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[color:var(--accent)] hover:underline">
                  <Link2 size={12} /> LinkedIn
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-5 flex gap-2">
        {[{ key: 'profile', label: 'Profile' }, { key: 'research', label: 'Research Profile' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${tab === key ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--card)] text-[color:var(--secondary)]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === 'profile' && (
        <div className="space-y-5">
          {/* Bio / About */}
          <div className="card p-6">
            <SectionHeader title="About" onEdit={() => startEdit('bio', { bio: student.profile?.bio || '', linkedin_url: student.profile?.linkedin_url || '' })} editing={editing === 'bio'} onSave={() => saveEdit('bio')} onCancel={cancelEdit} />
            {editing === 'bio' ? (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">Bio</span>
                  <textarea className="textarea mt-1.5 h-28 w-full" placeholder="Write a short bio about your research focus and background…" {...d('bio')} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">LinkedIn URL</span>
                  <input className="input mt-1.5 w-full" placeholder="https://linkedin.com/in/yourprofile" {...d('linkedin_url')} />
                </label>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-7 text-[color:var(--secondary)]">{student.profile?.bio || 'No bio added yet.'}</p>
            )}
          </div>

          {/* Personal Information */}
          <div className="card p-6">
            <SectionHeader title="Personal Information" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phone} />
              <InfoRow label="Enrolled" value={formatDate(student.enrolled_at)} />
              <InfoRow label="Batch" value={student.batch_id?.replace('batch_', 'Batch ').replace('_', '-')} />
              <InfoRow label="Overall Progress" value={`${student.progress_summary.completion_percentage}%`} />
              <InfoRow label="Submissions" value={`${student.progress_summary.approved_submissions} approved / ${student.progress_summary.total_submissions} total`} />
            </div>
          </div>

          {/* Academic Details */}
          <div className="card p-6">
            <SectionHeader
              title="Research Areas & Skills"
              onEdit={() => startEdit('academic', { research_areas: research?.research_areas?.join(', ') || '', skills: research?.skills?.join(', ') || '' })}
              editing={editing === 'academic'}
              onSave={() => saveEdit('academic')}
              onCancel={cancelEdit}
            />
            {editing === 'academic' ? (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">Research Areas <span className="font-normal text-[color:var(--muted)]">(comma separated)</span></span>
                  <input className="input mt-1.5 w-full" placeholder="Molecular Biology, Cancer Research" {...d('research_areas')} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">Skills <span className="font-normal text-[color:var(--muted)]">(comma separated)</span></span>
                  <input className="input mt-1.5 w-full" placeholder="Python, R, CRISPR" {...d('skills')} />
                </label>
              </div>
            ) : research ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Research Areas</p>
                  <div className="flex flex-wrap gap-2">
                    {(research.research_areas || []).map((a) => (
                      <span key={a} className="rounded-full bg-[color:var(--accent-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">{a}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(research.skills || []).map((s) => (
                      <span key={s} className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--text)]">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : <p className="mt-3 text-sm text-[color:var(--secondary)]">No research profile data yet.</p>}
          </div>

          {/* Certificates & Documents */}
          <div className="card p-6">
            <SectionHeader title="Certificates & Documents" />
            <p className="mt-1 text-sm text-[color:var(--secondary)]">Upload supporting documents for verification. Accepted: PDF, JPG, PNG (max 10 MB each).</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {CERT_TYPES.map(({ key, label, desc }) => (
                <div
                  key={key}
                  className={`flex items-start gap-3 rounded-3xl border p-4 transition ${certs[key] ? 'border-emerald-200 bg-emerald-50' : 'border-[color:var(--border)] bg-[color:var(--surface)]'}`}
                >
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${certs[key] ? 'bg-emerald-100 text-emerald-600' : 'bg-[color:var(--card)] text-[color:var(--muted)]'}`}>
                    {certs[key] ? <FileText size={16} /> : <Upload size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[color:var(--text)]">{label}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{certs[key] ? 'Uploaded · Pending verification' : desc}</p>
                    {!isAdminView && (
                      <button
                        className={`mt-2 text-xs font-semibold ${certs[key] ? 'text-red-500' : 'text-[color:var(--accent)]'}`}
                        onClick={() => setCerts((p) => ({ ...p, [key]: !p[key] }))}
                      >
                        {certs[key] ? 'Remove' : '+ Upload file'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Research Profile tab ── */}
      {tab === 'research' && (
        <div className="space-y-5">
          {research ? (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    Research profile is {research.is_public ? <span className="text-emerald-600">public</span> : <span className="text-[color:var(--muted)]">private</span>}
                  </p>
                  {research.is_public && (
                    <p className="mt-0.5 text-xs text-[color:var(--secondary)]">Public URL: /p/{research.public_slug}</p>
                  )}
                </div>
                {research.is_public && (
                  <Link to={`/p/${research.public_slug}`} className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]">
                    <ExternalLink size={14} /> View
                  </Link>
                )}
              </div>

              {RESEARCH_SECTIONS.map(({ key, label, icon: Icon }) => (
                <div key={key} className="card p-6">
                  <div className="safe-row">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                        <Icon size={18} />
                      </span>
                      <h2 className="text-lg font-semibold text-[color:var(--text)]">{label} <span className="text-sm font-normal text-[color:var(--secondary)]">({research[key]?.length || 0})</span></h2>
                    </div>
                    {!isAdminView && (
                      <button className="inline-flex items-center gap-1.5 rounded-2xl bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)]">
                        <Plus size={13} /> Add
                      </button>
                    )}
                  </div>
                  {(research[key] || []).length === 0 ? (
                    <p className="mt-4 text-sm text-[color:var(--secondary)]">No {label.toLowerCase()} added yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {(research[key] || []).map((item) => (
                        <div key={item.id} className="safe-row items-start rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[color:var(--text)]">{item.title || item.name}</p>
                            <p className="mt-1 text-xs text-[color:var(--secondary)]">
                              {[item.journal, item.organizer, item.publisher, item.country].filter(Boolean).join(' · ')}
                              {item.year ? ` · ${item.year}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {item.is_verified && <StatusBadge status="approved" />}
                            {!isAdminView && <button className="text-[color:var(--muted)] hover:text-[color:var(--accent)]"><Pencil size={14} /></button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="card p-6">
                <div className="safe-row">
                  <h2 className="text-lg font-semibold text-[color:var(--text)]">Skills</h2>
                  {!isAdminView && (
                    <button className="inline-flex items-center gap-1.5 rounded-2xl bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)]">
                      <Pencil size={13} /> Edit
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(research.skills || []).map((s) => (
                    <span key={s} className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-sm text-[color:var(--text)]">{s}</span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="card p-10 text-center">
              <GraduationCap className="mx-auto text-[color:var(--muted)]" size={32} />
              <p className="mt-3 font-semibold text-[color:var(--text)]">No research profile yet</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">Research profile will appear here once created.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, onEdit, editing, onSave, onCancel }) {
  return (
    <div className="safe-row">
      <h2 className="text-lg font-semibold text-[color:var(--text)]">{title}</h2>
      {onEdit && !editing && (
        <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-2xl bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)]">
          <Pencil size={13} /> Edit
        </button>
      )}
      {editing && (
        <div className="flex gap-2">
          <button onClick={onCancel} className="inline-flex items-center gap-1 rounded-xl bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)]">
            <X size={12} /> Cancel
          </button>
          <button onClick={onSave} className="inline-flex items-center gap-1 rounded-xl bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">
            <Save size={12} /> Save
          </button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-[color:var(--text)]">{value || '—'}</p>
    </div>
  )
}
