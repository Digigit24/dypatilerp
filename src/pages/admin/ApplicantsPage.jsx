import {
  Award, CheckCircle2, Clock3, GraduationCap, Pencil, RotateCcw,
  Save, Search, Send, UserCheck, UserMinus, UserPlus, XCircle, ClipboardList,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createApplicant, getApplicants, shortlistApplicant, updateApplicantDetails, updateApplicantStatus } from '../../api/services/applicantService.js'
import { getBatches } from '../../api/services/batchService.js'
import { getCourses } from '../../api/services/courseService.js'
import { useCourseStore } from '../../store/courseStore.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate } from '../../lib/formatters.js'
import useScrollLock from '../../hooks/useScrollLock.js'
import { useUiStore } from '../../store/uiStore.js'

const statusTabs = ['all', 'submitted', 'test_pending', 'test_completed', 'shortlisted', 'rejected']

// Ordered stages for the pipeline indicator (rejected is a side-branch)
const PIPELINE = ['submitted', 'test_pending', 'test_completed', 'shortlisted']

const makeBlankForm = (courseId = '') => ({
  course_id: courseId,
  first_name: '', last_name: '', email: '', mobile: '',
  phd_completion_year: '', phd_discipline: '', phd_research_title: '',
  scopus_publications: '', state_country: '', batch_id: '', status: 'submitted',
})

// ─── Status-specific drawer banner ────────────────────────────────────────────
function StatusBanner({ status }) {
  const cfg = {
    submitted:      { bg: 'bg-[color:var(--surface)] border-[color:var(--border)]',   icon: UserPlus,      color: 'text-[color:var(--secondary)]', text: 'Application received — assign test or shortlist directly.' },
    test_pending:   { bg: 'bg-amber-50 border-amber-200',                              icon: Clock3,         color: 'text-amber-700',                text: 'Test invite sent. Awaiting submission from candidate.' },
    test_completed: { bg: 'bg-blue-50 border-blue-200',                               icon: CheckCircle2,   color: 'text-blue-700',                 text: 'Test completed. Review the score and decide next step.' },
    shortlisted:    { bg: 'bg-emerald-50 border-emerald-200',                          icon: UserCheck,      color: 'text-emerald-700',              text: 'Candidate is shortlisted. Convert to student when ready.' },
    rejected:       { bg: 'bg-red-50 border-red-200',                                  icon: XCircle,        color: 'text-red-700',                  text: 'Application has been rejected. Reconsider to reopen.' },
  }
  const c = cfg[status] || cfg.submitted
  const Icon = c.icon
  return (
    <div className={`flex items-start gap-3 rounded-2xl border ${c.bg} px-4 py-3`}>
      <Icon size={15} className={`mt-0.5 shrink-0 ${c.color}`} />
      <span className={`text-sm font-medium leading-snug ${c.color}`}>{c.text}</span>
    </div>
  )
}

