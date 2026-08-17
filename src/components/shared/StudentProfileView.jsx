/**
 * StudentProfileView — shared admin + student profile component.
 *
 * Outer tabs: My Profile (with inner subtabs Profile / Fees [student only] /
 * Research Profile) and Submissions (with inner subtabs Progress Reports /
 * Assignments / Milestones). Milestones are wired to /api/targets (the real
 * module), not the legacy /api/progress-reports compatibility view. Research
 * Profile and Fees remain reachable for students via the My Profile outer tab
 * so they don't disappear from the sidenav.
 */
import {
  Award, BookOpen, Camera, ChevronDown, Clock,
  DollarSign, ExternalLink, FileText, Globe, GraduationCap,
  Link2, Loader2, Pencil, Plus, Save, Shield, UploadCloud, User, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  addResearchItem, getProfile, togglePublic,
  updateProfile, updateResearchItem,
} from '../../api/services/researchProfileService.js'
import { assignGuide, getStudentById, updateStudent } from '../../api/services/studentService.js'
import { getUsers, updateUser } from '../../api/services/userService.js'
import Select from './Select.jsx'
import StudentOnboardingPanel from './StudentOnboardingPanel.jsx'
import { getFeesByStudent } from '../../api/services/feeService.js'
import {
  createSubmission, getProgressReportsByStudent, getSubmissions,
  submitForReview, uploadSubmissionAttachment,
} from '../../api/services/submissionService.js'
import { getMyCycle } from '../../api/services/progressCycleService.js'
import { getMyAssignments } from '../../api/services/assignmentService.js'
import { getProgressSummary, getTargets, targetState } from '../../api/services/targetService.js'
import UploadProgressReportDrawer from '../admin/UploadProgressReportDrawer.jsx'
import OnBehalfSubmissionDrawer from '../admin/OnBehalfSubmissionDrawer.jsx'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'
import { useUiStore } from '../../store/uiStore.js'
import { usePermStore } from '../../store/permStore.js'
import SkeletonCard from './SkeletonCard.jsx'
import StatusBadge from './StatusBadge.jsx'
import SubmissionFileLink from './SubmissionFileLink.jsx'
import SubmissionRemarks from './SubmissionRemarks.jsx'

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

