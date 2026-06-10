import { AlertCircle, ArrowLeft, Mail, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCourseById, updateCourse } from '../../api/services/courseService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'

const ALL_MODULES = [
  { key: 'applicants',    label: 'Applicants',          desc: 'Applications management and review queue' },
  { key: 'students',      label: 'Students',            desc: 'Enrolled student profiles and management' },
  { key: 'batches',       label: 'Batches',             desc: 'Batch creation and enrollment management' },
  { key: 'progress',      label: 'Progress Reports',    desc: 'Semester-wise progress tracking per student' },
  { key: 'approvals',     label: 'Approvals',           desc: 'Multi-stage submission approval workflow' },
  { key: 'fees',          label: 'Fees',                desc: 'Fee records and payment tracking' },
  { key: 'lectures',      label: 'Lectures',            desc: 'Secure video lecture gallery for students' },
  { key: 'test-builder',  label: 'Test Builder',        desc: 'Create and publish entrance and assessment tests' },
  { key: 'notifications', label: 'Notifications',       desc: 'System and manual notification center' },
  { key: 'users',         label: 'User Management',     desc: 'Admin-only: manage system users' },
  { key: 'courses',       label: 'Courses',             desc: 'Admin-only: manage all courses' },
  { key: 'roles',         label: 'Roles & Permissions', desc: 'Admin-only: manage RBAC permissions' },
  { key: 'settings',      label: 'Settings',            desc: 'Theme and appearance settings' },
]

