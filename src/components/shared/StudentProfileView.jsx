/**
 * StudentProfileView — shared admin + student profile component
 *
 * Fixes applied:
 *  1. User data is derived from the embedded student response — no extra getUserById()
 *     call that previously broke on `r.data.user_id` being undefined.
 *  2. Proper notFound state instead of an infinite skeleton on 404.
 *  3. Full tab set: Profile | Submissions | Progress | Research Profile
 *  4. Guides + Fees Summary sections visible to admin.
 */
import {
  Award, BookOpen, Camera, CheckCircle, Circle, Clock,
  DollarSign, ExternalLink, FileText, Globe, GraduationCap,
  Link2, Pencil, Plus, Save, Shield, Upload, User, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApprovals } from '../../api/services/approvalService.js'
import {
  addResearchItem, getProfile, togglePublic,
  updateProfile, updateResearchItem,
} from '../../api/services/researchProfileService.js'
import { getStudentById, updateStudent } from '../../api/services/studentService.js'
import { getSubmissionsByStudent } from '../../api/services/submissionService.js'
import { getProgressReportByStudent } from '../../api/services/progressReportService.js'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'
import SkeletonCard from './SkeletonCard.jsx'
import StatusBadge from './StatusBadge.jsx'

const CERT_TYPES = [
  { key: 'phd_certificate',   label: 'PhD Certificate',       desc: 'Doctoral degree certificate from your institution' },
  { key: 'id_proof',          label: 'Government ID',         desc: 'Aadhaar, Passport, or PAN card' },
  { key: 'publications_proof',label: 'Publication Proof',     desc: 'Journal acceptance letters or published copies' },
  { key: 'recommendation',    label: 'Recommendation Letter', desc: 'From PhD supervisor or head of institution' },
  { key: 'other',             label: 'Other Documents',       desc: 'Any additional supporting documents' },
]

const RESEARCH_SECTIONS = [
  { key: 'research_papers',     label: 'Research Papers',        icon: FileText   },
  { key: 'patents',             label: 'Patents & Copyrights',   icon: Shield     },
  { key: 'workshops_seminars',  label: 'Workshops & Seminars',   icon: BookOpen   },
  { key: 'publications',        label: 'Publications',           icon: Award      },
]

const SECTION_FIELDS = {
  research_papers: [
    { key: 'title',   label: 'Paper Title',           required: true, type: 'text',   placeholder: 'Full title of the paper' },
    { key: 'journal', label: 'Journal / Conference',              type: 'text',   placeholder: 'e.g. Nature Computational Science' },
    { key: 'year',    label: 'Year',                              type: 'number', placeholder: '2023' },
    { key: 'doi',     label: 'DOI / URL',                         type: 'text',   placeholder: '10.1038/...' },
  ],
  patents: [
    { key: 'title',          label: 'Patent Title',  required: true, type: 'text',   placeholder: 'Full title of the patent' },
    { key: 'patent_number',  label: 'Patent Number',              type: 'text',   placeholder: 'IN202321XXXXXX' },
    { key: 'year',           label: 'Year',                        type: 'number', placeholder: '2023' },
    { key: 'country',        label: 'Country',                     type: 'text',   placeholder: 'India' },
    { key: 'status',         label: 'Status',                      type: 'select', options: ['granted', 'pending', 'filed'] },
  ],
  workshops_seminars: [
    { key: 'name',      label: 'Name',       required: true, type: 'text',   placeholder: 'Name of the event' },
    { key: 'organizer', label: 'Organizer',               type: 'text',   placeholder: 'e.g. IEEE, ISCB' },
    { key: 'type',      label: 'Type',                    type: 'select', options: ['conference', 'workshop', 'seminar', 'webinar'] },
    { key: 'date',      label: 'Date',                    type: 'date',   placeholder: '' },
    { key: 'location',  label: 'Location',                type: 'text',   placeholder: 'City, Country' },
  ],
  publications: [
    { key: 'title',     label: 'Title',     required: true, type: 'text',   placeholder: 'Full title of the publication' },
    { key: 'type',      label: 'Type',                    type: 'select', options: ['book_chapter', 'journal_article', 'conference_paper', 'book'] },
    { key: 'publisher', label: 'Publisher',               type: 'text',   placeholder: 'e.g. Springer, Elsevier' },
    { key: 'year',      label: 'Year',                    type: 'number', placeholder: '2024' },
    { key: 'isbn',      label: 'ISBN / URL',              type: 'text',   placeholder: '978-...' },
  ],
}

