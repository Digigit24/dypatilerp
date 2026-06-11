import {
  AlertTriangle, CheckCircle2, ClipboardCheck, FileText,
  GraduationCap, Loader2, Mail, MessageSquare, RotateCcw, Save,
  Send, Settings2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getBatches } from '../../api/services/batchService.js'
import { getCourseById, updateCourse } from '../../api/services/courseService.js'
import { sendNotification } from '../../api/services/notificationService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'

// ─── Static metadata ──────────────────────────────────────────────────────────

const EVENT_RULES = [
  {
    key: 'application_submitted',
    icon: FileText,
    label: 'Application Submitted',
    description: 'Confirmation sent when a student successfully submits their application form.',
    to: [{ label: 'Student', color: 'accent' }, { label: 'Coordinator', color: 'purple' }],
  },
  {
    key: 'test_completed',
    icon: GraduationCap,
    label: 'Test Completed',
    description: 'Sent to the student once they finish the admission aptitude test.',
    to: [{ label: 'Student', color: 'accent' }],
  },
  {
    key: 'approval_stage_opened',
    icon: ClipboardCheck,
    label: 'Approval Stage Opened',
    description: 'Sent when a new approval stage is created and assigned to a reviewer.',
    to: [{ label: 'Student', color: 'accent' }, { label: 'Approver', color: 'purple' }],
  },
  {
    key: 'submission_approved',
    icon: CheckCircle2,
    label: 'Submission Approved',
    description: 'Sent to the student when an approver marks their submission as approved.',
    to: [{ label: 'Student', color: 'accent' }],
  },
  {
    key: 'submission_needs_revision',
    icon: RotateCcw,
    label: 'Revision Requested',
    description: 'Sent to the student when their submission is returned for changes.',
    to: [{ label: 'Student', color: 'accent' }],
  },
  {
    key: 'deadline_overdue',
    icon: AlertTriangle,
    label: 'Deadline Overdue',
    description: 'Sent when a report or submission deadline is missed.',
    to: [{ label: 'Student', color: 'accent' }, { label: 'Teacher', color: 'orange' }],
    warning: true,
  },
  {
    key: 'fee_due',
    icon: FileText,
    label: 'Fee Due Reminder',
    description: 'Sent when a semester fee payment becomes due.',
    to: [{ label: 'Student', color: 'accent' }],
  },
]

const DEFAULT_RULES = {
  application_submitted:    { email: true,  whatsapp: false },
  test_completed:           { email: true,  whatsapp: true  },
  approval_stage_opened:    { email: true,  whatsapp: false },
  submission_approved:      { email: true,  whatsapp: true  },
  submission_needs_revision:{ email: true,  whatsapp: false },
  deadline_overdue:         { email: true,  whatsapp: true  },
  fee_due:                  { email: true,  whatsapp: false },
}