export default function CourseSettingsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course,      setCourse]      = useState(null)
  const [modules,     setModules]     = useState({})
  const [feeStr,      setFeeStr]      = useState('{}')
  const [displayName, setDisplayName] = useState('')
  const [emailPrefs,  setEmailPrefs]  = useState({
    senderName:        '',
    senderEmail:       '',
    notificationRules: {
      application_submitted:    { email: true  },
      test_completed:           { email: true  },
      approval_stage_opened:    { email: true  },
      submission_approved:      { email: true  },
      submission_needs_revision:{ email: true  },
      deadline_overdue:         { email: true  },
      fee_due:                  { email: true  },
    },
  })
  const [saving, setSaving] = useState(false)
  const addToast = useUiStore((s) => s.addToast)
  const { patchCurrentCourse, currentCourse } = useCourseStore()

  useEffect(() => {
    const target = id || currentCourse?.id
    if (!target) return
    getCourseById(target).then((r) => {
      if (!r.data) return
      setCourse(r.data)
      const prefs = r.data.preferences || {}
      const mods = { ...{ applicants:true,students:true,batches:true,progress:true,approvals:true,fees:true,'test-builder':true,notifications:true,users:true,settings:true,courses:true,roles:true }, ...(prefs.modules || {}) }
      setModules(mods)
      setDisplayName(prefs.display?.program_name || r.data.name)
      setFeeStr(JSON.stringify(r.data.fee_structure || {}, null, 2))
      // Load email preferences from course.preferences.email
      if (prefs.email) {
        setEmailPrefs((prev) => ({
          ...prev,
          ...prefs.email,
          notificationRules: { ...prev.notificationRules, ...(prefs.email.notificationRules || {}) },
        }))
      }
    })
  }, [id, currentCourse?.id])

  const handleSave = async () => {
    if (!course) return
    setSaving(true)
    try {
      let fee_structure = {}
      try { fee_structure = JSON.parse(feeStr) } catch { fee_structure = course.fee_structure }
      const preferences = { modules, display: { program_name: displayName }, email: emailPrefs }
      const r = await updateCourse(course.id, { fee_structure, preferences })
      setCourse(r.data)
      patchCurrentCourse(r.data)
      addToast({ type: 'success', title: 'Course settings saved.' })
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message || 'Something went wrong' })
    } finally { setSaving(false) }
  }

  if (!course) return <SkeletonCard rows={8} />

  return (
    <div className="fade-page">
      <PageHeader
        title={`Settings — ${course.name}`}
        subtitle="Configure module visibility, fee structure, and display preferences for this course."
        action={
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)]"
              onClick={() => navigate('/admin/courses')}
            >
              <ArrowLeft size={15} /> Back
            </button>
            <button className="btn-primary inline-flex items-center gap-2" onClick={handleSave} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        }
      />

      <div className="responsive-two gap-6">
        {/* Module Visibility */}
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Sidebar Modules</h2>
            <p className="mt-1 text-sm text-[color:var(--secondary)]">
              Toggle which modules appear in the admin sidebar for this course. Hidden modules are still accessible by direct URL.
            </p>
            <div className="mt-5 space-y-3">
              {ALL_MODULES.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--text)]">{label}</p>
                    <p className="text-xs text-[color:var(--secondary)] truncate">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModules((m) => ({ ...m, [key]: !m[key] }))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${modules[key] !== false ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${modules[key] !== false ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fee Structure + Display */}
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Course Details</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-[color:var(--text)]">Display Name</span>
                <input
                  className="input mt-1.5 w-full"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={course.name}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-[color:var(--surface)] p-4">
                  <p className="text-xs text-[color:var(--muted)]">Duration</p>
                  <p className="mt-1 font-semibold text-[color:var(--text)]">{course.duration_months} months</p>
                </div>
                <div className="rounded-3xl bg-[color:var(--surface)] p-4">
                  <p className="text-xs text-[color:var(--muted)]">Max per Batch</p>
                  <p className="mt-1 font-semibold text-[color:var(--text)]">{course.max_students_per_batch} students</p>
                </div>
                <div className="rounded-3xl bg-[color:var(--surface)] p-4">
                  <p className="text-xs text-[color:var(--muted)]">Batches</p>
                  <p className="mt-1 font-semibold text-[color:var(--text)]">{course.batch_count || 0}</p>
                </div>
                <div className="rounded-3xl bg-[color:var(--surface)] p-4">
                  <p className="text-xs text-[color:var(--muted)]">Active Students</p>
                  <p className="mt-1 font-semibold text-[color:var(--text)]">{course.student_count || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Email Notification Settings ── */}
          <div className="card p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                <Mail size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text)]">Email Notifications</h2>
                <p className="mt-0.5 text-sm text-[color:var(--secondary)]">
                  Per-course sender override and event-level email toggles. Leave sender blank to use global settings.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Sender override */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[color:var(--text)]">Sender Name Override</label>
                  <input
                    className="input mt-1.5 w-full"
                    value={emailPrefs.senderName}
                    onChange={(e) => setEmailPrefs((p) => ({ ...p, senderName: e.target.value }))}
                    placeholder="DY Patil ERP"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[color:var(--text)]">Sender Email Override</label>
                  <input
                    className="input mt-1.5 w-full"
                    type="email"
                    value={emailPrefs.senderEmail}
                    onChange={(e) => setEmailPrefs((p) => ({ ...p, senderEmail: e.target.value }))}
                    placeholder="phd@yourdomain.com"
                  />
                </div>
              </div>

              {/* Per-event toggles */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)] mb-3">Notification Rules</p>
                <div className="space-y-2">
                  {[
                    { key: 'application_submitted',     label: 'Application Submitted' },
                    { key: 'test_completed',             label: 'Test Completed' },
                    { key: 'approval_stage_opened',      label: 'Approval Stage Opened' },
                    { key: 'submission_approved',        label: 'Submission Approved' },
                    { key: 'submission_needs_revision',  label: 'Revision Requested' },
                    { key: 'deadline_overdue',           label: 'Deadline Overdue' },
                    { key: 'fee_due',                    label: 'Fee Due Reminder' },
                  ].map(({ key, label }) => {
                    const enabled = emailPrefs.notificationRules?.[key]?.email !== false
                    return (
                      <div key={key} className="flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                        <span className="text-sm font-medium text-[color:var(--text)]">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${enabled ? 'text-emerald-600' : 'text-[color:var(--muted)]'}`}>
                            {enabled ? 'On' : 'Off'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEmailPrefs((p) => ({
                              ...p,
                              notificationRules: {
                                ...p.notificationRules,
                                [key]: { ...p.notificationRules?.[key], email: !enabled },
                              },
                            }))}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}
                          >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                <AlertCircle size={14} /> Global Brevo API key is configured in <strong>Settings → Email Delivery</strong>.
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Fee Structure</h2>
            <p className="mt-1 text-sm text-[color:var(--secondary)]">
              JSON map of semester number → amount in ₹.
            </p>
            <textarea
              className="input mt-4 w-full font-mono text-xs resize-none"
              rows={8}
              value={feeStr}
              onChange={(e) => setFeeStr(e.target.value)}
              placeholder='{"1": 50000, "2": 50000}'
            />
            <div className="mt-3 rounded-3xl bg-[color:var(--accent-tint)] p-4">
              {(() => {
                try {
                  const parsed = JSON.parse(feeStr)
                  const total = Object.values(parsed).reduce((s, v) => s + Number(v), 0)
                  return (
                    <div className="space-y-1">
                      {Object.entries(parsed).map(([sem, amt]) => (
                        <div key={sem} className="flex justify-between text-sm">
                          <span className="text-[color:var(--secondary)]">Semester {sem}</span>
                          <span className="font-semibold text-[color:var(--text)]">₹{Number(amt).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-[color:var(--border)] pt-2 text-sm font-semibold">
                        <span className="text-[color:var(--text)]">Total</span>
                        <span className="text-[color:var(--accent)]">₹{total.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )
                } catch {
                  return <p className="text-xs text-red-500">Invalid JSON</p>
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
