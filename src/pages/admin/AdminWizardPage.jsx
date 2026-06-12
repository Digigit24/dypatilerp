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
  ArrowDown, ArrowUp, Bell, CheckCircle2, ClipboardCheck, GitBranch, GraduationCap,
  Layers, Loader2, Mail, Network, Plus, Save, Shield, Trash2, Users, Wand2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCourses, getCourseById, updateCourse } from '../../api/services/courseService.js'
import { getBatches, updateApprovalConfig } from '../../api/services/batchService.js'
import { getAssignments } from '../../api/services/rolesService.js'
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
const NOTIFICATION_EVENTS = [
  { key: 'application_submitted',     label: 'Application Received',  desc: 'Confirmation when someone applies' },
  { key: 'test_completed',            label: 'Test Completed',        desc: 'When a candidate submits the entrance test' },
  { key: 'approval_stage_opened',     label: 'Approval Stage Opened', desc: 'A reviewer has a new submission to approve' },
  { key: 'submission_approved',       label: 'Submission Approved',   desc: 'Final approval granted on a submission' },
  { key: 'submission_needs_revision', label: 'Needs Revision',        desc: 'A reviewer requested changes' },
  { key: 'deadline_overdue',          label: 'Deadline Overdue',      desc: 'A due date has passed without a submission' },
  { key: 'fee_due',                   label: 'Fee Due Reminder',      desc: 'A semester fee payment is due' },
]

function NotificationsTab({ course }) {
  const addToast = useUiStore((s) => s.addToast)
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

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
  }, [course.id])

  if (!prefs) return <SkeletonCard rows={4} />

  const ruleOn = (key) => prefs.notificationRules?.[key]?.email !== false
  const toggleRule = (key) => {
    setPrefs((p) => ({
      ...p,
      notificationRules: { ...p.notificationRules, [key]: { email: !ruleOn(key) } },
    }))
    setDirty(true)
  }

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

  return (
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
      </div>

      {/* Event rules */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text)]">Email Notification Rules</p>
            <p className="text-[11px] text-[color:var(--secondary)]">Which automated emails this course sends</p>
          </div>
          {dirty && (
            <button className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" disabled={saving} onClick={save}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save
            </button>
          )}
        </div>
        <div className="mt-4 divide-y divide-[color:var(--border)]">
          {NOTIFICATION_EVENTS.map((ev) => (
            <div key={ev.key} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[color:var(--text)]">{ev.label}</p>
                <p className="text-[11px] text-[color:var(--secondary)]">{ev.desc}</p>
              </div>
              <button type="button" onClick={() => toggleRule(ev.key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${ruleOn(ev.key) ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${ruleOn(ev.key) ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
