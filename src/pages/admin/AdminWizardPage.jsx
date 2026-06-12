/**
 * Admin Wizard — the one-stop, admin-only setup console.
 * NOT bound to the header course: it has its own course selector and spans
 * every course, batch, team, workflow and notification configuration.
 *
 * Tabs:
 *   Org Chart      — visual course → batch → team hierarchy
 *   Team           — assign coordinators / guides per batch (embedded)
 *   Workflows      — per-batch approval chain editor
 *   Notifications  — per-course email sender + event rules (email only)
 *   Courses        — full course management (embedded)
 */
import {
  ArrowDown, ArrowUp, Bell, CheckCircle2, ClipboardCheck, Clock, GitBranch, GraduationCap,
  KeyRound, Layers, Loader2, Mail, MailCheck, Network, Plus, RefreshCw, Save, Shield, Trash2, Users, Wand2, XCircle, Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCourses, getCourseById, updateCourse } from '../../api/services/courseService.js'
import { getBatches, updateApprovalConfig } from '../../api/services/batchService.js'
import { getAssignments } from '../../api/services/rolesService.js'
import { getStudents } from '../../api/services/studentService.js'
import { bulkSendCredentials } from '../../api/services/userService.js'
import { getNotificationQueue, runNotificationScans } from '../../api/services/notificationService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import TeamAssignmentsPage from './TeamAssignmentsPage.jsx'
import CoursesPage from './CoursesPage.jsx'
import { useLabels } from '../../store/labelStore.js'
import { useUiStore } from '../../store/uiStore.js'

const TABS = [
  { key: 'org',           label: 'Org Chart',     icon: Network },
  { key: 'team',          label: 'Team',          icon: Users },
  { key: 'workflows',     label: 'Workflows',     icon: GitBranch },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'credentials',   label: 'Credentials',   icon: KeyRound },
  { key: 'courses',       label: 'Courses',       icon: GraduationCap },
]