const BLANK_DRAWER = { open: false, section: null, item: null, draft: {}, saving: false }

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudentProfileView({ studentId, isAdminView = false, defaultTab = 'profile' }) {
  const [student,         setStudent]         = useState(null)
  const [user,            setUser]            = useState(null)
  const [research,        setResearch]        = useState(null)
  const [submissions,     setSubmissions]     = useState([])
  const [progressReports, setProgressReports] = useState([])
  const [selectedSub,     setSelectedSub]     = useState(null)
  const [subApprovals,    setSubApprovals]    = useState([])
  const [notFound,        setNotFound]        = useState(false)
  const [tab,             setTab]             = useState(defaultTab)
  const [bioEditing,      setBioEditing]      = useState(false)
  const [bioDraft,        setBioDraft]        = useState({})
  const [academicEditing, setAcademicEditing] = useState(false)
  const [academicDraft,   setAcademicDraft]   = useState({})
  const [certs,           setCerts]           = useState({ phd_certificate: false, id_proof: false, publications_proof: false, recommendation: false, other: false })
  const [drawer,          setDrawer]          = useState(BLANK_DRAWER)
  const addToast = useUiStore((s) => s.addToast)
  useScrollLock(drawer.open || Boolean(selectedSub))

  // ── Data loading ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return
    setNotFound(false)
    setStudent(null)
    setUser(null)
    setSubmissions([])
    setProgressReports([])

    getStudentById(studentId)
      .then((r) => {
        if (!r.data) { setNotFound(true); return }
        const s = r.data
        setStudent(s)
        // User data is embedded directly in the student response (first_name, last_name,
        // email, phone, avatar_url come from the JOIN on users). No separate getUserById
        // call needed — that previously broke because r.data.user_id was undefined.
        setUser({
          id:         s.id,
          email:      s.email,
          first_name: s.first_name,
          last_name:  s.last_name,
          phone:      s.phone,
          avatar_url: s.avatar_url,
        })
      })
      .catch(() => setNotFound(true))

    getProfile(studentId)
      .then((r) => setResearch(r.data))
      .catch(() => setResearch(null))

    getSubmissionsByStudent(studentId)
      .then((r) => setSubmissions(r.data || []))
      .catch(() => setSubmissions([]))

    getProgressReportByStudent(studentId)
      .then((r) => setProgressReports(r.data || []))
      .catch(() => setProgressReports([]))
  }, [studentId])

  // ── Error / loading states ──────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="card p-10 text-center">
        <User className="mx-auto text-[color:var(--muted)]" size={32} />
        <p className="mt-3 font-semibold text-[color:var(--text)]">Student not found</p>
        <p className="mt-1 text-sm text-[color:var(--secondary)]">No student record was found for this ID. The student may have been removed or the link may be incorrect.</p>
      </div>
    )
  }

  if (!student || !user) return <SkeletonCard rows={8} />

  const name     = `${user.first_name} ${user.last_name}`
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

  // Normalise progress values — backend returns avg_pct, mock returns completion_percentage
  const completionPct = Math.round(
    student.progress_summary?.avg_pct ??
    student.progress_summary?.completion_percentage ?? 0
  )

  // ── Guides helpers ──────────────────────────────────────────────────────────
  const academicGuide  = (student.guides || []).find((g) => g.guide_type === 'academic')
  const industryGuide  = (student.guides || []).find((g) => g.guide_type === 'industry')

  // ── Fees helpers ────────────────────────────────────────────────────────────
  const totalDue  = Number(student.fees_summary?.total_due  || 0)
  const totalPaid = Number(student.fees_summary?.total_paid || 0)
  const feesPct   = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0

  // ── Submission detail ───────────────────────────────────────────────────────
  const openSub = async (sub) => {
    setSelectedSub(sub)
    setSubApprovals([])
    try {
      const approvalRes = await getApprovals()
      setSubApprovals((approvalRes.data || []).filter((a) => a.submission_id === sub.id))
    } catch { /* no approvals */ }
  }

  // ── Bio save ────────────────────────────────────────────────────────────────
  const saveBio = async () => {
    const updated = await updateStudent(studentId, { profile: { ...student.profile, bio: bioDraft.bio, linkedin_url: bioDraft.linkedin_url } })
    setStudent(updated.data)
    setBioEditing(false)
    addToast({ type: 'success', title: 'Profile updated.' })
  }

  // ── Academic save ───────────────────────────────────────────────────────────
  const saveAcademic = async () => {
    if (!research) return
    const updated = await updateProfile(studentId, {
      research_areas: academicDraft.research_areas?.split(',').map((s) => s.trim()).filter(Boolean) || research.research_areas,
      skills: academicDraft.skills?.split(',').map((s) => s.trim()).filter(Boolean) || research.skills,
    })
    setResearch(updated.data)
    setAcademicEditing(false)
    addToast({ type: 'success', title: 'Research areas & skills updated.' })
  }

  // ── Public toggle ───────────────────────────────────────────────────────────
  const handleTogglePublic = async () => {
    if (!research) return
    const updated = await togglePublic(studentId, !research.is_public)
    setResearch(updated.data)
    addToast({ type: 'success', title: research.is_public ? 'Profile set to private.' : 'Profile is now public.' })
  }

  // ── Research drawer ─────────────────────────────────────────────────────────
  const openAdd   = (section) => setDrawer({ open: true, section, item: null, draft: {}, saving: false })
  const openEdit  = (section, item) => setDrawer({ open: true, section, item, draft: { ...item }, saving: false })
  const closeDrawer = () => setDrawer(BLANK_DRAWER)

  const drawerDraft = (key) => ({
    value: drawer.draft[key] ?? '',
    onChange: (e) => setDrawer((p) => ({ ...p, draft: { ...p.draft, [key]: e.target.value } })),
  })

  const saveDrawer = async () => {
    setDrawer((p) => ({ ...p, saving: true }))
    let updated
    if (drawer.item) {
      const res = await updateResearchItem(studentId, drawer.section, drawer.item.id, drawer.draft)
      updated = { ...research, [drawer.section]: research[drawer.section].map((x) => (x.id === drawer.item.id ? { ...x, ...res.data } : x)) }
    } else {
      const res = await addResearchItem(studentId, drawer.section, drawer.draft)
      updated = { ...research, [drawer.section]: [...(research[drawer.section] || []), res.data] }
    }
    setResearch(updated)
    closeDrawer()
    addToast({ type: 'success', title: drawer.item ? 'Entry updated.' : 'Entry added.' })
  }

  const currentSectionLabel = RESEARCH_SECTIONS.find((s) => s.key === drawer.section)?.label || ''
  const currentFields       = SECTION_FIELDS[drawer.section] || []

  // ── Submission stats ────────────────────────────────────────────────────────
  const subStats = {
    total:    submissions.length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    pending:  submissions.filter((s) => ['pending', 'under_review'].includes(s.status)).length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  }

  const TABS = [
    { key: 'profile',    label: 'Profile' },
    { key: 'submissions',label: `Submissions${submissions.length ? ` (${submissions.length})` : ''}` },
    { key: 'progress',   label: `Progress${progressReports.length ? ` (${progressReports.length})` : ''}` },
    { key: 'research',   label: 'Research Profile' },
  ]

  return (
    <div>
      {/* ── Profile header ── */}
      <div className="card mb-6 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[color:var(--accent)] to-indigo-500 opacity-80" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            {/* Avatar */}
            <div className="relative">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={name}
                  className="h-24 w-24 rounded-3xl border-4 border-[color:var(--card)] object-cover shadow-lg"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'grid' }}
                />
              ) : null}
              <div className={`${user.avatar_url ? 'hidden' : 'grid'} h-24 w-24 place-items-center rounded-3xl border-4 border-[color:var(--card)] bg-[color:var(--accent-tint)] text-2xl font-bold text-[color:var(--accent)] shadow-lg`}>
                {initials}
              </div>
              {!isAdminView && (
                <button className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-[color:var(--card)] shadow" title="Change photo">
                  <Camera size={13} className="text-[color:var(--accent)]" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {research && (
                <button
                  onClick={handleTogglePublic}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${research.is_public ? 'bg-emerald-50 text-emerald-700' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}
                >
                  <Globe size={14} />
                  {research.is_public ? 'Public' : 'Make Public'}
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
            <p className="mt-1 text-sm text-[color:var(--secondary)]">
              {student.enrollment_number || student.permanent_id} · {student.batch_name || student.batch_code || student.batch_id}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={student.status} />
              {student.profile?.linkedin_url && (
                <a href={student.profile.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[color:var(--accent)] hover:underline">
                  <Link2 size={12} /> LinkedIn
                </a>
              )}
              <span className="rounded-full bg-[color:var(--surface)] px-2 py-0.5 text-xs font-semibold text-[color:var(--secondary)]">
                Semester {student.current_semester ?? '—'}
              </span>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickStat label="Overall Progress" value={`${completionPct}%`} sub={`${progressReports.length} reports`} />
            <QuickStat label="Submissions" value={subStats.total} sub={`${subStats.approved} approved`} />
            <QuickStat label="Guides Assigned" value={(student.guides || []).filter((g) => g.is_active !== false).length} sub="active guides" />
            {isAdminView && <QuickStat label="Fees Cleared" value={`${feesPct}%`} sub={totalDue > 0 ? `₹${(totalPaid/100).toLocaleString('en-IN')} / ₹${(totalDue/100).toLocaleString('en-IN')}` : 'No fee record'} />}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${tab === key ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--card)] text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ Profile tab ══════════════════════════════════════════════════════ */}
      {tab === 'profile' && (
        <div className="space-y-5">
          {/* Bio */}
          <div className="card p-6">
            <SH title="About"
              editing={bioEditing}
              onEdit={!isAdminView ? () => { setBioDraft({ bio: student.profile?.bio || '', linkedin_url: student.profile?.linkedin_url || '' }); setBioEditing(true) } : undefined}
              onSave={saveBio}
              onCancel={() => setBioEditing(false)}
            />
            {bioEditing ? (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">Bio</span>
                  <textarea className="textarea mt-1.5 h-28 w-full" placeholder="Short research bio…" value={bioDraft.bio} onChange={(e) => setBioDraft((p) => ({ ...p, bio: e.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">LinkedIn URL</span>
                  <input className="input mt-1.5 w-full" placeholder="https://linkedin.com/in/…" value={bioDraft.linkedin_url} onChange={(e) => setBioDraft((p) => ({ ...p, linkedin_url: e.target.value }))} />
                </label>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-7 text-[color:var(--secondary)]">{student.profile?.bio || 'No bio added yet.'}</p>
            )}
          </div>

          {/* Personal Information */}
          <div className="card p-6">
            <SH title="Personal Information" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <IR label="Email"            value={user.email} />
              <IR label="Phone"            value={user.phone} />
              <IR label="Enrolled"         value={formatDate(student.enrolled_at)} />
              <IR label="Batch"            value={student.batch_name || student.batch_code} />
              <IR label="Course"           value={student.course_name} />
              <IR label="Semester"         value={student.current_semester ? `Semester ${student.current_semester}` : '—'} />
            </div>
          </div>

          {/* Guides — admin view */}
          {isAdminView && (
            <div className="card p-6">
              <SH title="Assigned Guides" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <GuideCard type="Academic" guide={academicGuide} />
                <GuideCard type="Industry" guide={industryGuide} />
              </div>
            </div>
          )}

          {/* Fees Summary — admin view */}
          {isAdminView && (
            <div className="card p-6">
              <div className="safe-row">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><DollarSign size={18} /></span>
                  <h2 className="text-lg font-semibold text-[color:var(--text)]">Fees Summary</h2>
                </div>
              </div>
              {totalDue > 0 ? (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <IR label="Total Due"  value={`₹${(totalDue  / 100).toLocaleString('en-IN')}`} />
                    <IR label="Total Paid" value={`₹${(totalPaid / 100).toLocaleString('en-IN')}`} />
                    <IR label="Balance"    value={`₹${((totalDue - totalPaid) / 100).toLocaleString('en-IN')}`} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-[color:var(--secondary)]">
                      <span>Payment progress</span>
                      <span>{feesPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                      <div className={`h-2 rounded-full transition-all ${feesPct >= 100 ? 'bg-emerald-500' : feesPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(feesPct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[color:var(--secondary)]">No fee records found.</p>
              )}
            </div>
          )}

          {/* Research Areas & Skills */}
          <div className="card p-6">
            <SH title="Research Areas & Skills"
              editing={academicEditing}
              onEdit={!isAdminView ? () => { setAcademicDraft({ research_areas: research?.research_areas?.join(', ') || '', skills: research?.skills?.join(', ') || '' }); setAcademicEditing(true) } : undefined}
              onSave={saveAcademic}
              onCancel={() => setAcademicEditing(false)}
            />
            {academicEditing ? (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">Research Areas <span className="font-normal text-[color:var(--muted)]">(comma-separated)</span></span>
                  <input className="input mt-1.5 w-full" placeholder="Molecular Biology, Cancer Research" value={academicDraft.research_areas} onChange={(e) => setAcademicDraft((p) => ({ ...p, research_areas: e.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">Skills <span className="font-normal text-[color:var(--muted)]">(comma-separated)</span></span>
                  <input className="input mt-1.5 w-full" placeholder="Python, R, CRISPR" value={academicDraft.skills} onChange={(e) => setAcademicDraft((p) => ({ ...p, skills: e.target.value }))} />
                </label>
              </div>
            ) : research ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Research Areas</p>
                  <div className="flex flex-wrap gap-2">
                    {(research.research_areas || []).length > 0
                      ? (research.research_areas || []).map((a) => <span key={a} className="rounded-full bg-[color:var(--accent-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">{a}</span>)
                      : <span className="text-sm text-[color:var(--secondary)]">None specified.</span>}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(research.skills || []).length > 0
                      ? (research.skills || []).map((s) => <span key={s} className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--text)]">{s}</span>)
                      : <span className="text-sm text-[color:var(--secondary)]">None specified.</span>}
                  </div>
                </div>
              </div>
            ) : <p className="mt-3 text-sm text-[color:var(--secondary)]">No research profile data yet.</p>}
          </div>

          {/* Certificates */}
          <div className="card p-6">
            <SH title="Certificates & Documents" />
            <p className="mt-1 text-sm text-[color:var(--secondary)]">Upload supporting documents for verification. Accepted: PDF, JPG, PNG (max 10 MB).</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {CERT_TYPES.map(({ key, label, desc }) => (
                <div key={key} className={`flex items-start gap-3 rounded-3xl border p-4 transition ${certs[key] ? 'border-emerald-200 bg-emerald-50' : 'border-[color:var(--border)] bg-[color:var(--surface)]'}`}>
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${certs[key] ? 'bg-emerald-100 text-emerald-600' : 'bg-[color:var(--card)] text-[color:var(--muted)]'}`}>
                    {certs[key] ? <FileText size={16} /> : <Upload size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[color:var(--text)]">{label}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{certs[key] ? 'Uploaded · Pending verification' : desc}</p>
                    {!isAdminView && (
                      <button className={`mt-2 text-xs font-semibold ${certs[key] ? 'text-red-500' : 'text-[color:var(--accent)]'}`} onClick={() => setCerts((p) => ({ ...p, [key]: !p[key] }))}>
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

      {/* ══ Submissions tab ══════════════════════════════════════════════════ */}
      {tab === 'submissions' && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total"    value={subStats.total}    accent="var(--accent)" />
            <StatCard label="Approved" value={subStats.approved} accent="#10b981" />
            <StatCard label="Pending"  value={subStats.pending}  accent="#f59e0b" />
            <StatCard label="Rejected" value={subStats.rejected} accent="#ef4444" />
          </div>

          {submissions.length === 0 ? (
            <div className="card p-10 text-center">
              <FileText className="mx-auto text-[color:var(--muted)]" size={32} />
              <p className="mt-3 font-semibold text-[color:var(--text)]">No submissions yet</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">Submissions will appear here once the student starts submitting reports.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <button
                  key={sub.id}
                  className="w-full rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 text-left transition hover:border-[color:var(--accent)] hover:shadow-sm"
                  onClick={() => openSub(sub)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold text-[color:var(--text)]">{sub.title}</p>
                      <p className="mt-1 text-xs text-[color:var(--secondary)]">
                        Report {sub.report_period} · v{sub.title_version || 1} · {formatDate(sub.submitted_at)}
                      </p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>
                  {sub.presentation_filename && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
                      <FileText size={11} /> {sub.presentation_filename}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ Progress tab ════════════════════════════════════════════════════ */}
      {tab === 'progress' && (
        <div className="space-y-5">
          {/* Overall bar */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Overall Completion</p>
                <p className="mt-1 text-3xl font-bold text-[color:var(--text)]">{completionPct}<span className="text-lg font-semibold text-[color:var(--secondary)]">%</span></p>
              </div>
              <GraduationCap size={36} className="text-[color:var(--accent)] opacity-40" />
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
              <div className="h-full rounded-full bg-[color:var(--accent)] transition-all" style={{ width: `${completionPct}%` }} />
            </div>
          </div>

          {progressReports.length === 0 ? (
            <div className="card p-10 text-center">
              <Clock className="mx-auto text-[color:var(--muted)]" size={32} />
              <p className="mt-3 font-semibold text-[color:var(--text)]">No progress reports yet</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">Progress reports will appear here as the student completes each period.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {progressReports.map((r) => {
                const pct = Math.round(r.completion_percentage ?? r.avg_pct ?? 0)
                return (
                  <div key={r.id} className="card p-5">
                    <div className="safe-row items-start">
                      <div>
                        <p className="font-semibold text-[color:var(--text)]">{r.period_label || `Period ${r.report_period || r.id}`}</p>
                        <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
                          {r.total_submissions ?? 0} submissions · {r.approved_count ?? r.approved_submissions ?? 0} approved
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--border)]">
                      <div
                        className={`h-full rounded-full ${r.status === 'overdue' ? 'bg-orange-500' : r.status === 'completed' ? 'bg-emerald-500' : 'bg-[color:var(--accent)]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-right text-xs font-semibold text-[color:var(--secondary)]">{pct}%</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ Research Profile tab ═════════════════════════════════════════════ */}
      {tab === 'research' && (
        <div className="space-y-5">
          {research ? (
            <>
              {/* Public banner */}
              <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    Research profile is {research.is_public ? <span className="text-emerald-600">public</span> : <span className="text-[color:var(--muted)]">private</span>}
                  </p>
                  {research.is_public && <p className="mt-0.5 text-xs text-[color:var(--secondary)]">Public URL: /p/{research.public_slug}</p>}
                </div>
                {research.is_public && (
                  <Link to={`/p/${research.public_slug}`} className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]">
                    <ExternalLink size={14} /> View
                  </Link>
                )}
              </div>

              {/* Research sections */}
              {RESEARCH_SECTIONS.map(({ key, label, icon: Icon }) => (
                <div key={key} className="card p-6">
                  <div className="safe-row">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                        <Icon size={18} />
                      </span>
                      <h2 className="text-lg font-semibold text-[color:var(--text)]">
                        {label} <span className="text-sm font-normal text-[color:var(--secondary)]">({research[key]?.length || 0})</span>
                      </h2>
                    </div>
                    {!isAdminView && (
                      <button onClick={() => openAdd(key)}
                        className="grid h-8 w-8 place-items-center rounded-2xl bg-[color:var(--accent-tint)] text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white">
                        <Plus size={16} />
                      </button>
                    )}
                  </div>

                  {(research[key] || []).length === 0 ? (
                    <p className="mt-4 text-sm text-[color:var(--secondary)]">No {label.toLowerCase()} added yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {(research[key] || []).map((item) => (
                        <div key={item.id} className="flex items-start gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[color:var(--text)]">{item.title || item.name}</p>
                            <p className="mt-1 text-xs text-[color:var(--secondary)]">
                              {[item.journal, item.organizer, item.publisher, item.country].filter(Boolean).join(' · ')}
                              {item.year ? ` · ${item.year}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {item.is_verified && <StatusBadge status="approved" />}
                            {!isAdminView && (
                              <button onClick={() => openEdit(key, item)}
                                className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--surface-strong)] text-[color:var(--muted)] transition hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)]">
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Skills */}
              <div className="card p-6">
                <div className="safe-row">
                  <h2 className="text-lg font-semibold text-[color:var(--text)]">Skills</h2>
                  {!isAdminView && (
                    <button
                      onClick={() => { setTab('profile'); setAcademicEditing(true); setAcademicDraft({ research_areas: research?.research_areas?.join(', ') || '', skills: research?.skills?.join(', ') || '' }) }}
                      className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--surface-strong)] text-[color:var(--muted)] transition hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)]">
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(research.skills || []).length > 0
                    ? (research.skills || []).map((s) => <span key={s} className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-sm text-[color:var(--text)]">{s}</span>)
                    : <p className="text-sm text-[color:var(--secondary)]">No skills added yet.</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="card p-10 text-center">
              <Award className="mx-auto text-[color:var(--muted)]" size={32} />
              <p className="mt-3 font-semibold text-[color:var(--text)]">No research profile yet</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">Research profile will appear here once created.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Submission detail drawer ── */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedSub(null)}>
          <div className="drawer-panel lg:!w-[min(840px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 safe-row border-b border-[color:var(--border)] p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Submission Detail</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-[color:var(--text)]">{selectedSub.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">
                  Report {selectedSub.report_period} · v{selectedSub.title_version || 1} · {formatDate(selectedSub.submitted_at)}
                </p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setSelectedSub(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto overscroll-contain p-6 space-y-5 xl:grid xl:grid-cols-[1fr_300px] xl:gap-5 xl:space-y-0">
              <div className="space-y-5">
                {/* Media preview */}
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <div className="safe-row">
                    <div>
                      <p className="font-semibold text-[color:var(--text)]">Presentation Media</p>
                      <p className="mt-1 text-xs text-[color:var(--secondary)]">{selectedSub.presentation_filename || 'No file attached'}</p>
                    </div>
                    {selectedSub.presentation_url && (
                      <a href={selectedSub.presentation_url} target="_blank" rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 text-sm font-semibold text-[color:var(--accent)]">
                        <ExternalLink size={14} /> Open
                      </a>
                    )}
                  </div>
                  <div className="mt-4 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)]">
                    {selectedSub.presentation_type === 'pdf' && selectedSub.presentation_url
                      ? <iframe title="Preview" src={selectedSub.presentation_url} className="h-64 w-full" />
                      : selectedSub.presentation_type === 'video' && selectedSub.presentation_url
                        ? <video src={selectedSub.presentation_url} controls className="h-64 w-full bg-black" />
                        : <div className="grid h-64 place-items-center text-center p-6">
                            <div>
                              <FileText className="mx-auto text-[color:var(--accent)]" size={32} />
                              <p className="mt-3 font-semibold text-[color:var(--text)]">Preview unavailable</p>
                              <p className="mt-1 text-sm text-[color:var(--secondary)]">Open the uploaded file to review it.</p>
                            </div>
                          </div>
                    }
                  </div>
                </div>

                {/* Submission metadata */}
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <p className="font-semibold text-[color:var(--text)]">Submission Info</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <IR label="Report Period" value={`Report ${selectedSub.report_period}`} />
                    <IR label="Version"       value={`v${selectedSub.title_version || 1}`} />
                    <IR label="Status"        value={<StatusBadge status={selectedSub.status} />} />
                    <IR label="Submitted"     value={formatDate(selectedSub.submitted_at)} />
                  </div>
                </div>
              </div>

              {/* Approval thread */}
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                <p className="font-semibold text-[color:var(--text)]">Approval Thread</p>
                {subApprovals.length === 0 ? (
                  <p className="mt-3 text-sm text-[color:var(--secondary)]">No approval records yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {subApprovals.map((a) => (
                      <div key={a.id} className="rounded-3xl bg-[color:var(--card)] p-4">
                        <div className="safe-row items-start">
                          <p className="text-sm font-semibold capitalize text-[color:var(--text)]">{a.stage?.replaceAll('_', ' ')}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]">{a.comments || 'No comment.'}</p>
                        {a.suggested_title && (
                          <p className="mt-2 rounded-2xl bg-[color:var(--surface)] p-3 text-xs leading-5 text-[color:var(--secondary)]">
                            <b>Suggested title:</b> {a.suggested_title}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit research item drawer ── */}
      {drawer.open && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={closeDrawer}>
          <div className="drawer-panel lg:!w-[min(480px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{drawer.item ? 'Edit Entry' : 'New Entry'}</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{currentSectionLabel}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={closeDrawer}><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
              {currentFields.map(({ key, label, required, type, placeholder, options }) => (
                <label key={key} className="block">
                  <span className="text-sm font-semibold text-[color:var(--text)]">
                    {label}{required && <span className="ml-1 text-red-500">*</span>}
                  </span>
                  <span className="mt-1.5 block">
                    {type === 'select' ? (
                      <select className="input w-full" {...drawerDraft(key)}>
                        {options.map((o) => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}
                      </select>
                    ) : (
                      <input className="input w-full" type={type} placeholder={placeholder} required={required} {...drawerDraft(key)} />
                    )}
                  </span>
                </label>
              ))}
            </div>

            <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
              <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={closeDrawer}>Cancel</button>
              <button type="button" className="btn-primary flex-1" disabled={drawer.saving} onClick={saveDrawer}>
                {drawer.saving ? 'Saving…' : drawer.item ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function SH({ title, editing, onEdit, onSave, onCancel }) {
  return (
    <div className="safe-row">
      <h2 className="text-lg font-semibold text-[color:var(--text)]">{title}</h2>
      {onEdit && !editing && (
        <button onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--surface)] text-[color:var(--muted)] transition hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)]" title="Edit">
          <Pencil size={14} />
        </button>
      )}
      {editing && (
        <div className="flex gap-2">
          <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--surface)] text-[color:var(--muted)]" title="Cancel"><X size={14} /></button>
          <button onClick={onSave}   className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--accent)] text-white"             title="Save"><Save size={14} /></button>
        </div>
      )}
    </div>
  )
}

function IR({ label, value }) {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
      <div className="mt-1.5 text-sm font-semibold text-[color:var(--text)]">{value ?? '—'}</div>
    </div>
  )
}

function QuickStat({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-xs text-[color:var(--muted)] uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-bold text-[color:var(--text)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{sub}</p>}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 text-center">
      <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-[color:var(--secondary)]">{label}</p>
    </div>
  )
}

function GuideCard({ type, guide }) {
  return (
    <div className={`rounded-3xl border p-4 ${guide ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]' : 'border-[color:var(--border)] bg-[color:var(--surface)]'}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">{type} Guide</p>
      {guide ? (
        <>
          <p className="mt-2 font-semibold text-[color:var(--text)]">{guide.first_name} {guide.last_name}</p>
          <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{guide.email}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-[color:var(--secondary)]">Not assigned</p>
      )}
    </div>
  )
}
