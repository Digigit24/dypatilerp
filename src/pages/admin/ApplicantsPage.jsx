import { Award, CheckCircle2, Clock3, GraduationCap, Search, UserCheck, UserPlus, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createApplicant, getApplicants, shortlistApplicant, updateApplicantStatus } from '../../api/services/applicantService.js'
import { getBatches } from '../../api/services/batchService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { formatDate } from '../../lib/formatters.js'
import useScrollLock from '../../hooks/useScrollLock.js'
import { useUiStore } from '../../store/uiStore.js'

const statusTabs = ['all', 'submitted', 'test_pending', 'test_completed', 'shortlisted', 'rejected']

const BLANK_FORM = {
  first_name: '', last_name: '', email: '', mobile: '',
  phd_completion_year: '', phd_discipline: '', phd_research_title: '',
  scopus_publications: '', state_country: '', batch_id: 'batch_2024_A', status: 'submitted',
}

export default function ApplicantsPage() {
  const [items, setItems] = useState(null)
  const [batches, setBatches] = useState([])
  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const addToast = useUiStore((s) => s.addToast)
  useScrollLock(Boolean(selected || addOpen))

  useEffect(() => {
    Promise.all([getApplicants(), getBatches()]).then(([r, b]) => {
      setItems(r.data)
      setBatches(b.data)
    })
  }, [])

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
    const res = nextStatus === 'shortlisted'
      ? await shortlistApplicant(item.id)
      : await updateApplicantStatus(item.id, nextStatus)
    setItems((xs) => xs.map((x) => (x.id === item.id ? res.data : x)))
    setSelected(res.data)
    addToast({
      type: nextStatus === 'rejected' ? 'warning' : 'success',
      title: nextStatus === 'shortlisted'
        ? `${item.personal.full_name} has been shortlisted.`
        : `${item.personal.full_name} marked ${nextStatus.replaceAll('_', ' ')}.`,
    })
  }

  const convertToStudent = (item) => {
    addToast({ type: 'success', title: `${item.personal.full_name} converted to student. Credentials sent.` })
    setSelected(null)
  }

  const openAdd = () => { setForm(BLANK_FORM); setAddOpen(true) }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await createApplicant({
      batch_id: form.batch_id,
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
    { label: 'Total Applications', value: items.length, hint: '+12 this month', icon: UserPlus, tone: 'rose' },
    { label: 'Tests Completed', value: items.filter((a) => a.test_score).length, hint: 'Ready for review', icon: CheckCircle2, tone: 'green' },
    { label: 'Pending Test', value: items.filter((a) => a.status === 'test_pending').length, hint: 'Needs follow-up', icon: Clock3, tone: 'amber' },
    { label: 'Avg. Test Score', value: (() => { const scored = items.filter((a) => a.test_score); return scored.length ? `${Math.round(scored.reduce((s, a) => s + a.test_score, 0) / scored.length)}%` : '—' })(), hint: '+8% this cycle', icon: Award, tone: 'blue' },
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

      <div className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Applicant Review Queue</h2>
            <p className="text-sm text-[color:var(--secondary)]">{filtered.length} candidates shown</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex h-11 w-72 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4">
              <Search size={16} className="text-[color:var(--muted)]" />
              <input className="w-full bg-transparent text-sm outline-none" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicants" />
            </label>
          </div>
        </div>
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
                  <td className="text-[color:var(--secondary)]">{formatDate(a.applied_at)}</td>
                  <td className="text-[color:var(--secondary)]">{a.batch_id?.replace('batch_', 'Batch ').replace('_', '-')}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                        <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${a.test_score || 0}%` }} />
                      </div>
                      <span className="font-semibold text-[color:var(--text)]">{a.test_score ?? '-'}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><button className="rounded-full bg-[color:var(--accent-tint)] px-4 py-2 text-xs font-semibold text-[color:var(--accent)]" onClick={(e) => { e.stopPropagation(); setSelected(a) }}>Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail drawer ── */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-start justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Applicant Profile</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{selected.personal.full_name}</h2>
                <p className="mt-1 text-sm text-[color:var(--secondary)]">{selected.temp_id} · <StatusBadge status={selected.status} /></p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setSelected(null)}><XCircle size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-6">
              <DrawerSection title="Personal Information">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Info label="Email" value={selected.personal.email} />
                  <Info label="Mobile" value={selected.personal.mobile ?? selected.personal.phone} />
                  <Info label="State & Country" value={selected.personal.state_country ?? `${selected.personal.state}, ${selected.personal.country}`} />
                  <Info label="Applied On" value={formatDate(selected.applied_at)} />
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
                  <Info label="University" value={selected.academic.university} />
                </div>
                <div className="mt-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Research Statement</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--secondary)]">{selected.research_statement}</p>
                </div>
              </DrawerSection>

              <DrawerSection title="Test Result">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Info label="Test Score" value={selected.test_score != null ? `${selected.test_score} / ${selected.test_max_score}` : 'Not attempted'} />
                  <Info label="Test Submitted" value={selected.test_submitted_at ? formatDate(selected.test_submitted_at) : '—'} />
                </div>
                {selected.test_score != null && (
                  <div className="mt-3 rounded-3xl bg-[color:var(--surface)] p-4">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-[color:var(--secondary)]">Score</span>
                      <span className="text-[color:var(--text)]">{selected.test_score}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--border)]">
                      <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${selected.test_score}%` }} />
                    </div>
                  </div>
                )}
              </DrawerSection>
            </div>

            <div className="shrink-0 grid grid-cols-3 gap-2 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
              <button className="btn-primary inline-flex items-center justify-center gap-1.5 text-sm" onClick={() => act(selected, 'shortlisted')}>
                <UserCheck size={15} /> Shortlist
              </button>
              <button
                className="mobile-compact-button flex items-center justify-center gap-1.5 rounded-[14px] bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700"
                onClick={() => convertToStudent(selected)}
              >
                <GraduationCap size={15} /> To Student
              </button>
              <button className="mobile-compact-button flex items-center justify-center rounded-[14px] bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600" onClick={() => act(selected, 'rejected')}>
                Reject
              </button>
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
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setAddOpen(false)}><XCircle size={18} /></button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-5">
                <FormSection title="Personal Details">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="First Name" required><input className="input w-full" placeholder="First name" required {...field('first_name')} /></FormField>
                    <FormField label="Last Name" required><input className="input w-full" placeholder="Last name" required {...field('last_name')} /></FormField>
                    <FormField label="Email" required><input className="input w-full" type="email" placeholder="email@example.com" required {...field('email')} /></FormField>
                    <FormField label="Mobile"><input className="input w-full" placeholder="+91 XXXXX XXXXX" {...field('mobile')} /></FormField>
                    <FormField label="State & Country"><input className="input w-full" placeholder="Maharashtra, India" {...field('state_country')} /></FormField>
                  </div>
                </FormSection>

                <FormSection title="PhD Details">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Year of PhD Completion" required><input className="input w-full" type="number" min="1970" max="2026" placeholder="2020" required {...field('phd_completion_year')} /></FormField>
                    <FormField label="Discipline / Field" required><input className="input w-full" placeholder="e.g. Management" required {...field('phd_discipline')} /></FormField>
                  </div>
                  <FormField label="PhD Research Title" required>
                    <input className="input w-full" placeholder="Full title of your doctoral thesis" required {...field('phd_research_title')} />
                  </FormField>
                </FormSection>

                <FormSection title="Research Profile">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Scopus Publications"><input className="input w-full" type="number" min="0" placeholder="0" {...field('scopus_publications')} /></FormField>
                    <FormField label="Batch">
                      <select className="input w-full" {...field('batch_id')}>
                        {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{title}</p>
      {children}
    </div>
  )
}