export default function AdminWizardPage() {
  const [courses, setCourses] = useState(null)
  const [courseId, setCourseId] = useState('')
  const [tab, setTab] = useState('org')

  const loadCourses = () => {
    getCourses().then((r) => {
      const list = r.data || []
      setCourses(list)
      setCourseId((cur) => cur && list.some((c) => c.id === cur) ? cur : (list[0]?.id || ''))
    })
  }
  useEffect(() => { loadCourses() }, [])

  if (!courses) return <SkeletonCard rows={6} />
  const course = courses.find((c) => c.id === courseId) || null

  return (
    <div className="fade-page">
      <PageHeader
        title="Admin Wizard"
        subtitle="Set up everything in one place — teams, workflows, notifications and courses, across all programs."
      />

      {/* ── Course selector (independent of the app header) ── */}
      {tab !== 'courses' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
            <Wand2 size={12} /> Course
          </span>
          {courses.map((c) => (
            <button key={c.id} onClick={() => setCourseId(c.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${courseId === c.id ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--surface)] text-[color:var(--secondary)] hover:text-[color:var(--text)]'}`}>
              {c.code}
            </button>
          ))}
          {courses.length === 0 && <span className="text-xs text-[color:var(--secondary)]">No courses yet — create one in the Courses tab.</span>}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1 w-fit max-w-full">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold transition ${tab === t.key ? 'bg-[color:var(--card)] text-[color:var(--text)] shadow-sm' : 'text-[color:var(--secondary)] hover:text-[color:var(--text)]'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'org' && (course ? <OrgChartTab course={course} /> : <NoCourse />)}
      {tab === 'team' && (course ? <TeamAssignmentsPage courseOverride={course} embedded /> : <NoCourse />)}
      {tab === 'workflows' && (course ? <WorkflowsTab course={course} /> : <NoCourse />)}
      {tab === 'notifications' && (course ? <NotificationsTab course={course} key={course.id} /> : <NoCourse />)}
      {tab === 'credentials' && (course ? <CredentialsTab course={course} key={`cred-${course.id}`} /> : <NoCourse />)}
      {tab === 'courses' && <CoursesPage embedded />}
    </div>
  )
}

function NoCourse() {
  return <div className="card p-12 text-center text-sm text-[color:var(--secondary)]">Create a course first in the Courses tab.</div>
}

// ════════════════════════════════════════════════════════════════════════════════
// Org Chart — course → batches → team, visual hierarchy
// ════════════════════════════════════════════════════════════════════════════════
const ROLE_TONES = {
  coordinator: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  academic_guide: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  industry_mentor: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-red-50 text-red-600 border-red-200',
}

function OrgChartTab({ course }) {
  const labels = useLabels()
  const [assignments, setAssignments] = useState(null)
  const [batches, setBatches] = useState([])

  useEffect(() => {
    setAssignments(null)
    Promise.all([
      getAssignments(course.id),
      getBatches({ course_id: course.id }),
    ]).then(([a, b]) => {
      setAssignments(a.data || [])
      setBatches(b.data || [])
    })
  }, [course.id])

  if (!assignments) return <SkeletonCard rows={5} />

  const courseLevel = assignments.filter((x) => !x.batch_id)
  const byBatch = (id) => assignments.filter((x) => x.batch_id === id)

  return (
    <div className="card overflow-x-auto p-8">
      <div className="flex min-w-fit flex-col items-center">
        {/* Course node */}
        <div className="rounded-2xl border-2 border-[color:var(--accent)] bg-[color:var(--accent-tint)] px-6 py-3 text-center shadow-sm">
          <p className="text-sm font-bold text-[color:var(--accent)]">{course.name}</p>
          <p className="text-[10px] font-semibold text-[color:var(--secondary)]">{course.code} · {batches.length} batch{batches.length === 1 ? '' : 'es'}</p>
        </div>

        {/* Course-level staff lane */}
        {courseLevel.length > 0 && (
          <>
            <div className="h-5 w-px bg-[color:var(--border)]" />
            <div className="flex flex-wrap justify-center gap-2">
              {courseLevel.map((a) => <PersonNode key={a.id} a={a} />)}
            </div>
          </>
        )}

        {batches.length > 0 && (
          <>
            <div className="h-6 w-px bg-[color:var(--border)]" />
            {/* Horizontal connector */}
            <div className="relative flex items-start gap-6">
              {batches.length > 1 && (
                <div className="absolute left-[12%] right-[12%] top-0 h-px bg-[color:var(--border)]" />
              )}
              {batches.map((b) => {
                const team = byBatch(b.id)
                return (
                  <div key={b.id} className="flex w-56 flex-col items-center pt-0">
                    <div className="h-5 w-px bg-[color:var(--border)]" />
                    {/* Batch node */}
                    <div className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-center shadow-sm">
                      <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--text)]">
                        <Layers size={12} className="text-[color:var(--secondary)]" /> {b.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[color:var(--secondary)]">
                        {b.code} · <span className="capitalize">{b.status}</span>
                      </p>
                    </div>
                    <div className="h-4 w-px bg-[color:var(--border)]" />
                    {/* Team under the batch */}
                    <div className="flex w-full flex-col gap-1.5">
                      {team.length === 0 && (
                        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-2 py-1.5 text-center text-[10px] font-semibold text-amber-700">
                          No team assigned
                        </p>
                      )}
                      {team.map((a) => <PersonNode key={a.id} a={a} full />)}
                      <p className="mt-1 text-center text-[10px] font-semibold text-[color:var(--muted)]">
                        {b.enrolled_count ?? ''} {labels.studentPlural}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        {batches.length === 0 && (
          <p className="mt-6 text-sm text-[color:var(--secondary)]">No batches in this course yet.</p>
        )}
      </div>
    </div>
  )
}

function PersonNode({ a, full = false }) {
  return (
    <div className={`rounded-xl border px-3 py-1.5 text-center ${ROLE_TONES[a.role_name] || 'border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--secondary)]'} ${full ? 'w-full' : ''}`}>
      <p className="truncate text-[11px] font-bold">{a.first_name} {a.last_name}</p>
      <p className="truncate text-[9.5px] font-semibold opacity-75">{a.role_display}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// Workflows — per-batch approval chain editor
// ════════════════════════════════════════════════════════════════════════════════
const STAGE_PRESETS = [
  { name: 'coordinator',     label: 'Coordinator',     type: 'role', role: 'coordinator' },
  { name: 'academic_guide',  label: 'Academic Guide',  type: 'student_guide', guide_type: 'academic' },
  { name: 'industry_mentor', label: 'Industry Mentor', type: 'student_guide', guide_type: 'industry' },
]

function WorkflowsTab({ course }) {
  const addToast = useUiStore((s) => s.addToast)
  const [batches, setBatches] = useState(null)
  const [edits, setEdits] = useState({})   // batchId -> stages[]
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    setBatches(null)
    setEdits({})
    getBatches({ course_id: course.id }).then((r) => setBatches(r.data || []))
  }, [course.id])

  if (!batches) return <SkeletonCard rows={4} />
  if (batches.length === 0) return <div className="card p-10 text-center text-sm text-[color:var(--secondary)]">No batches in this course yet.</div>

  const stagesOf = (b) => edits[b.id] ?? (b.approval_config?.stages || [])
  const setStages = (b, stages) => setEdits((p) => ({ ...p, [b.id]: stages }))

  const save = async (b) => {
    setSavingId(b.id)
    try {
      const ordered = stagesOf(b).map((s, i) => ({ ...s, order_index: i + 1 }))
      await updateApprovalConfig(b.id, ordered)
      addToast({ type: 'success', title: `Workflow saved for ${b.name}.` })
      setBatches((xs) => xs.map((x) => x.id === b.id ? { ...x, approval_config: { stages: ordered } } : x))
      setEdits((p) => { const n = { ...p }; delete n[b.id]; return n })
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message })
    } finally { setSavingId(null) }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {batches.map((b) => {
        const stages = stagesOf(b)
        const dirty = edits[b.id] !== undefined
        return (
          <div key={b.id} className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--surface)] text-[color:var(--secondary)]"><ClipboardCheck size={16} /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[color:var(--text)]">{b.name}</p>
                  <p className="text-[11px] text-[color:var(--secondary)]">
                    {stages.length === 0 ? 'Default 3-layer chain (Coordinator → Academic Guide → Industry Mentor)' : `${stages.length}-stage custom workflow`}
                  </p>
                </div>
              </div>
              {dirty && (
                <button className="btn-primary inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs" disabled={savingId === b.id} onClick={() => save(b)}>
                  {savingId === b.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                </button>
              )}
            </div>

            {/* Stage chain */}
            <div className="mt-4 space-y-2">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[10px] font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold capitalize text-[color:var(--text)]">{(s.label || s.name || '').replaceAll('_', ' ')}</p>
                    <p className="text-[10px] text-[color:var(--muted)]">{s.type === 'student_guide' ? `Scholar's assigned ${s.guide_type} guide` : s.type === 'role' ? `Anyone with the ${s.role} role` : 'Specific user'}</p>
                  </div>
                  <button disabled={i === 0} onClick={() => { const n = [...stages]; [n[i-1], n[i]] = [n[i], n[i-1]]; setStages(b, n) }}
                    className="grid h-6 w-6 place-items-center rounded-full text-[color:var(--muted)] hover:bg-[color:var(--card)] disabled:opacity-30"><ArrowUp size={12} /></button>
                  <button disabled={i === stages.length - 1} onClick={() => { const n = [...stages]; [n[i+1], n[i]] = [n[i], n[i+1]]; setStages(b, n) }}
                    className="grid h-6 w-6 place-items-center rounded-full text-[color:var(--muted)] hover:bg-[color:var(--card)] disabled:opacity-30"><ArrowDown size={12} /></button>
                  <button onClick={() => setStages(b, stages.filter((_, j) => j !== i))}
                    className="grid h-6 w-6 place-items-center rounded-full text-[color:var(--muted)] hover:bg-red-50 hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              ))}
              {stages.length === 0 && (
                <p className="rounded-xl bg-[color:var(--surface)] px-3 py-2.5 text-[11px] text-[color:var(--secondary)]">
                  Using the built-in default. Add stages below to customise this batch.
                </p>
              )}
            </div>

            {/* Add stage */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STAGE_PRESETS.map((p) => (
                <button key={p.name}
                  onClick={() => setStages(b, [...stages, { ...p }])}
                  className="inline-flex items-center gap-1 rounded-xl border border-dashed border-[color:var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]">
                  <Plus size={11} /> {p.label}
                </button>
              ))}
              <button
                onClick={() => {
                  const role = prompt('Custom role name (e.g. dean):')
                  if (role?.trim()) setStages(b, [...stages, { name: role.trim(), label: role.trim(), type: 'role', role: role.trim() }])
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-dashed border-[color:var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]">
                <Shield size={11} /> Custom role…
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// Notifications — per-course sender + event rules (email only)
// ════════════════════════════════════════════════════════════════════════════════
const STAFF_RECEIVERS = [
  { value: 'coordinator',     label: 'Coordinators' },
  { value: 'admin',           label: 'Admins' },
  { value: 'academic_guide',  label: 'Academic Guides' },
  { value: 'industry_mentor', label: 'Industry Mentors' },
]

const NOTIFICATION_EVENTS = [
  { key: 'application_submitted',     label: 'Application Received',  desc: 'Confirmation when someone applies',              kind: 'instant',
    receiverOptions: [{ value: 'applicant', label: 'Applicant' }, ...STAFF_RECEIVERS], defaultReceivers: ['applicant'] },
  { key: 'test_completed',            label: 'Test Completed',        desc: 'When a candidate submits the entrance test',     kind: 'instant',
    receiverOptions: [{ value: 'candidate', label: 'Candidate' }, ...STAFF_RECEIVERS], defaultReceivers: ['coordinator', 'admin'] },
  { key: 'approval_stage_opened',     label: 'Approval Stage Opened', desc: 'A reviewer has a new submission to approve',     kind: 'instant', fixedReceiver: 'The reviewer of the opened stage' },
  { key: 'submission_approved',       label: 'Submission Approved',   desc: 'Final approval granted on a submission',         kind: 'instant', fixedReceiver: 'The scholar who submitted' },
  { key: 'submission_needs_revision', label: 'Needs Revision',        desc: 'A reviewer requested changes',                   kind: 'instant', fixedReceiver: 'The scholar who submitted' },
  { key: 'deadline_overdue',          label: 'Deadline Overdue',      desc: 'A due date has passed without a submission',     kind: 'scheduled', fixedReceiver: 'Each scholar with the overdue item' },
  { key: 'fee_due',                   label: 'Fee Due Reminder',      desc: 'A semester fee payment is due',                  kind: 'scheduled', fixedReceiver: 'Each scholar with a pending fee' },
]

const QUEUE_STATUS_STYLE = {
  sent:    'bg-emerald-500/10 text-emerald-600',
  pending: 'bg-amber-500/10  text-amber-600',
  sending: 'bg-sky-500/10    text-sky-600',
  failed:  'bg-rose-500/10   text-rose-600',
  skipped: 'bg-zinc-500/10   text-zinc-500',
}

function NumField({ label, value, onChange, min = 0, max = 999, suffix }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-[color:var(--secondary)]">
      <span className="font-semibold">{label}</span>
      <input
        type="number" min={min} max={max}
        className="input h-7 w-16 px-2 py-0 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  )
}

function NotificationsTab({ course }) {
  const addToast = useUiStore((s) => s.addToast)
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [running, setRunning] = useState(false)
  const [queue, setQueue] = useState(null)
  const [loadingQueue, setLoadingQueue] = useState(false)

  const loadQueue = () => {
    setLoadingQueue(true)
    getNotificationQueue(course.id)
      .then((r) => setQueue(r.data || []))
      .catch(() => setQueue([]))
      .finally(() => setLoadingQueue(false))
  }

  useEffect(() => {
    getCourseById(course.id).then((r) => {
      const email = r.data?.preferences?.email || {}
      setPrefs({
        senderName: email.senderName || '',
        senderEmail: email.senderEmail || '',
        notificationRules: email.notificationRules || {},
        _allPrefs: r.data?.preferences || {},
      })
    })
    loadQueue()
  }, [course.id])

  if (!prefs) return <SkeletonCard rows={4} />

  const ruleOf = (key) => prefs.notificationRules?.[key] || {}
  const ruleOn = (key) => ruleOf(key).email !== false
  const setRule = (key, patch) => {
    setPrefs((p) => ({
      ...p,
      notificationRules: { ...p.notificationRules, [key]: { ...(p.notificationRules?.[key] || {}), ...patch } },
    }))
    setDirty(true)
  }
  const toggleRule = (key) => setRule(key, { email: !ruleOn(key) })

  const save = async () => {
    setSaving(true)
    try {
      const preferences = {
        ...prefs._allPrefs,
        email: {
          ...(prefs._allPrefs.email || {}),
          senderName: prefs.senderName.trim(),
          senderEmail: prefs.senderEmail.trim(),
          notificationRules: prefs.notificationRules,
        },
      }
      await updateCourse(course.id, { preferences })
      addToast({ type: 'success', title: `Notification settings saved for ${course.code}.` })
      setDirty(false)
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message })
    } finally { setSaving(false) }
  }

  const runNow = async () => {
    setRunning(true)
    try {
      const r = await runNotificationScans(course.id)
      const d = r.data || {}
      addToast({
        type: 'success',
        title: 'Checks executed',
        message: `${d.fee_due ?? 0} fee reminder(s) + ${d.deadline_overdue ?? 0} overdue alert(s) queued · ${d.delivered_now ?? 0} delivered`,
      })
      loadQueue()
    } catch (err) {
      addToast({ type: 'error', title: 'Run failed', message: err.response?.data?.message })
    } finally { setRunning(false) }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
        {/* Sender */}
        <div className="card h-fit p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><Mail size={16} /></span>
            <div>
              <p className="text-sm font-semibold text-[color:var(--text)]">Email Sender</p>
              <p className="text-[11px] text-[color:var(--secondary)]">All {course.code} emails go out from this verified Brevo sender</p>
            </div>
          </div>
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-[color:var(--secondary)]">Sender Name</span>
            <input className="input mt-1 w-full" placeholder="DY Patil POSTDOC Program"
              value={prefs.senderName} onChange={(e) => { setPrefs((p) => ({ ...p, senderName: e.target.value })); setDirty(true) }} />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-semibold text-[color:var(--secondary)]">Sender Email</span>
            <input className="input mt-1 w-full" type="email" placeholder="postdoc@dyperf.com"
              value={prefs.senderEmail} onChange={(e) => { setPrefs((p) => ({ ...p, senderEmail: e.target.value })); setDirty(true) }} />
          </label>
          <p className="mt-2 text-[10px] text-[color:var(--muted)]">Leave blank to use the global sender from Settings. Must be verified in Brevo.</p>

          <div className="mt-4 rounded-xl bg-[color:var(--surface)] p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--text)]"><Clock size={12} /> How scheduled events run</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--secondary)]">
              <strong>Instant</strong> events fire when the action happens (plus the optional delay).
              <strong> Scheduled</strong> events (fee due, overdue) are scanned once a day at the hour you set (IST)
              and repeat only every N days per person — duplicates are suppressed automatically.
            </p>
          </div>
        </div>

        {/* Event rules + config */}
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text)]">Email Notification Rules</p>
              <p className="text-[11px] text-[color:var(--secondary)]">Which automated emails this course sends — and when</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                disabled={running} onClick={runNow} title="Run the fee-due / overdue scans immediately">
                {running ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />} Run checks now
              </button>
              {dirty && (
                <button className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" disabled={saving} onClick={save}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 divide-y divide-[color:var(--border)]">
            {NOTIFICATION_EVENTS.map((ev) => {
              const on = ruleOn(ev.key)
              const r = ruleOf(ev.key)
              return (
                <div key={ev.key} className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                        {ev.label}
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${ev.kind === 'instant' ? 'bg-sky-500/10 text-sky-600' : 'bg-violet-500/10 text-violet-600'}`}>
                          {ev.kind}
                        </span>
                      </p>
                      <p className="text-[11px] text-[color:var(--secondary)]">{ev.desc}</p>
                    </div>
                    <button type="button" onClick={() => toggleRule(ev.key)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* Receivers */}
                  {on && ev.receiverOptions && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-[color:var(--surface)] px-3 py-2">
                      <span className="mr-1 text-[11px] font-semibold text-[color:var(--secondary)]">Send to:</span>
                      {ev.receiverOptions.map((opt) => {
                        const current = Array.isArray(r.recipients) ? r.recipients : ev.defaultReceivers
                        const active = current.includes(opt.value)
                        return (
                          <button key={opt.value} type="button"
                            onClick={() => {
                              const next = active ? current.filter((x) => x !== opt.value) : [...current, opt.value]
                              setRule(ev.key, { recipients: next })
                            }}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${active
                              ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)] text-[color:var(--accent)]'
                              : 'border-[color:var(--border)] text-[color:var(--secondary)] hover:border-[color:var(--accent)]'}`}>
                            {active ? '✓ ' : ''}{opt.label}
                          </button>
                        )
                      })}
                      {Array.isArray(r.recipients) && r.recipients.length === 0 && (
                        <span className="text-[11px] font-semibold text-amber-600">No receivers selected — nothing will be sent</span>
                      )}
                    </div>
                  )}
                  {on && ev.fixedReceiver && (
                    <div className="mt-2 rounded-xl bg-[color:var(--surface)] px-3 py-2 text-[11px] text-[color:var(--secondary)]">
                      <span className="font-semibold">Send to:</span> {ev.fixedReceiver} <span className="text-[color:var(--muted)]">(determined automatically)</span>
                    </div>
                  )}

                  {/* Per-event run config */}
                  {on && ev.kind === 'instant' && (
                    <div className="mt-2 flex flex-wrap items-center gap-4 rounded-xl bg-[color:var(--surface)] px-3 py-2">
                      <NumField label="Delay" suffix="min (0 = instant)" min={0} max={1440}
                        value={r.delayMinutes ?? 0} onChange={(v) => setRule(ev.key, { delayMinutes: v })} />
                    </div>
                  )}
                  {on && ev.key === 'deadline_overdue' && (
                    <div className="mt-2 flex flex-wrap items-center gap-4 rounded-xl bg-[color:var(--surface)] px-3 py-2">
                      <NumField label="Daily at" suffix="hrs IST" min={0} max={23}
                        value={r.hourIST ?? 8} onChange={(v) => setRule(ev.key, { hourIST: v })} />
                      <NumField label="Repeat every" suffix="day(s)" min={1} max={30}
                        value={r.repeatEveryDays ?? 2} onChange={(v) => setRule(ev.key, { repeatEveryDays: v })} />
                    </div>
                  )}
                  {on && ev.key === 'fee_due' && (
                    <div className="mt-2 flex flex-wrap items-center gap-4 rounded-xl bg-[color:var(--surface)] px-3 py-2">
                      <NumField label="Remind" suffix="day(s) before due" min={0} max={60}
                        value={r.daysBefore ?? 7} onChange={(v) => setRule(ev.key, { daysBefore: v })} />
                      <NumField label="Daily at" suffix="hrs IST" min={0} max={23}
                        value={r.hourIST ?? 8} onChange={(v) => setRule(ev.key, { hourIST: v })} />
                      <NumField label="Repeat every" suffix="day(s)" min={1} max={30}
                        value={r.repeatEveryDays ?? 3} onChange={(v) => setRule(ev.key, { repeatEveryDays: v })} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Automation log */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text)]">Automation Log</p>
            <p className="text-[11px] text-[color:var(--secondary)]">The last 50 automated emails for {course.code} — sent, queued, or failed</p>
          </div>
          <button onClick={loadQueue} disabled={loadingQueue}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]">
            <RefreshCw size={13} className={loadingQueue ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {queue === null ? (
          <div className="mt-4"><SkeletonCard rows={3} /></div>
        ) : queue.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[color:var(--surface)] p-4 text-center text-xs text-[color:var(--secondary)]">
            No automated emails yet. They will appear here as applications, tests, approvals and reminders fire.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">Recipient</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Scheduled / Sent</th>
                  <th className="py-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {queue.map((q) => {
                  const ev = NOTIFICATION_EVENTS.find((e) => e.key === q.event_key)
                  return (
                    <tr key={q.id}>
                      <td className="py-2 pr-3 font-semibold text-[color:var(--text)]">{ev?.label || q.event_key}</td>
                      <td className="py-2 pr-3 text-[color:var(--secondary)]">{q.recipient?.email || '—'}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${QUEUE_STATUS_STYLE[q.status] || 'bg-zinc-500/10 text-zinc-500'}`}>
                          {q.status}
                        </span>
                        {q.attempts > 1 && <span className="ml-1 text-[10px] text-[color:var(--muted)]">x{q.attempts}</span>}
                      </td>
                      <td className="py-2 pr-3 text-[color:var(--secondary)]">
                        {new Date(q.sent_at || q.run_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="max-w-[260px] truncate py-2 text-[11px] text-rose-500" title={q.error || ''}>{q.error || ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


// ════════════════════════════════════════════════════════════════════════════════
// Credentials — bulk send login credentials to scholars or staff
// ════════════════════════════════════════════════════════════════════════════════
function CredentialsTab({ course }) {
  const addToast = useUiStore((s) => s.addToast)
  const labels = useLabels()
  const [audience, setAudience] = useState('batch')   // 'batch' | 'course' | 'staff'
  const [batches, setBatches] = useState([])
  const [batchId, setBatchId] = useState('')
  const [recipients, setRecipients] = useState(null)  // [{ user_id, name, email, sub }]
  const [selected, setSelected] = useState(new Set())
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null)

  useEffect(() => {
    getBatches({ course_id: course.id }).then((r) => {
      const list = r.data || []
      setBatches(list)
      setBatchId(list[0]?.id || '')
    })
  }, [course.id])

  // Resolve the recipient list whenever the audience changes
  useEffect(() => {
    setRecipients(null)
    setResults(null)
    setSelected(new Set())
    const loadScholars = async (params) => {
      const r = await getStudents({ ...params, limit: 100 })
      return (r.data || []).map((s) => ({
        user_id: s.user_id,
        name: `${s.first_name} ${s.last_name || ''}`.trim(),
        email: s.email,
        sub: s.batch_name || s.batch_code || '',
      }))
    }
    const run = async () => {
      try {
        let list = []
        if (audience === 'batch') {
          if (!batchId) { setRecipients([]); return }
          list = await loadScholars({ batch_id: batchId, course_id: course.id })
        } else if (audience === 'course') {
          list = await loadScholars({ course_id: course.id })
        } else {
          const r = await getAssignments(course.id)
          const seen = new Set()
          list = (r.data || []).filter((a) => {
            if (seen.has(a.user_id)) return false
            seen.add(a.user_id)
            return true
          }).map((a) => ({
            user_id: a.user_id,
            name: `${a.first_name} ${a.last_name || ''}`.trim(),
            email: a.email,
            sub: a.role_display + (a.batch_name ? ` · ${a.batch_name}` : ''),
          }))
        }
        setRecipients(list)
        setSelected(new Set(list.map((x) => x.user_id)))
      } catch {
        setRecipients([])
      }
    }
    run()
  }, [audience, batchId, course.id])

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const send = async () => {
    if (!selected.size) return
    if (!confirm(`Send fresh login credentials to ${selected.size} recipient(s)? This replaces their current passwords.`)) return
    setSending(true)
    try {
      const r = await bulkSendCredentials([...selected])
      setResults(r.data)
      addToast({ type: 'success', title: r.message || `Credentials sent to ${r.data?.emails_sent}/${r.data?.total}.` })
    } catch (err) {
      addToast({ type: 'error', title: 'Bulk send failed', message: err.response?.data?.message })
    } finally { setSending(false) }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]"><KeyRound size={16} /></span>
          <div>
            <p className="text-sm font-semibold text-[color:var(--text)]">Bulk Send Login Credentials</p>
            <p className="text-[11px] text-[color:var(--secondary)]">Generates a fresh password for each recipient and emails it from {course.code}'s sender</p>
          </div>
        </div>
        <button className="btn-primary inline-flex items-center gap-2 text-sm" disabled={!selected.size || sending} onClick={send}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          Send to {selected.size} recipient{selected.size === 1 ? '' : 's'}
        </button>
      </div>

      {/* Audience */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          ['batch', `${labels.studentPlural} in a batch`],
          ['course', `All ${labels.studentPlural.toLowerCase()} in ${course.code}`],
          ['staff', 'Staff (coordinators & guides)'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setAudience(key)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${audience === key ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--secondary)]'}`}>
            {label}
          </button>
        ))}
        {audience === 'batch' && (
          <select className="input h-9 w-52 text-sm" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
        ⚠ Sending replaces each recipient's current password — anyone logged in keeps their session, but the old password stops working.
      </p>

      {/* Recipients */}
      {!recipients ? (
        <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-[color:var(--accent)]" /></div>
      ) : recipients.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--secondary)]">No recipients found for this audience.</p>
      ) : (
        <div className="mt-3 max-h-80 divide-y divide-[color:var(--border)] overflow-y-auto rounded-2xl border border-[color:var(--border)]">
          {recipients.map((p) => {
            const res = results?.results?.find((x) => x.user_id === p.user_id)
            return (
              <label key={p.user_id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-[color:var(--surface)]">
                <input type="checkbox" className="h-4 w-4 accent-[color:var(--accent)]"
                  checked={selected.has(p.user_id)} onChange={() => toggle(p.user_id)} disabled={!!results} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[color:var(--text)]">{p.name}</span>
                  <span className="block truncate text-[11px] text-[color:var(--secondary)]">{p.email}{p.sub ? ` · ${p.sub}` : ''}</span>
                </span>
                {res && (
                  res.email_sent
                    ? <MailCheck size={15} className="shrink-0 text-emerald-500" title="Credentials emailed" />
                    : <XCircle size={15} className="shrink-0 text-red-400" title={res.email_error || 'Email failed'} />
                )}
              </label>
            )
          })}
        </div>
      )}

      {results && (
        <p className="mt-3 text-xs font-semibold text-[color:var(--secondary)]">
          Done: {results.emails_sent}/{results.total} credentials emailed.
          {results.emails_sent < results.total && ' Hover the red icons for the failure reason.'}
        </p>
      )}
    </div>
  )
}