const RECIPIENT_COLORS = {
  accent: 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]',
  purple: 'bg-purple-50 text-purple-700',
  orange: 'bg-orange-50 text-orange-700',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const [tab,       setTab]       = useState('send')
  const [type,      setType]      = useState('announcement')
  const [recipient, setRecipient] = useState('all')
  const [batches,   setBatches]   = useState([])
  const [students,  setStudents]  = useState([])
  const [users,     setUsers]     = useState([])
  const [rules,     setRules]     = useState(DEFAULT_RULES)
  const [rulesLoading, setRulesLoading] = useState(true)
  const [rulesSaving,  setRulesSaving]  = useState(false)

  const addToast      = useUiStore((s) => s.addToast)
  const { patchCurrentCourse, currentCourse } = useCourseStore()

  // ── Load data (re-fetch when active course changes so dropdowns are course-scoped) ──
  useEffect(() => {
    setBatches([])
    setStudents([])
    Promise.all([getBatches(), getStudents(), getUsers()]).then(([b, s, u]) => {
      setBatches(b.data)
      setStudents(s.data)
      setUsers(u.data)
    })
  }, [currentCourse?.id])

  // Load rules from course preferences when tab becomes active
  useEffect(() => {
    if (tab !== 'rules') return
    const courseId = currentCourse?.id
    if (!courseId) { setRulesLoading(false); return }

    getCourseById(courseId)
      .then((r) => {
        const savedRules = r.data?.preferences?.email?.notificationRules
        if (savedRules) {
          setRules((prev) => ({ ...prev, ...savedRules }))
        }
      })
      .catch(() => {})
      .finally(() => setRulesLoading(false))
  }, [tab, currentCourse?.id])

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  // ── Send notification ──────────────────────────────────────────────────────
  const submit = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await sendNotification({
      recipient_type:     recipient,
      recipient_batch_id: recipient === 'batch'      ? fd.get('batch_id')       : null,
      recipient_id:       recipient === 'individual' ? fd.get('student_user_id') : null,
      type,
      title:   fd.get('title'),
      message: fd.get('message'),
      zoom_link: fd.get('zoom'),
    })
    addToast({ type: 'success', title: 'Notification sent' })
    e.currentTarget.reset()
    setType('announcement')
    setRecipient('all')
  }

  // ── Toggle rule channel ────────────────────────────────────────────────────
  const toggleChannel = (key, channel) => {
    setRules((prev) => ({ ...prev, [key]: { ...prev[key], [channel]: !prev[key][channel] } }))
  }

  // ── Save rules to course preferences ──────────────────────────────────────
  const saveRules = async () => {
    const courseId = currentCourse?.id
    if (!courseId) {
      addToast({ type: 'error', title: 'No active course selected.' })
      return
    }
    setRulesSaving(true)
    try {
      const existing = await getCourseById(courseId)
      const prefs = existing.data?.preferences || {}
      const updatedPrefs = {
        ...prefs,
        email: {
          ...(prefs.email || {}),
          notificationRules: rules,
        },
      }
      const res = await updateCourse(courseId, { preferences: updatedPrefs })
      patchCurrentCourse(res.data)
      addToast({ type: 'success', title: 'Notification rules saved.' })
    } catch {
      addToast({ type: 'error', title: 'Failed to save rules.' })
    } finally { setRulesSaving(false) }
  }

  return (
    <div className="fade-page">
      <PageHeader title="Notifications" subtitle="Send manual messages and configure automatic event-based alerts." />

      <div className="mb-6 flex gap-2">
        <TabButton active={tab === 'send'}  icon={Send}     label="Send Notification"  onClick={() => setTab('send')}  />
        <TabButton active={tab === 'rules'} icon={Settings2} label="Notification Rules" onClick={() => setTab('rules')} />
      </div>

      {/* ── Send tab ── */}
      {tab === 'send' && (
        <div className="responsive-two">
          <form onSubmit={submit} className="card space-y-4 p-6">
            <select name="recipient" className="input w-full" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
              <option value="all">All Students</option>
              <option value="batch">Specific Batch</option>
              <option value="individual">Individual Student</option>
            </select>

            {recipient === 'batch' && (
              <select name="batch_id" className="input w-full" required>
                <option value="">Choose batch</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}

            {recipient === 'individual' && (
              <select name="student_user_id" className="input w-full" required>
                <option value="">Search or choose student</option>
                {students.map((s) => {
                  const u = userMap[s.user_id]
                  return <option key={s.id} value={s.user_id}>{u ? `${u.first_name} ${u.last_name}` : s.id} · {s.permanent_id}</option>
                })}
              </select>
            )}

            <select className="input w-full" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="announcement">Announcement</option>
              <option value="zoom_link">Zoom Link</option>
              <option value="report_due">Reminder</option>
            </select>
            <input name="title"   className="input w-full"    placeholder="Title"   required />
            <textarea name="message" className="textarea h-36 w-full" placeholder="Message" required />
            {type === 'zoom_link' && <input name="zoom" className="input w-full" placeholder="Zoom Link URL" required />}
            <button className="btn-primary">Send</button>
          </form>
          <div className="card p-6">
            <h2 className="text-xl font-semibold">Sent History</h2>
            <p className="mt-4 text-sm text-[color:var(--secondary)]">Recent notifications will appear here.</p>
          </div>
        </div>
      )}

      {/* ── Rules tab ── */}
      {tab === 'rules' && (
        <div>
          <div className="mb-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
            <p className="text-sm leading-6 text-[color:var(--secondary)]">
              Configure which events trigger automatic email notifications for the current course.
              Rules are saved per-course in Course Settings.
            </p>
          </div>

          {rulesLoading ? (
            <div className="flex items-center gap-3 text-sm text-[color:var(--secondary)] p-6">
              <Loader2 size={16} className="animate-spin" /> Loading notification rules…
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {EVENT_RULES.map(({ key, icon: Icon, label, description, to, warning }) => (
                  <div key={key} className="card p-5">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${warning ? 'bg-orange-50 text-orange-600' : 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]'}`}>
                          <Icon size={19} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[color:var(--text)]">{label}</p>
                          <p className="mt-1 text-sm leading-6 text-[color:var(--secondary)]">{description}</p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {to.map(({ label: rLabel, color }) => (
                              <span key={rLabel} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${RECIPIENT_COLORS[color]}`}>
                                → {rLabel}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-6 pl-[60px] sm:pl-0">
                        <ChannelToggle
                          label="Email"
                          icon={Mail}
                          active={rules[key]?.email ?? true}
                          onToggle={() => toggleChannel(key, 'email')}
                          activeColor="accent"
                        />
                        <ChannelToggle
                          label="WhatsApp"
                          icon={MessageSquare}
                          active={rules[key]?.whatsapp ?? false}
                          onToggle={() => toggleChannel(key, 'whatsapp')}
                          activeColor="green"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button className="btn-primary inline-flex items-center gap-2" onClick={saveRules} disabled={rulesSaving}>
                  {rulesSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {rulesSaving ? 'Saving…' : 'Save Rules'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--surface)] text-[color:var(--secondary)] hover:text-[color:var(--text)]'}`}
    >
      <Icon size={15} /> {label}
    </button>
  )
}

function ChannelToggle({ label, icon: Icon, active, onToggle, activeColor }) {
  const trackColor = active
    ? activeColor === 'green' ? 'bg-green-500' : 'bg-[color:var(--accent)]'
    : 'bg-[color:var(--border)]'
  const iconColor = active
    ? activeColor === 'green' ? 'text-green-500' : 'text-[color:var(--accent)]'
    : 'text-[color:var(--muted)]'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-semibold text-[color:var(--secondary)]">{label}</span>
      <button type="button" role="switch" aria-checked={active} onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition-colors ${trackColor}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      <Icon size={13} className={`transition-colors ${iconColor}`} />
    </div>
  )
}