export default function StudentProfileView({ studentId, isAdminView = false, defaultTab = 'profile', defaultSubTab }) {
  const navigate = useNavigate()
  // Translate legacy outer-tab values onto the new (outer, inner) shape so existing
  // call sites (e.g. ResearchProfilePage passing defaultTab='research') keep working.
  const _normalizeTab = (() => {
    switch (defaultTab) {
      case 'reports':     return { outer: 'submissions', inner: 'reports' }
      case 'progress':    return { outer: 'submissions', inner: 'milestones' }
      case 'research':    return { outer: 'profile',     inner: 'research' }
      case 'fees':        return { outer: 'profile',     inner: 'fees' }
      case 'submissions': return { outer: 'submissions', inner: defaultSubTab || 'reports' }
      case 'profile':
      default:            return { outer: 'profile',     inner: defaultSubTab || 'profile' }
    }
  })()
  const [student,         setStudent]         = useState(null)
  const [user,            setUser]            = useState(null)
  const [research,        setResearch]        = useState(null)
  // Milestones now come from the targets module (/api/targets). Each target row may
  // already have its latest submission joined on it (s.id, s.status, s.submitted_at).
  const [targets,         setTargets]         = useState([])
  const [progressSummary, setProgressSummary] = useState(null)
  // Assignment-type submissions (filtered from the generic submissions list).
  const [assignments,     setAssignments]     = useState([])
  // Fees list, lazily loaded only when the student opens the Fees subtab.
  const [fees,            setFees]            = useState(null)
  // Uploaded progress-report DOCUMENTS (submissions of type 'progress_report').
  // Distinct from the targets list above.
  const [reportDocs,      setReportDocs]      = useState([])
  const [reportUploadOpen,setReportUploadOpen]= useState(false)
  const [openReportId,    setOpenReportId]    = useState(null)
  const [openTargetId,    setOpenTargetId]    = useState(null)  // which milestone's submit panel is expanded
  const [openAssignmentId,setOpenAssignmentId]= useState(null)  // which assignment's submit panel is expanded
  const [assignmentUploadOpen, setAssignmentUploadOpen] = useState(false) // admin on-behalf drawer
  const [milestoneUploadOpen,  setMilestoneUploadOpen]  = useState(false) // admin on-behalf drawer
  // Student's own batch assignments + my_submission_* status (mine=1). Admin
  // view keeps reading the generic `assignments` list (filtered submissions)
  // below instead — it needs every scholar's submissions, not just "mine".
  const [myAssignments,   setMyAssignments]   = useState([])
  // Current-semester progress-report window (student self-submit only —
  // admin view keeps its existing "Upload Report" on-behalf flow instead).
  const [cycle,           setCycle]           = useState(null)
  const [notFound,        setNotFound]        = useState(false)
  const [tab,             setTab]             = useState(_normalizeTab.outer)
  // Inner subtab — only meaningful when outer tab is 'profile' or 'submissions'.
  const [subTab,          setSubTab]          = useState(_normalizeTab.inner)
  const [bioEditing,      setBioEditing]      = useState(false)
  const [bioDraft,        setBioDraft]        = useState({})
  const [academicEditing, setAcademicEditing] = useState(false)
  const [academicDraft,   setAcademicDraft]   = useState({})
  const [drawer,          setDrawer]          = useState(BLANK_DRAWER)
  const addToast = useUiStore((s) => s.addToast)
  // Only institute staff file a report on a scholar's behalf.
  const isStaff = usePermStore((s) => s.hasRole('admin') || s.hasRole('coordinator'))
  const canUploadReport = isAdminView && isStaff
  // Admin/coordinator staff already hold students:update server-side — this
  // just stops the UI from hard-coding their own view as permanently read-only.
  const canEditProfile = !isAdminView || isStaff
  const canReadUsers = usePermStore((s) => s.can('users', 'read'))
  const [personalEditing, setPersonalEditing] = useState(false)
  const [personalDraft,   setPersonalDraft]   = useState({})
  const [guideOptions,    setGuideOptions]    = useState({ academic: [], industry: [] })
  const [assigningGuide,  setAssigningGuide]  = useState(null) // 'academic' | 'industry' | null
  useScrollLock(drawer.open || reportUploadOpen)

  // Eligible guides for the assign dropdowns — only fetched for staff who can
  // actually see the roster (coordinators without users:read see a disabled
  // "assign" affordance instead of a silently-empty dropdown).
  useEffect(() => {
    if (!isAdminView || !isStaff || !canReadUsers) return
    Promise.all([getUsers({ role: 'academic_guide' }), getUsers({ role: 'industry_mentor' })])
      .then(([a, i]) => setGuideOptions({ academic: a.data || [], industry: i.data || [] }))
      .catch(() => setGuideOptions({ academic: [], industry: [] }))
  }, [isAdminView, isStaff, canReadUsers])

  // ── Data loading ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return
    setNotFound(false)
    setStudent(null)
    setUser(null)
    setReportDocs([])

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

    // Assignment-type submissions — the new "Assignments" subtab source.
    loadAssignments()

    loadTargets()
    getProgressSummary(studentId)
      .then((r) => setProgressSummary(r.data || null))
      .catch(() => setProgressSummary(null))

    loadReportDocs()
    if (!isAdminView) { loadCycle(); loadMyAssignments() }
  }, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load fees only when the student opens the Fees subtab inside My Profile. The
  // dedicated /student/fees route still works for deep links and direct visits.
  useEffect(() => {
    if (tab !== 'profile' || subTab !== 'fees' || !studentId) return
    if (fees !== null) return
    let cancelled = false
    getFeesByStudent(studentId)
      .then((r) => { if (!cancelled) setFees(r.data || []) })
      .catch(() => { if (!cancelled) setFees([]) })
    return () => { cancelled = true }
  }, [tab, subTab, studentId, fees])

  // Extracted so the upload drawer can refresh the list without a full reload.
  function loadReportDocs() {
    if (!studentId) return
    getProgressReportsByStudent(studentId)
      .then((r) => setReportDocs(r.data || []))
      .catch(() => setReportDocs([]))
  }

  // Current-semester window — re-fetched after every slot upload / submit so
  // can_submit and the attached files always reflect the server's truth.
  function loadCycle() {
    getMyCycle().then((r) => setCycle(r.data || null)).catch(() => setCycle(null))
  }

  // My batch's published assignments + my_submission_status (student self-view only).
  function loadMyAssignments() {
    getMyAssignments().then((r) => setMyAssignments(r.data || [])).catch(() => setMyAssignments([]))
  }

  // Assignment-type submissions for this scholar — admin view's "Assignments" subtab source.
  function loadAssignments() {
    if (!studentId) return
    getSubmissions({ student_user_id: studentId, submission_type: 'assignment' })
      .then((r) => setAssignments(r.data || []))
      .catch(() => setAssignments([]))
  }

  // Milestones read from /api/targets (real module), not the legacy
  // compatibility view that used to live at /api/progress-reports.
  // ?student_user_id= also covers admin viewing one scholar's own status.
  function loadTargets() {
    if (!studentId) return
    getTargets({ student_user_id: studentId })
      .then((r) => setTargets(r.data || []))
      .catch(() => setTargets([]))
  }

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

  // Normalise progress values. Prefer the targets-derived roll-up (authoritative) over
  // anything embedded in the student response, which may still be the legacy average.
  // /api/targets/progress-summary returns { by_semester: [...], overall: { percent } }.
  const completionPct = Math.round(
    progressSummary?.overall?.percent ??
    progressSummary?.percent ??
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
  // Full-page preview (with feedback panel) instead of a sidedrawer.
  const openSub = (sub) => navigate(`/${isAdminView ? 'admin' : 'student'}/submissions/${sub.id}/preview`)

  // ── Bio save ────────────────────────────────────────────────────────────────
  const saveBio = async () => {
    const updated = await updateStudent(studentId, { profile: { ...student.profile, bio: bioDraft.bio, linkedin_url: bioDraft.linkedin_url } })
    setStudent(updated.data)
    setBioEditing(false)
    addToast({ type: 'success', title: 'Profile updated.' })
  }

  // ── Personal info save ──────────────────────────────────────────────────────
  // Only `phone` is wired to a real save path — PUT /users/:id's field allowlist
  // is identity-only (first/last name, phone, avatar, is_active). Email, batch
  // and semester stay read-only here; there's no endpoint that safely mutates
  // them from this view (semester moves through /batches/:id/advance-semester).
  const savePersonal = async () => {
    try {
      await updateUser(studentId, { phone: personalDraft.phone })
      setUser((u) => ({ ...u, phone: personalDraft.phone }))
      setPersonalEditing(false)
      addToast({ type: 'success', title: 'Contact details updated.' })
    } catch (err) {
      addToast({ type: 'error', title: 'Could not save', message: err.response?.data?.message })
    }
  }

  // ── Guide assignment ────────────────────────────────────────────────────────
  // Optimistic: the picked guide appears immediately; a failed request rolls
  // the card back to "Not assigned" and surfaces why.
  const handleAssignGuide = async (guideType, guideUserId) => {
    const pool = guideType === 'academic' ? guideOptions.academic : guideOptions.industry
    const picked = pool.find((g) => g.id === guideUserId)
    if (!picked || !student.batch_id) return
    const prevGuides = student.guides || []
    setStudent((s) => ({
      ...s,
      guides: [...prevGuides.filter((g) => g.guide_type !== guideType), { guide_type: guideType, guide_user_id: picked.id, ...picked }],
    }))
    setAssigningGuide(null)
    try {
      await assignGuide(studentId, { guide_user_id: picked.id, guide_type: guideType, batch_id: student.batch_id })
      addToast({ type: 'success', title: `${picked.first_name} ${picked.last_name} assigned as ${guideType === 'academic' ? 'academic guide' : 'industry mentor'}.` })
    } catch (err) {
      setStudent((s) => ({ ...s, guides: prevGuides }))
      addToast({ type: 'error', title: 'Could not assign guide', message: err.response?.data?.message })
    }
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
  // The Assignments subtab is the new home for freeform scholar submissions (was the
  // old "Submissions" generic tab). The stats below describe THAT view.
  const subStats = {
    total:    assignments.length,
    approved: assignments.filter((s) => s.status === 'approved').length,
    pending:  assignments.filter((s) => ['pending', 'under_review'].includes(s.status)).length,
    rejected: assignments.filter((s) => s.status === 'rejected').length,
  }

  // Outer tabs. The old Profile | Progress Reports | Submissions | Milestones | Research
  // Profile row is collapsed into two outer tabs: My Profile (with inner subtabs
  // Profile / Fees [student only] / Research Profile) and Submissions (with inner
  // subtabs Progress Reports / Assignments / Milestones).
  const subsCount = reportDocs.length + assignments.length + targets.length
  const TABS = [
    { key: 'profile',     label: 'My Profile' },
    { key: 'submissions', label: `Submissions${subsCount ? ` (${subsCount})` : ''}` },
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
                  className="h-24 w-24 rounded-xl border-4 border-[color:var(--card)] object-cover shadow-lg"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'grid' }}
                />
              ) : null}
              <div className={`${user.avatar_url ? 'hidden' : 'grid'} h-24 w-24 place-items-center rounded-xl border-4 border-[color:var(--card)] bg-[color:var(--accent-tint)] text-2xl font-bold text-[color:var(--accent)] shadow-lg`}>
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
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${research.is_public ? 'bg-emerald-50 text-emerald-700' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}
                >
                  <Globe size={14} />
                  {research.is_public ? 'Public' : 'Make Public'}
                </button>
              )}
              {research?.is_public && (
                <Link to={`/p/${research.public_slug}`} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]">
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
            <QuickStat label="Overall Progress" value={`${completionPct}%`} sub={`${targets.length} milestones`} />
            <QuickStat label="Submissions" value={subStats.total} sub={`${subStats.approved} approved`} />
            <QuickStat label="Guides Assigned" value={(student.guides || []).filter((g) => g.is_active !== false).length} sub="active guides" />
            {isAdminView && <QuickStat label="Fees Cleared" value={`${feesPct}%`} sub={totalDue > 0 ? `₹${(totalPaid/100).toLocaleString('en-IN')} / ₹${(totalDue/100).toLocaleString('en-IN')}` : 'No fee record'} />}
          </div>
        </div>
      </div>

      {/* ── Outer tabs ── */}
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => { setTab(key); setSubTab(key === 'profile' ? 'profile' : 'reports') }}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${tab === key ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--card)] text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Inner subtabs (rendered only when an outer tab is active) ── */}
      {tab === 'profile' && (
        <div className="mb-5 flex flex-wrap gap-2 border-b border-[color:var(--border)] pb-3">
          {[
            { key: 'profile',  label: 'Profile' },
            ...(!isAdminView ? [{ key: 'fees', label: 'Fees' }] : []),
            { key: 'research', label: 'Research Profile' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSubTab(key)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${subTab === key ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'submissions' && (
        <div className="mb-5 flex flex-wrap gap-2 border-b border-[color:var(--border)] pb-3">
          {[
            { key: 'reports',     label: `Progress Reports${reportDocs.length  ? ` (${reportDocs.length})`  : ''}` },
            { key: 'assignments', label: `Assignments${assignments.length    ? ` (${assignments.length})`    : ''}` },
            { key: 'milestones',  label: `Milestones${targets.length         ? ` (${targets.length})`         : ''}` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSubTab(key)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${subTab === key ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

            {/* ══ My Profile > Profile subtab ════════════════════════════════════════ */}
      {tab === 'profile' && subTab === 'profile' && (
        <div className="space-y-5">
          {/* Bio */}
          <div className="card p-6">
            <SH title="About"
              editing={bioEditing}
              onEdit={canEditProfile ? () => { setBioDraft({ bio: student.profile?.bio || '', linkedin_url: student.profile?.linkedin_url || '' }); setBioEditing(true) } : undefined}
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
            <SH title="Personal Information"
              editing={personalEditing}
              onEdit={canEditProfile ? () => { setPersonalDraft({ phone: user.phone || '' }); setPersonalEditing(true) } : undefined}
              onSave={savePersonal}
              onCancel={() => setPersonalEditing(false)}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <IR label="Email" value={user.email} />
              {personalEditing ? (
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Phone</span>
                  <input className="input mt-1.5 w-full" value={personalDraft.phone} onChange={(e) => setPersonalDraft((p) => ({ ...p, phone: e.target.value }))} />
                </label>
              ) : (
                <IR label="Phone" value={user.phone} />
              )}
              <IR label="Enrolled"         value={formatDate(student.enrolled_at)} />
              <IR label="Batch"            value={student.batch_name || student.batch_code} />
              <IR label="Course"           value={student.course_name} />
              <IR label="Semester"         value={student.current_semester ? `Semester ${student.current_semester}` : '—'} />
            </div>
            {personalEditing && (
              <p className="mt-3 text-xs text-[color:var(--muted)]">Batch, semester and enrollment date change through their own workflows (e.g. advancing a semester) — not editable here.</p>
            )}
          </div>

          {/* Guides — admin view */}
          {isAdminView && (
            <div className="card p-6">
              <SH title="Assigned Guides" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <GuideCard
                  type="Academic" guide={academicGuide}
                  canAssign={isStaff && canReadUsers} options={guideOptions.academic}
                  assigning={assigningGuide === 'academic'}
                  onStartAssign={() => setAssigningGuide('academic')}
                  onCancelAssign={() => setAssigningGuide(null)}
                  onPick={(id) => handleAssignGuide('academic', id)}
                />
                <GuideCard
                  type="Industry" guide={industryGuide}
                  canAssign={isStaff && canReadUsers} options={guideOptions.industry}
                  assigning={assigningGuide === 'industry'}
                  onStartAssign={() => setAssigningGuide('industry')}
                  onCancelAssign={() => setAssigningGuide(null)}
                  onPick={(id) => handleAssignGuide('industry', id)}
                />
              </div>
            </div>
          )}

          {/* Fees Summary — admin view */}
          {isAdminView && (
            <div className="card p-6">
              <div className="safe-row">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><DollarSign size={18} /></span>
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
              onEdit={canEditProfile ? () => { setAcademicDraft({ research_areas: research?.research_areas?.join(', ') || '', skills: research?.skills?.join(', ') || '' }); setAcademicEditing(true) } : undefined}
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

          {/* Onboarding details — personal-info fields + document uploads.
              Real API wiring against /students/:userId/profile-details and
              /students/:userId/documents/:slot (replaces the old CERT_TYPES
              block, which only toggled local state and never called an API). */}
          <StudentOnboardingPanel userId={studentId} editable={canEditProfile} />
        </div>
      )}

            {/* ══ Submissions > Progress Reports subtab ═════════════════════════════════ */}
      {tab === 'submissions' && subTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text)]">
                {isAdminView ? 'Uploaded progress reports' : 'Your progress reports'}
              </p>
              <p className="mt-0.5 text-sm text-[color:var(--secondary)]">
                {isAdminView
                  ? 'Documents filed for this scholar, with their review status and feedback thread.'
                  : 'One report per semester — pick up where you left off, or start the current one.'}
              </p>
            </div>
            {canUploadReport && (
              <button
                className="btn-primary inline-flex items-center gap-2"
                onClick={() => setReportUploadOpen(true)}
              >
                <UploadCloud size={15} /> Upload Report
              </button>
            )}
          </div>

          {/* Student self-submit: the current semester's window, always up top. */}
          {!isAdminView && cycle && (
            <ProgressCycleCard cycle={cycle} onChange={() => { loadCycle(); loadReportDocs() }} addToast={addToast} />
          )}

          {/* Past semesters only, when a live cycle is shown above (avoid showing
              the current semester twice). Admin view is unfiltered, unchanged. */}
          {(() => {
            const list = (!isAdminView && cycle)
              ? reportDocs.filter((r) => (r.semester || 1) < cycle.semester)
              : reportDocs
            if (list.length === 0 && (isAdminView || !cycle)) {
              return (
                <div className="card p-10 text-center">
                  <FileText className="mx-auto text-[color:var(--muted)]" size={32} />
                  <p className="mt-3 font-semibold text-[color:var(--text)]">No progress reports yet</p>
                  <p className="mt-1 text-sm text-[color:var(--secondary)]">
                    {canUploadReport
                      ? 'Upload a report to file it under this scholar and send it for review.'
                      : 'Reports appear here once they are uploaded.'}
                  </p>
                </div>
              )
            }
            if (list.length === 0) return null
            return (
            <div className="space-y-3">
              {list.map((r) => {
                const files = Array.isArray(r.file_urls) ? r.file_urls : []
                const expanded = openReportId === r.id
                return (
                  <div key={r.id} className="card overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 p-5 text-left"
                      onClick={() => setOpenReportId(expanded ? null : r.id)}
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold text-[color:var(--text)]">{r.title}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--secondary)]">
                          <span>Report {r.semester || 1}</span>
                          <span>{files.length} file{files.length === 1 ? '' : 's'}</span>
                          {r.remarks_count > 0 && <span>{r.remarks_count} remark{r.remarks_count === 1 ? '' : 's'}</span>}
                          <span>{formatDate(r.submitted_at || r.created_at)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={r.status} />
                        <ChevronDown size={16} className={`text-[color:var(--muted)] transition ${expanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {expanded && (
                      <div className="space-y-5 border-t border-[color:var(--border)] p-5">
                        {files.length === 0 ? (
                          <p className="rounded-lg bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--secondary)]">
                            No file attached to this report.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {files.map((f, i) => (
                              <div key={f.media_id || f.url || i} className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[color:var(--text)]">{f.name}</p>
                                  {f.size ? <p className="text-xs text-[color:var(--muted)]">{(f.size / 1024 / 1024).toFixed(2)} MB</p> : null}
                                </div>
                                <SubmissionFileLink file={f} />
                              </div>
                            ))}
                          </div>
                        )}
                        <SubmissionRemarks submissionId={r.id} onCountChange={loadReportDocs} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )
          })()}
        </div>
      )}

            {/* ══ Submissions > Assignments subtab ════════════════════════════════════ */}
      {tab === 'submissions' && subTab === 'assignments' && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total"    value={subStats.total}    accent="var(--accent)" />
            <StatCard label="Approved" value={subStats.approved} accent="#10b981" />
            <StatCard label="Pending"  value={subStats.pending}  accent="#f59e0b" />
            <StatCard label="Rejected" value={subStats.rejected} accent="#ef4444" />
          </div>

          {canUploadReport && (
            <div className="flex justify-end">
              <button className="btn-primary inline-flex items-center gap-2" onClick={() => setAssignmentUploadOpen(true)}>
                <UploadCloud size={15} /> Upload on behalf
              </button>
            </div>
          )}

          {isAdminView ? (
            assignments.length === 0 ? (
              <div className="card p-10 text-center">
                <FileText className="mx-auto text-[color:var(--muted)]" size={32} />
                <p className="mt-3 font-semibold text-[color:var(--text)]">No assignment submissions yet</p>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">Submissions will appear here once the student submits, or you upload one on their behalf.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((sub) => (
                  <button
                    key={sub.id}
                    className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 text-left transition hover:border-[color:var(--accent)] hover:shadow-sm"
                    onClick={() => openSub(sub)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold text-[color:var(--text)]">{sub.title}</p>
                        <p className="mt-1 text-xs text-[color:var(--secondary)]">
                          v{sub.version || 1} · {formatDate(sub.submitted_at)}
                        </p>
                      </div>
                      <StatusBadge status={sub.status} />
                    </div>
                    {sub.file_urls?.[0]?.name && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
                        <FileText size={11} /> {sub.file_urls[0].name}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )
          ) : myAssignments.length === 0 ? (
            <div className="card p-10 text-center">
              <FileText className="mx-auto text-[color:var(--muted)]" size={32} />
              <p className="mt-3 font-semibold text-[color:var(--text)]">No assignments yet</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">Assignments are defined per batch and semester. They will appear here once your coordinator assigns them.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myAssignments.map((a) => {
                const canSubmit = !a.my_submission_id || a.my_submission_status === 'needs_revision'
                const isOpen = openAssignmentId === a.id
                return (
                  <div key={a.id} className="card p-5">
                    <div className="safe-row items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-[color:var(--text)]">{a.title}</p>
                        <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
                          Semester {a.semester || 1}{a.is_mandatory === false ? ' · Optional' : ''}
                        </p>
                        {a.description && <p className="mt-1 text-xs text-[color:var(--secondary)]">{a.description}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {a.my_submission_status
                          ? <StatusBadge status={a.my_submission_status} />
                          : <StatusBadge status="not_started" />}
                        {canSubmit && (
                          <button
                            onClick={() => setOpenAssignmentId(isOpen ? null : a.id)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${isOpen ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--accent-tint)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white'}`}>
                            {a.my_submission_status === 'needs_revision' ? 'Resubmit' : 'Submit'}
                          </button>
                        )}
                        {a.my_submission_id && !canSubmit && (
                          <button
                            onClick={() => navigate(`/student/submissions/${a.my_submission_id}/preview`)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--border)]">
                            View
                          </button>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <AssignmentSubmitPanel
                        assignment={a}
                        onDone={() => { setOpenAssignmentId(null); loadMyAssignments() }}
                        addToast={addToast}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

            {/* ══ Submissions > Milestones subtab (powered by /api/targets) ════════════════ */}
      {tab === 'submissions' && subTab === 'milestones' && (
        <div className="space-y-5">
          {canUploadReport && (
            <div className="flex justify-end">
              <button className="btn-primary inline-flex items-center gap-2" onClick={() => setMilestoneUploadOpen(true)}>
                <UploadCloud size={15} /> Upload on behalf
              </button>
            </div>
          )}

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

          {/* Per-semester roll-up (derived from /api/targets/progress-summary). */}
          {progressSummary?.by_semester?.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">By semester</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {progressSummary.by_semester.map((s) => (
                  <div key={s.semester} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Semester {s.semester}</p>
                    <p className="mt-1 text-xl font-bold text-[color:var(--text)]">{s.percent}<span className="text-sm font-semibold text-[color:var(--secondary)]">%</span></p>
                    <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
                      {s.approved}/{s.total} approved{s.awaiting_review ? ' · ' + s.awaiting_review + ' awaiting review' : ''}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--border)]">
                      <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${s.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {targets.length === 0 ? (
            <div className="card p-10 text-center">
              <Clock className="mx-auto text-[color:var(--muted)]" size={32} />
              <p className="mt-3 font-semibold text-[color:var(--text)]">No milestones yet</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">
                Milestones are defined per batch and semester. They will appear here once your coordinator assigns them.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {targets.map((t) => {
                const state = targetState(t)
                const pct = t.my_submission_status === 'approved' ? 100 : t.my_submission_id ? 50 : 0
                const dueLabel = `Semester ${t.semester || 1}`
                // A scholar can (re)submit while there's nothing yet, or a
                // reviewer sent it back — never once it's in review/approved.
                const canSubmit = !isAdminView && ['not_started', 'needs_revision'].includes(state)
                const isOpen = openTargetId === t.id
                return (
                  <div key={t.id} className="card p-5">
                    <div className="safe-row items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-[color:var(--text)]">{t.name || t.module_name || `Milestone ${t.id}`}</p>
                        <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
                          {dueLabel}{t.batch_name ? ` · ${t.batch_name}` : ''}
                        </p>
                        {t.description && <p className="mt-1 text-xs text-[color:var(--secondary)]">{t.description}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={state} />
                        {canSubmit && (
                          <button
                            onClick={() => setOpenTargetId(isOpen ? null : t.id)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${isOpen ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--accent-tint)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white'}`}>
                            {state === 'needs_revision' ? 'Resubmit' : 'Submit'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--border)]">
                      <div
                        className={`h-full rounded-full ${state === 'approved' ? 'bg-emerald-500' : state === 'awaiting_review' || state === 'draft' ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--muted)]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-right text-xs font-semibold text-[color:var(--secondary)]">{pct}%</p>

                    {isOpen && (
                      <TargetSubmitPanel
                        target={t}
                        onDone={() => { setOpenTargetId(null); loadTargets() }}
                        addToast={addToast}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

            {/* ══ My Profile > Fees subtab (student only) ═════════════════════════════════ */}
      {tab === 'profile' && subTab === 'fees' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text)]">Fees</p>
              <p className="mt-0.5 text-sm text-[color:var(--secondary)]">
                Installments, receipts and pending payments. For the full payment flow visit
                <Link to="/student/fees" className="ml-1 font-semibold text-[color:var(--accent)] hover:underline">/student/fees</Link>.
              </p>
            </div>
          </div>

          {fees === null ? (
            <div className="card p-10 text-center">
              <DollarSign className="mx-auto text-[color:var(--muted)]" size={32} />
              <p className="mt-3 text-sm text-[color:var(--secondary)]">Loading fees…</p>
            </div>
          ) : fees.length === 0 ? (
            <div className="card p-10 text-center">
              <DollarSign className="mx-auto text-[color:var(--muted)]" size={32} />
              <p className="mt-3 font-semibold text-[color:var(--text)]">No fee records yet</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">Installments will appear here once finance records them.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fees.map((fee) => (
                <div key={fee.id} className="card p-5">
                  <div className="safe-row items-start">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text)]">{fee.fee_type}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--secondary)]">Due {formatDate(fee.due_date)} · Installment {fee.installment}</p>
                    </div>
                    <StatusBadge status={fee.status} />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-[color:var(--text)]">
                    ₹{(fee.amount / 100).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* ══ My Profile > Research Profile subtab ═══════════════════════════════════ */}
      {tab === 'profile' && subTab === 'research' && (
        <div className="space-y-5">
          {research ? (
            <>
              {/* Public banner */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    Research profile is {research.is_public ? <span className="text-emerald-600">public</span> : <span className="text-[color:var(--muted)]">private</span>}
                  </p>
                  {research.is_public && <p className="mt-0.5 text-xs text-[color:var(--secondary)]">Public URL: /p/{research.public_slug}</p>}
                </div>
                {research.is_public && (
                  <Link to={`/p/${research.public_slug}`} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]">
                    <ExternalLink size={14} /> View
                  </Link>
                )}
              </div>

              {/* Research sections */}
              {RESEARCH_SECTIONS.map(({ key, label, icon: Icon }) => (
                <div key={key} className="card p-6">
                  <div className="safe-row">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                        <Icon size={18} />
                      </span>
                      <h2 className="text-lg font-semibold text-[color:var(--text)]">
                        {label} <span className="text-sm font-normal text-[color:var(--secondary)]">({research[key]?.length || 0})</span>
                      </h2>
                    </div>
                    {canEditProfile && (
                      <button onClick={() => openAdd(key)}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--accent-tint)] text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white">
                        <Plus size={16} />
                      </button>
                    )}
                  </div>

                  {(research[key] || []).length === 0 ? (
                    <p className="mt-4 text-sm text-[color:var(--secondary)]">No {label.toLowerCase()} added yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {(research[key] || []).map((item) => (
                        <div key={item.id} className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[color:var(--text)]">{item.title || item.name}</p>
                            <p className="mt-1 text-xs text-[color:var(--secondary)]">
                              {[item.journal, item.organizer, item.publisher, item.country].filter(Boolean).join(' · ')}
                              {item.year ? ` · ${item.year}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {item.is_verified && <StatusBadge status="approved" />}
                            {canEditProfile && (
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
                  {canEditProfile && (
                    <button
                      onClick={() => { setTab('profile'); setSubTab('profile'); setAcademicEditing(true); setAcademicDraft({ research_areas: research?.research_areas?.join(', ') || '', skills: research?.skills?.join(', ') || '' }) }}
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
              <button type="button" className="h-11 flex-1 rounded-md bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={closeDrawer}>Cancel</button>
              <button type="button" className="btn-primary flex-1" disabled={drawer.saving} onClick={saveDrawer}>
                {drawer.saving ? 'Saving…' : drawer.item ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload progress report (admin / coordinator) ── */}
      {reportUploadOpen && (
        <UploadProgressReportDrawer
          studentUserId={studentId}
          onClose={() => setReportUploadOpen(false)}
          onUploaded={loadReportDocs}
        />
      )}

      {/* ── Upload assignment / milestone on behalf (admin / coordinator) ── */}
      {assignmentUploadOpen && (
        <OnBehalfSubmissionDrawer
          kind="assignment"
          studentUserId={studentId}
          onClose={() => setAssignmentUploadOpen(false)}
          onUploaded={loadAssignments}
        />
      )}
      {milestoneUploadOpen && (
        <OnBehalfSubmissionDrawer
          kind="target"
          studentUserId={studentId}
          onClose={() => setMilestoneUploadOpen(false)}
          onUploaded={loadTargets}
        />
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

// ── Current-semester progress-report window (student self-submit) ──────────────
// Two named slots (report + presentation), both required before Submit unlocks.
// Re-upload replaces a slot's file (server-side upsert). Editable while the
// tied submission is draft/needs_revision or doesn't exist yet; read-only once
// it's been sent for review.
// ── Assignment submission (student self-submit) ─────────────────────────────────
// Mirrors TargetSubmitPanel exactly, just against assignment_id instead of
// target_id — assignments are admin-defined per batch+semester the same way
// milestones are, so the submit flow is identical.
function AssignmentSubmitPanel({ assignment, onDone, addToast }) {
  const [note,       setNote]       = useState('')
  const [files,      setFiles]      = useState([])
  const [submitting, setSubmitting] = useState(false)

  const addFiles = (fileList) => setFiles((prev) => [...prev, ...Array.from(fileList)])
  const removeFile = (i) => setFiles((prev) => prev.filter((_, j) => j !== i))

  const submit = async () => {
    if (files.length === 0) {
      addToast({ type: 'error', title: 'Add at least one file.' })
      return
    }
    setSubmitting(true)
    try {
      const createdRes = await createSubmission({
        batch_id: assignment.batch_id,
        assignment_id: assignment.id,
        title: assignment.title,
        submission_type: 'assignment',
        semester: assignment.semester || 1,
        content: note.trim() || undefined,
      })
      const submissionId = createdRes.data?.id
      if (!submissionId) throw new Error('Could not create the submission')
      for (const file of files) {
        await uploadSubmissionAttachment(submissionId, file)
      }
      await submitForReview(submissionId)
      addToast({ type: 'success', title: `Submitted "${assignment.title}" for review.` })
      onDone()
    } catch (err) {
      addToast({ type: 'error', title: 'Submission failed', message: err.response?.data?.message || err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <label className="block">
        <span className="text-xs font-semibold text-[color:var(--secondary)]">Note (optional)</span>
        <textarea className="input mt-1 w-full resize-none text-sm" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the reviewer should know" />
      </label>

      <div className="mt-3">
        <span className="text-xs font-semibold text-[color:var(--secondary)]">Files</span>
        <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] px-4 py-6 text-center text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]">
          <UploadCloud size={16} /> Click to add files — multiple allowed
          <input type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        </label>
        {files.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-[color:var(--card)] px-3 py-2 text-xs">
                <span className="truncate text-[color:var(--text)]">{f.name} <span className="text-[color:var(--muted)]">({(f.size / 1024 / 1024).toFixed(2)} MB)</span></span>
                <button onClick={() => removeFile(i)} className="shrink-0 text-[color:var(--muted)] hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={submit} disabled={submitting} className="btn-primary mt-4 inline-flex items-center gap-2 text-xs disabled:opacity-50">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
        {submitting ? 'Submitting…' : 'Submit for Review'}
      </button>
    </div>
  )
}

// ── Milestone submission (student self-submit) ─────────────────────────────────
// Multiple files, added one batch at a time and listed with a remove option
// before submit — unlike the single-file assignment/progress-report forms,
// a target explicitly allows several supporting files per the spec.
function TargetSubmitPanel({ target, onDone, addToast }) {
  const [title,      setTitle]      = useState(target.name || target.module_name || '')
  const [note,       setNote]       = useState('')
  const [files,      setFiles]      = useState([])
  const [submitting, setSubmitting] = useState(false)

  const addFiles = (fileList) => setFiles((prev) => [...prev, ...Array.from(fileList)])
  const removeFile = (i) => setFiles((prev) => prev.filter((_, j) => j !== i))

  const submit = async () => {
    if (!title.trim() || files.length === 0) {
      addToast({ type: 'error', title: 'Add a title and at least one file.' })
      return
    }
    setSubmitting(true)
    try {
      const createdRes = await createSubmission({
        batch_id: target.batch_id,
        target_id: target.id,
        title: title.trim(),
        submission_type: 'target',
        semester: target.semester || 1,
        content: note.trim() || undefined,
      })
      const submissionId = createdRes.data?.id
      if (!submissionId) throw new Error('Could not create the submission')
      // Sequential, not parallel — the backend streams each file through our
      // own API to storage; keeping this simple and predictable to debug.
      for (const file of files) {
        await uploadSubmissionAttachment(submissionId, file)
      }
      await submitForReview(submissionId)
      addToast({ type: 'success', title: `Submitted "${title.trim()}" for review.` })
      onDone()
    } catch (err) {
      addToast({ type: 'error', title: 'Submission failed', message: err.response?.data?.message || err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <label className="block">
        <span className="text-xs font-semibold text-[color:var(--secondary)]">Title</span>
        <input className="input mt-1 h-9 w-full text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="text-xs font-semibold text-[color:var(--secondary)]">Note (optional)</span>
        <textarea className="input mt-1 w-full resize-none text-sm" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the reviewer should know" />
      </label>

      <div className="mt-3">
        <span className="text-xs font-semibold text-[color:var(--secondary)]">Files</span>
        <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] px-4 py-6 text-center text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]">
          <UploadCloud size={16} /> Click to add files — multiple allowed
          <input type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        </label>
        {files.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-[color:var(--card)] px-3 py-2 text-xs">
                <span className="truncate text-[color:var(--text)]">{f.name} <span className="text-[color:var(--muted)]">({(f.size / 1024 / 1024).toFixed(2)} MB)</span></span>
                <button onClick={() => removeFile(i)} className="shrink-0 text-[color:var(--muted)] hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={submit} disabled={submitting} className="btn-primary mt-4 inline-flex items-center gap-2 text-xs disabled:opacity-50">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
        {submitting ? 'Submitting…' : 'Submit for Review'}
      </button>
    </div>
  )
}

function ProgressCycleCard({ cycle, onChange, addToast }) {
  const [busySlot,   setBusySlot]   = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const editable = !cycle.submission_status || ['draft', 'needs_revision'].includes(cycle.submission_status)

  const handleFile = async (slot, file) => {
    setBusySlot(slot)
    try {
      let submissionId = cycle.submission_id
      if (!submissionId) {
        const created = await createSubmission({
          title: `Progress Report — Semester ${cycle.semester}`,
          submission_type: 'progress_report',
          cycle_id: cycle.id,
          semester: cycle.semester,
        })
        submissionId = created.data.id
      }
      await uploadSubmissionAttachment(submissionId, file, slot)
      addToast({ type: 'success', title: `${slot === 'report' ? 'Report' : 'Presentation'} uploaded.` })
      onChange()
    } catch (err) {
      addToast({ type: 'error', title: 'Upload failed', message: err.response?.data?.message })
    } finally {
      setBusySlot(null)
    }
  }

  const handleSubmit = async () => {
    if (!cycle.submission_id || !cycle.can_submit) return
    setSubmitting(true)
    try {
      await submitForReview(cycle.submission_id)
      addToast({ type: 'success', title: 'Progress report submitted for review.' })
      onChange()
    } catch (err) {
      addToast({ type: 'error', title: 'Submit failed', message: err.response?.data?.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card border-2 border-[color:var(--accent)] p-5">
      <div className="safe-row items-start">
        <div>
          <span className="inline-flex items-center rounded-full bg-[color:var(--accent-tint)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--accent)]">
            Current — Semester {cycle.semester}
          </span>
          <h3 className="mt-2 text-base font-semibold text-[color:var(--text)]">Progress Report {cycle.semester}</h3>
          {cycle.due_date && <p className="mt-1 text-xs text-[color:var(--secondary)]">Due {formatDate(cycle.due_date)}</p>}
        </div>
        <StatusBadge status={cycle.submission_status || 'not_started'} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {cycle.slots.map((s) => (
          <div key={s.slot} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">{s.label}</p>
            {s.file ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm text-[color:var(--text)]">{s.file.name}</span>
                <SubmissionFileLink file={s.file} label="View" />
              </div>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--muted)]">Not uploaded yet</p>
            )}
            {editable && (
              <label className={`mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] ${busySlot === s.slot ? 'opacity-60' : 'cursor-pointer hover:bg-[color:var(--accent)] hover:text-white'}`}>
                {busySlot === s.slot ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                {s.file ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept={Array.isArray(s.accepts) ? s.accepts.map((e) => `.${e}`).join(',') : undefined}
                  className="hidden"
                  disabled={busySlot === s.slot}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(s.slot, f) }}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      {editable && (
        <button
          onClick={handleSubmit}
          disabled={!cycle.can_submit || submitting}
          className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
          {cycle.can_submit ? 'Submit for Review' : 'Upload both files to submit'}
        </button>
      )}
    </div>
  )
}

function IR({ label, value }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
      <div className="mt-1.5 text-sm font-semibold text-[color:var(--text)]">{value ?? '—'}</div>
    </div>
  )
}

function QuickStat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-xs text-[color:var(--muted)] uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-bold text-[color:var(--text)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{sub}</p>}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 text-center">
      <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-[color:var(--secondary)]">{label}</p>
    </div>
  )
}

function GuideCard({ type, guide, canAssign, options = [], assigning, onStartAssign, onCancelAssign, onPick }) {
  return (
    <div className={`rounded-xl border p-4 ${guide ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]' : 'border-[color:var(--border)] bg-[color:var(--surface)]'}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">{type} Guide</p>
      {guide ? (
        <>
          <p className="mt-2 font-semibold text-[color:var(--text)]">{guide.first_name} {guide.last_name}</p>
          <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{guide.email}</p>
          {canAssign && (
            assigning ? (
              <div className="mt-2 space-y-2">
                <Select
                  value=""
                  onChange={(id) => onPick(id)}
                  options={options.map((g) => ({ value: g.id, label: `${g.first_name} ${g.last_name}` }))}
                  placeholder={options.length ? 'Reassign to…' : 'No eligible guides found'}
                  disabled={options.length === 0}
                />
                <button onClick={onCancelAssign} className="text-xs font-semibold text-[color:var(--secondary)] hover:text-[color:var(--text)]">Cancel</button>
              </div>
            ) : (
              <button onClick={onStartAssign} className="mt-2 text-xs font-semibold text-[color:var(--accent)] hover:underline">Reassign</button>
            )
          )}
        </>
      ) : canAssign ? (
        assigning ? (
          <div className="mt-2 space-y-2">
            <Select
              value=""
              onChange={(id) => onPick(id)}
              options={options.map((g) => ({ value: g.id, label: `${g.first_name} ${g.last_name}` }))}
              placeholder={options.length ? 'Choose a guide…' : 'No eligible guides found'}
              disabled={options.length === 0}
            />
            <button onClick={onCancelAssign} className="text-xs font-semibold text-[color:var(--secondary)] hover:text-[color:var(--text)]">Cancel</button>
          </div>
        ) : (
          <button onClick={onStartAssign} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white">
            Assign a {type.toLowerCase()} guide
          </button>
        )
      ) : (
        <p className="mt-2 text-sm text-[color:var(--secondary)]">Not assigned</p>
      )}
    </div>
  )
}