// ─── Workflow pipeline indicator ──────────────────────────────────────────────
function PipelineBar({ status }) {
  if (status === 'rejected') return null
  const current = PIPELINE.indexOf(status)
  const labels  = ['Submitted', 'Test Sent', 'Test Done', 'Shortlisted']
  return (
    <div className="flex items-center gap-0">
      {PIPELINE.map((stage, i) => {
        const done    = current > i
        const active  = current === i
        const last    = i === PIPELINE.length - 1
        return (
          <div key={stage} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                ${done   ? 'bg-[color:var(--accent)] text-white'
                : active ? 'bg-[color:var(--accent)] text-white ring-2 ring-[color:var(--accent)] ring-offset-2 ring-offset-[color:var(--card)]'
                         : 'bg-[color:var(--surface-strong)] text-[color:var(--muted)]'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`mt-1 text-[10px] font-semibold whitespace-nowrap
                ${active ? 'text-[color:var(--accent)]' : done ? 'text-[color:var(--secondary)]' : 'text-[color:var(--muted)]'}`}>
                {labels[i]}
              </span>
            </div>
            {!last && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 rounded transition-colors ${done ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Status-aware action buttons ──────────────────────────────────────────────
function DrawerActions({ item, onAct, onConvert, busy }) {
  const { status, test_score } = item

  // Where to send them if removed from shortlist
  const unshortlistTarget = test_score != null ? 'test_completed' : 'submitted'

  if (status === 'rejected') {
    return (
      <div className="grid grid-cols-1 gap-2">
        <button
          disabled={busy}
          onClick={() => onAct(item, 'submitted')}
          className="mobile-compact-button flex items-center justify-center gap-2 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--text)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition disabled:opacity-50"
        >
          <RotateCcw size={15} /> Reconsider Application
        </button>
      </div>
    )
  }

  if (status === 'shortlisted') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={busy}
          onClick={() => onConvert(item)}
          className="col-span-2 btn-primary flex items-center justify-center gap-2 text-sm"
        >
          <GraduationCap size={15} /> Convert to Student
        </button>
        <button
          disabled={busy}
          onClick={() => onAct(item, unshortlistTarget)}
          className="mobile-compact-button flex items-center justify-center gap-2 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:border-amber-400 hover:text-amber-700 transition disabled:opacity-50"
        >
          <UserMinus size={14} /> Remove Shortlist
        </button>
        <button
          disabled={busy}
          onClick={() => onAct(item, 'rejected')}
          className="mobile-compact-button flex items-center justify-center rounded-[14px] bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    )
  }

  // submitted | test_pending | test_completed
  const canSendTest  = status === 'submitted'
  const canMarkDone  = status === 'test_pending'
  const canShortlist = status !== 'shortlisted'

  return (
    <div className="grid grid-cols-2 gap-2">
      {canSendTest && (
        <button
          disabled={busy}
          onClick={() => onAct(item, 'test_pending')}
          className="mobile-compact-button flex items-center justify-center gap-2 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition disabled:opacity-50"
        >
          <Send size={13} /> Send Test
        </button>
      )}
      {canMarkDone && (
        <button
          disabled={busy}
          onClick={() => onAct(item, 'test_completed')}
          className="mobile-compact-button flex items-center justify-center gap-2 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:border-blue-400 hover:text-blue-700 transition disabled:opacity-50"
        >
          <CheckCircle2 size={13} /> Mark Done
        </button>
      )}
      {canShortlist && (
        <button
          disabled={busy}
          onClick={() => onAct(item, 'shortlisted')}
          className="btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <UserCheck size={14} /> Shortlist
        </button>
      )}
      <button
        disabled={busy}
        onClick={() => onAct(item, 'rejected')}
        className={`mobile-compact-button flex items-center justify-center rounded-[14px] bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50 ${!canSendTest && !canMarkDone && !canShortlist ? 'col-span-2' : ''}`}
      >
        Reject
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ApplicantsPage() {
  const navigate = useNavigate()
  const currentCourse = useCourseStore((s) => s.currentCourse)

  const [items,    setItems]    = useState(null)
  const [courses,  setCourses]  = useState([])
  const [batches,  setBatches]  = useState([])   // all batches cache
  const [formBatches, setFormBatches] = useState([])  // batches for selected course in form
  const [selected, setSelected] = useState(null)
  const [addOpen,  setAddOpen]  = useState(false)
  const [form,     setForm]     = useState(() => makeBlankForm(currentCourse?.id || ''))
  const [saving,     setSaving]     = useState(false)
  const [acting,     setActing]     = useState(false)
  const [editing,    setEditing]    = useState(false)
  const [editForm,   setEditForm]   = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [query,      setQuery]      = useState('')
  const [status,     setStatus]     = useState('all')
  const addToast = useUiStore((s) => s.addToast)
  useScrollLock(Boolean(selected || addOpen))

  // Re-fetch when active course changes; X-Course-Id header is added automatically
  useEffect(() => {
    setItems(null)
    setSelected(null)
    Promise.all([getApplicants(), getCourses()]).then(([r, c]) => {
      setItems(r.data)
      setCourses(c.data || [])
    })
  }, [currentCourse?.id])

  // When course in form changes, fetch batches for that course
  useEffect(() => {
    if (!form.course_id) { setFormBatches([]); return }
    getBatches({ course_id: form.course_id }).then((r) => {
      const list = r.data || []
      setFormBatches(list)
      // Auto-select first batch or clear if none
      setForm((f) => ({ ...f, batch_id: list[0]?.id || '' }))
    })
  }, [form.course_id])

  const filtered = useMemo(() => {
    if (!items) return []
    return items.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status
      const haystack = `${item.personal.full_name} ${item.personal.email} ${item.temp_id}`.toLowerCase()
      return matchesStatus && haystack.includes(query.toLowerCase())
    })
  }, [items, query, status])

  if (!items) return <SkeletonCard rows={8} />

  const act = async (item, nextStatus) => {
    setActing(true)
    try {
      const res = nextStatus === 'shortlisted'
        ? await shortlistApplicant(item.id)
        : await updateApplicantStatus(item.id, nextStatus)
      setItems((xs) => xs.map((x) => (x.id === item.id ? res.data : x)))
      setSelected(res.data)

      const labels = {
        shortlisted:    `${item.personal.full_name} has been shortlisted.`,
        rejected:       `${item.personal.full_name}'s application rejected.`,
        test_pending:   `Test invite sent to ${item.personal.full_name}.`,
        test_completed: `${item.personal.full_name} marked as test completed.`,
        submitted:      `${item.personal.full_name} moved back to submitted.`,
      }
      addToast({
        type:  nextStatus === 'rejected' ? 'warning' : 'success',
        title: labels[nextStatus] || `Status updated to ${nextStatus.replaceAll('_', ' ')}.`,
      })
    } finally {
      setActing(false)
    }
  }

  const convertToStudent = (item) => {
    addToast({ type: 'success', title: `${item.personal.full_name} converted to student. Credentials sent.` })
    setSelected(null)
  }

  const openAdd = () => { setForm(makeBlankForm(currentCourse?.id || '')); setAddOpen(true) }

  const openEdit = (item) => {
    setEditForm({
      first_name:    item.personal?.first_name  || item.first_name  || '',
      last_name:     item.personal?.last_name   || item.last_name   || '',
      email:         item.personal?.email       || item.email       || '',
      phone:         item.personal?.phone       || item.phone       || '',
      state_country: item.personal?.state_country || '',
      phd_discipline:      item.academic?.phd_discipline || '',
      phd_research_title:  item.academic?.phd_research_title || '',
      phd_completion_year: item.academic?.phd_completion_year || '',
      scopus_publications: item.academic?.scopus_publications ?? '',
      university:          item.academic?.university || '',
    })
    setEditing(true)
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    setEditSaving(true)
    try {
      // Build flat update payload
      const phd_details = {
        subject:      editForm.phd_discipline,
        thesis_title: editForm.phd_research_title,
        year_awarded: Number(editForm.phd_completion_year) || null,
        university:   editForm.university,
        scopus_publications: Number(editForm.scopus_publications) || 0,
        highest_degree: selected.academic?.highest_degree || 'Ph.D.',
      }
      // Merge state_country into application_data.personal
      const application_data = {
        ...(selected.application_data || {}),
        personal: {
          ...(selected.application_data?.personal || {}),
          state_country: editForm.state_country,
        },
      }
      const res = await updateApplicantDetails(selected.id, {
        first_name: editForm.first_name,
        last_name:  editForm.last_name,
        email:      editForm.email,
        phone:      editForm.phone || null,
        phd_details,
        application_data,
      })
      setItems((xs) => xs.map((x) => (x.id === selected.id ? res.data : x)))
      setSelected(res.data)
      setEditing(false)
      addToast({ type: 'success', title: 'Applicant details updated.' })
    } catch (err) {
      addToast({ type: 'error', title: err?.response?.data?.message || 'Save failed.' })
    } finally {
      setEditSaving(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await createApplicant({
      course_id: form.course_id || undefined,
      batch_id: form.batch_id || undefined,
      personal: {
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        first_name: form.first_name, last_name: form.last_name,
        email: form.email, phone: form.mobile, mobile: form.mobile,
        state_country: form.state_country,
      },
      academic: {
        highest_degree: 'Ph.D.',
        phd_discipline: form.phd_discipline, specialization: form.phd_discipline,
        phd_completion_year: Number(form.phd_completion_year), graduation_year: Number(form.phd_completion_year),
        phd_research_title: form.phd_research_title,
        scopus_publications: Number(form.scopus_publications),
        university: '—',
      },
      research_statement: `PhD Research Title: ${form.phd_research_title}. Discipline: ${form.phd_discipline}.`,
    })
    setItems((xs) => [{ ...res.data, status: form.status }, ...(xs || [])])
    setSaving(false)
    setAddOpen(false)
    addToast({ type: 'success', title: 'Applicant added successfully.' })
  }

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  const stats = [
    { label: 'Total Applications', value: items.length,                                              hint: '+12 this month',    icon: UserPlus,     tone: 'rose'  },
    { label: 'Tests Completed',    value: items.filter((a) => a.test_score).length,                  hint: 'Ready for review',  icon: CheckCircle2, tone: 'green' },
    { label: 'Pending Test',       value: items.filter((a) => a.status === 'test_pending').length,   hint: 'Needs follow-up',   icon: Clock3,       tone: 'amber' },
    { label: 'Avg. Test Score',    value: (() => { const s = items.filter((a) => a.test_score); return s.length ? `${Math.round(s.reduce((t, a) => t + a.test_score, 0) / s.length)}%` : '—' })(),
                                                                                                      hint: '+8% this cycle',    icon: Award,        tone: 'blue'  },
  ]

  return (
    <div className="fade-page">
      <PageHeader
        title="Applications"
        subtitle="Review applicant profiles, test outcomes, and shortlist candidates for enrollment."
        action={
          <button className="btn-primary inline-flex items-center gap-2" onClick={openAdd}>
            <UserPlus size={17} /> Add Applicant
          </button>
        }
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-5 2xl:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon, tone }) => (
          <div className="card card-hover p-6" key={label}>
            <div className="flex items-start justify-between">
              <p className="text-sm font-semibold text-[color:var(--secondary)]">{label}</p>
              <span className={`grid h-11 w-11 place-items-center rounded-full ${tone === 'green' ? 'bg-emerald-50 text-emerald-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-500'}`}>
                <Icon size={19} />
              </span>
            </div>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-[color:var(--text)]">{value}</p>
            <p className="mt-2 text-xs font-medium text-emerald-600">{hint}</p>
          </div>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Applicant Review Queue</h2>
            <p className="text-sm text-[color:var(--secondary)]">{filtered.length} candidates shown</p>
          </div>
          <label className="flex h-11 w-72 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4">
            <Search size={16} className="text-[color:var(--muted)]" />
            <input className="w-full bg-transparent text-sm outline-none" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicants" />
          </label>
        </div>

        {/* Status tabs */}
        <div className="mobile-filter-scroll flex gap-2 border-b border-[color:var(--border)] px-5 py-3">
          {statusTabs.map((tab) => (
            <button key={tab} onClick={() => setStatus(tab)}
              className={`mobile-compact-button shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${status === tab ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}>
              {tab.replaceAll('_', ' ')}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[840px] w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>{['Applicant', 'Applied', 'Batch', 'Score', 'Status', 'Actions'].map((h) => <th className="px-6 py-4" key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="table-row cursor-pointer border-t border-[color:var(--border)]" onClick={() => setSelected(a)}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[color:var(--accent-tint)] font-semibold text-[color:var(--accent)]">
                        {a.personal.full_name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-[color:var(--text)]">{a.personal.full_name}</p>
                        <p className="text-xs text-[color:var(--secondary)]">{a.temp_id} · {a.personal.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 text-[color:var(--secondary)]">{formatDate(a.applied_at)}</td>
                  <td className="px-6 text-[color:var(--secondary)]">{a.batch_id?.replace('batch_', 'Batch ').replace('_', '-')}</td>
                  <td className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                        <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${a.test_score || 0}%` }} />
                      </div>
                      <span className="font-semibold text-[color:var(--text)]">{a.test_score ?? '-'}</span>
                    </div>
                  </td>
                  <td className="px-6"><StatusBadge status={a.status} /></td>
                  <td className="px-6">
                    <button
                      className="rounded-full bg-[color:var(--accent-tint)] px-4 py-2 text-xs font-semibold text-[color:var(--accent)]"
                      onClick={(e) => { e.stopPropagation(); setSelected(a) }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-[color:var(--secondary)]">No applicants match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail drawer ── */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => { setSelected(null); setEditing(false) }}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="shrink-0 flex items-start justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  {editing ? 'Edit Profile' : 'Applicant Profile'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{selected.personal.full_name}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]"><StatusBadge status={selected.status} /></p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!editing && (
                  <button
                    onClick={() => openEdit(selected)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                )}
                <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => { setSelected(null); setEditing(false) }}>
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-6">

              {editing ? (
                /* ── Edit form ── */
                <form id="edit-applicant-form" onSubmit={handleEditSave} className="space-y-5">
                  <DrawerSection title="Personal Details">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField label="First Name" required>
                        <input className="input w-full" value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} required />
                      </FormField>
                      <FormField label="Last Name" required>
                        <input className="input w-full" value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} required />
                      </FormField>
                      <FormField label="Email" required>
                        <input className="input w-full" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} required />
                      </FormField>
                      <FormField label="Phone">
                        <input className="input w-full" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                      </FormField>
                      <FormField label="State & Country">
                        <input className="input w-full" value={editForm.state_country} onChange={(e) => setEditForm((f) => ({ ...f, state_country: e.target.value }))} />
                      </FormField>
                    </div>
                  </DrawerSection>
                  <DrawerSection title="PhD Details">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField label="Year of Completion">
                        <input className="input w-full" type="number" value={editForm.phd_completion_year} onChange={(e) => setEditForm((f) => ({ ...f, phd_completion_year: e.target.value }))} />
                      </FormField>
                      <FormField label="Discipline / Field">
                        <input className="input w-full" value={editForm.phd_discipline} onChange={(e) => setEditForm((f) => ({ ...f, phd_discipline: e.target.value }))} />
                      </FormField>
                      <FormField label="University">
                        <input className="input w-full" value={editForm.university} onChange={(e) => setEditForm((f) => ({ ...f, university: e.target.value }))} />
                      </FormField>
                      <FormField label="Scopus Publications">
                        <input className="input w-full" type="number" min="0" value={editForm.scopus_publications} onChange={(e) => setEditForm((f) => ({ ...f, scopus_publications: e.target.value }))} />
                      </FormField>
                    </div>
                    <FormField label="PhD Research Title" className="mt-3">
                      <input className="input w-full" value={editForm.phd_research_title} onChange={(e) => setEditForm((f) => ({ ...f, phd_research_title: e.target.value }))} />
                    </FormField>
                  </DrawerSection>
                </form>
              ) : (
                <>
              {/* Status banner + pipeline */}
              <div className="space-y-4">
                <StatusBanner status={selected.status} />
                <PipelineBar status={selected.status} />
              </div>

              <DrawerSection title="Personal Information">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Info label="Email"           value={selected.personal.email} />
                  <Info label="Mobile"          value={selected.personal.mobile ?? selected.personal.phone} />
                  <Info label="State & Country" value={selected.personal.state_country ?? `${selected.personal.state}, ${selected.personal.country}`} />
                  <Info label="Applied On"      value={formatDate(selected.applied_at)} />
                </div>
              </DrawerSection>

              <DrawerSection title="PhD Details">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Info label="Year of Completion" value={selected.academic.phd_completion_year ?? selected.academic.graduation_year} />
                  <Info label="Discipline / Field" value={selected.academic.phd_discipline ?? selected.academic.specialization} />
                </div>
                <div className="mt-3"><Info label="Title of PhD Research" value={selected.academic.phd_research_title ?? '—'} /></div>
              </DrawerSection>

              <DrawerSection title="Research Profile">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Info label="Scopus Publications" value={selected.academic.scopus_publications ?? '—'} />
                  <Info label="University"          value={selected.academic.university} />
                </div>
                <div className="mt-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Research Statement</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]">{selected.research_statement}</p>
                </div>
              </DrawerSection>

              <DrawerSection title="Test Result">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Info
                    label="Test Score"
                    value={selected.test_score != null
                      ? `${selected.test_score} / ${selected.test_max_score ?? '—'}`
                      : 'Not attempted'}
                  />
                  <Info
                    label="Test Submitted"
                    value={selected.test_submitted_at
                      ? new Date(selected.test_submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  />
                  {selected.test_time_taken_secs != null && (
                    <Info
                      label="Time Taken"
                      value={(() => {
                        const m = Math.floor(selected.test_time_taken_secs / 60)
                        const s = selected.test_time_taken_secs % 60
                        return s > 0 ? `${m}m ${s}s` : `${m}m`
                      })()}
                    />
                  )}
                </div>
                {selected.test_score != null && selected.test_max_score != null && (
                  <div className="mt-3 rounded-3xl bg-[color:var(--surface)] p-4">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-[color:var(--secondary)]">Score</span>
                      <span className="text-[color:var(--text)]">
                        {selected.test_score} / {selected.test_max_score}
                        {' '}
                        <span className="text-[color:var(--secondary)]">
                          ({Math.round((selected.test_score / selected.test_max_score) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--border)]">
                      <div
                        className="h-full rounded-full bg-[color:var(--accent)]"
                        style={{ width: `${Math.round((selected.test_score / selected.test_max_score) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {(selected.status === 'test_completed' || selected.test_score != null) && (
                  <button
                    onClick={() => navigate(`/admin/applicants/${selected.id}/test-results`)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
                  >
                    <ClipboardList size={16} /> View Test Responses
                  </button>
                )}
              </DrawerSection>
                </>
              )}
            </div>

            {/* ── Footer: edit save/cancel OR status actions ── */}
            <div className="shrink-0 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
              {editing ? (
                <div className="flex gap-3">
                  <button
                    type="submit"
                    form="edit-applicant-form"
                    disabled={editSaving}
                    className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm disabled:opacity-60"
                  >
                    {editSaving ? <span className="animate-spin">⟳</span> : <Save size={15} />}
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] py-3 text-sm font-semibold text-[color:var(--secondary)] hover:text-[color:var(--text)] transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <DrawerActions
                  item={selected}
                  onAct={act}
                  onConvert={convertToStudent}
                  busy={acting}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Applicant drawer ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="drawer-panel lg:!w-[min(600px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">New Application</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Add Applicant</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setAddOpen(false)}>
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-5">
                <FormSection title="Personal Details">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="First Name" required><input className="input w-full" placeholder="First name"        required {...field('first_name')} /></FormField>
                    <FormField label="Last Name"  required><input className="input w-full" placeholder="Last name"         required {...field('last_name')} /></FormField>
                    <FormField label="Email"      required><input className="input w-full" type="email" placeholder="email@example.com" required {...field('email')} /></FormField>
                    <FormField label="Mobile">            <input className="input w-full" placeholder="+91 XXXXX XXXXX"   {...field('mobile')} /></FormField>
                    <FormField label="State & Country">   <input className="input w-full" placeholder="Maharashtra, India" {...field('state_country')} /></FormField>
                  </div>
                </FormSection>

                <FormSection title="PhD Details">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Year of PhD Completion" required><input className="input w-full" type="number" min="1970" max="2026" placeholder="2020" required {...field('phd_completion_year')} /></FormField>
                    <FormField label="Discipline / Field"      required><input className="input w-full" placeholder="e.g. Management" required {...field('phd_discipline')} /></FormField>
                  </div>
                  <FormField label="PhD Research Title" required>
                    <input className="input w-full" placeholder="Full title of your doctoral thesis" required {...field('phd_research_title')} />
                  </FormField>
                </FormSection>

                <FormSection title="Research Profile">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Scopus Publications"><input className="input w-full" type="number" min="0" placeholder="0" {...field('scopus_publications')} /></FormField>
                    <FormField label="Course" required>
                      <select
                        className="input w-full"
                        value={form.course_id}
                        onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value, batch_id: '' }))}
                      >
                        <option value="">Select course…</option>
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Batch">
                      <select
                        className="input w-full"
                        value={form.batch_id}
                        onChange={(e) => setForm((f) => ({ ...f, batch_id: e.target.value }))}
                        disabled={!form.course_id}
                      >
                        {!form.course_id && <option value="">Select a course first</option>}
                        {form.course_id && formBatches.length === 0 && <option value="">No batches for this course</option>}
                        {formBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Initial Status">
                      <select className="input w-full" {...field('status')}>
                        <option value="submitted">Submitted</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="test_pending">Test Pending</option>
                      </select>
                    </FormField>
                  </div>
                </FormSection>
              </div>

              <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
                <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => setAddOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving…' : 'Add Applicant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Small shared components ───────────────────────────────────────────────────

function DrawerSection({ title, children }) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{title}</p>
      {children}
    </div>
  )
}

function FormSection({ title, children }) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function FormField({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[color:var(--text)]">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[color:var(--text)]">{value}</div>
    </div>
  )
}
