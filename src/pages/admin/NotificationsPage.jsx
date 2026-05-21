import { useEffect, useMemo, useState } from 'react'
import { getBatches } from '../../api/services/batchService.js'
import { sendNotification } from '../../api/services/notificationService.js'
import { getStudents } from '../../api/services/studentService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { useUiStore } from '../../store/uiStore.js'

export default function AdminNotificationsPage() {
  const [type, setType] = useState('announcement')
  const [recipient, setRecipient] = useState('all')
  const [batches, setBatches] = useState([])
  const [students, setStudents] = useState([])
  const [users, setUsers] = useState([])
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    Promise.all([getBatches(), getStudents(), getUsers()]).then(([b, s, u]) => {
      setBatches(b.data)
      setStudents(s.data)
      setUsers(u.data)
    })
  }, [])

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const submit = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await sendNotification({
      recipient_type: recipient,
      recipient_batch_id: recipient === 'batch' ? fd.get('batch_id') : null,
      recipient_id: recipient === 'individual' ? fd.get('student_user_id') : null,
      type,
      title: fd.get('title'),
      message: fd.get('message'),
      zoom_link: fd.get('zoom'),
    })
    addToast({ type: 'success', title: 'Notification sent' })
  }

  return (
    <div className="fade-page">
      <PageHeader title="Notifications" />
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
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
            </select>
          )}

          {recipient === 'individual' && (
            <select name="student_user_id" className="input w-full" required>
              <option value="">Search or choose student</option>
              {students.map((student) => {
                const user = userMap[student.user_id]
                return <option key={student.id} value={student.user_id}>{user ? `${user.first_name} ${user.last_name}` : student.id} · {student.permanent_id}</option>
              })}
            </select>
          )}

          <select className="input w-full" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="announcement">Announcement</option>
            <option value="zoom_link">Zoom Link</option>
            <option value="report_due">Reminder</option>
          </select>
          <input name="title" className="input w-full" placeholder="Title" required />
          <textarea name="message" className="textarea h-36 w-full" placeholder="Message" required />
          {type === 'zoom_link' && <input name="zoom" className="input w-full" placeholder="Zoom Link URL" required />}
          <button className="btn-primary">Send</button>
        </form>
        <div className="card p-6">
          <h2 className="text-xl font-semibold">Sent History</h2>
          <p className="mt-4 text-sm text-[color:var(--secondary)]">Sent notifications will appear here in the production API.</p>
        </div>
      </div>
    </div>
  )
}
