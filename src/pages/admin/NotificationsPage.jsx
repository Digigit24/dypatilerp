import { Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getBatches } from '../../api/services/batchService.js'
import { sendNotification } from '../../api/services/notificationService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'

// ─── Static metadata ──────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const [tab,       setTab]       = useState('send')
  const [type,      setType]      = useState('announcement')
  const [recipient, setRecipient] = useState('all')
  const [batches,   setBatches]   = useState([])
  const [students,  setStudents]  = useState([])
  const [users,     setUsers]     = useState([])

  const addToast      = useUiStore((s) => s.addToast)
  const { currentCourse } = useCourseStore()

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
  // ── Save rules to course preferences ──────────────────────────────────────
  return (
    <div className="fade-page">
      <PageHeader title="Notifications" subtitle="Send manual messages and configure automatic event-based alerts." />

      <div className="mb-6 flex gap-2">
        <TabButton active={tab === 'send'}  icon={Send}     label="Send Notification"  onClick={() => setTab('send')}  />
        <span className="ml-auto self-center text-xs text-[color:var(--secondary)]">
          Notification rules &amp; senders are configured per course in the <a href="/admin/wizard" className="font-semibold text-[color:var(--accent)] hover:underline">Admin Wizard</a>.
        </span>
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

