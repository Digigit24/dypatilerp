import {
  ChevronDown, ChevronRight, FilePlus2, Loader2,
  Plus, Save, Send, Trash2, Users, X, Copy, Eye, EyeOff, CheckCircle2, Mail, MailCheck,
  RefreshCw, Link2, Search, ExternalLink, ClipboardList,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  assignTest, createSection, createTest, deleteSection,
  getTests, publishTest, saveAllQuestions,
  updateSection, updateTest, getTestById,
  getAccessTokens, resetTestAttempt,
} from '../../api/services/testService.js'
import { getBatches } from '../../api/services/batchService.js'
import { getApplicants } from '../../api/services/applicantService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useCourseStore } from '../../store/courseStore.js'

// ── helpers ────────────────────────────────────────────────────────────────────
const OPTS = ['A', 'B', 'C', 'D']
const blankQ = (sectionId, order = 0) => ({
  _id: `new_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  question_text: '',
  question_type: 'mcq',
  marks: 1,
  order_index: order,
  section_id: sectionId,
  config: { options: OPTS.map((k) => ({ key: k, text: '' })), correct_answer: 'A' },
})

// ── Assign modal ───────────────────────────────────────────────────────────────
function AssignModal({ test, courseId: testCourseId, onClose, addToast }) {
  const [mode, setMode] = useState('course')   // 'course' | 'batch' | 'select'
  const [batchId, setBatchId] = useState('')
  const [batches, setBatches] = useState([])
  const [sendEmail, setSendEmail] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showPw, setShowPw] = useState(false)

  // Applicant selector state
  const [applicantList, setApplicantList] = useState([])
  const [applicantSearch, setApplicantSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loadingApplicants, setLoadingApplicants] = useState(false)

  useEffect(() => {
    getBatches({ course_id: testCourseId }).then((r) => setBatches(r.data || [])).catch(() => {})
  }, [testCourseId])

  useEffect(() => {
    if (mode !== 'select') return
    setLoadingApplicants(true)
    getApplicants({ course_id: testCourseId, limit: 500 })
      .then((r) => setApplicantList(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingApplicants(false))
  }, [mode, testCourseId])

  const filteredApplicants = applicantList.filter((a) => {
    const name = `${a.first_name ?? a.personal?.first_name ?? ''} ${a.last_name ?? a.personal?.last_name ?? ''}`.toLowerCase()
    const email = (a.email ?? a.personal?.email ?? '').toLowerCase()
    const q = applicantSearch.toLowerCase()
    return !q || name.includes(q) || email.includes(q)
  })

  const toggleApplicant = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const submit = async () => {
    setLoading(true)
    try {
      let payload = { send_email: sendEmail }
      if (mode === 'course') {
        payload = { ...payload, assign_all: true, course_id: testCourseId }
      } else if (mode === 'batch') {
        payload = { ...payload, assign_all: true, batch_id: batchId }
      } else {
        payload = { ...payload, applicant_ids: [...selectedIds] }
      }
      const res = await assignTest(test.id, payload)
      setResult(res.data)
      addToast({
        type: 'success',
        title: `Assigned to ${res.data.assigned_count} applicant(s)${sendEmail ? ` · ${res.data.emails_sent ?? 0} emails sent` : ''}`,
      })
    } catch (e) {
      addToast({ type: 'error', title: e?.response?.data?.message || 'Assignment failed' })
    } finally { setLoading(false) }
  }

  const copyAll = () => {
    if (!result?.credentials) return
    const text = result.credentials.map((c) =>
      `${c.name} | ${c.email} | Login: ${c.login_url} | u: ${c.username} | pw: ${c.password || '(existing)'}`
    ).join('\n')
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', title: 'All credentials copied!' })
  }

  const canSubmit = mode === 'course'
    || (mode === 'batch' && batchId)
    || (mode === 'select' && selectedIds.size > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-xl rounded-[28px] bg-[color:var(--card)] p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 text-[color:var(--secondary)]"><X size={20} /></button>
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Assign Test</h2>
        <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{test.title}</p>

        {!result ? (
          <div className="mt-4 space-y-4">
            {/* Mode selector */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'course', label: 'All in Course' },
                { key: 'batch',  label: 'By Batch' },
                { key: 'select', label: 'Select Applicants' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setMode(key)}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${mode === key ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--secondary)]'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Mode-specific input */}
            {mode === 'course' && (
              <div className="rounded-xl bg-[color:var(--surface)] p-3 text-sm text-[color:var(--secondary)]">
                Will assign to all applicants in this test&apos;s course with status <strong>submitted</strong>, <strong>test_pending</strong>, or <strong>approved</strong>.
              </div>
            )}
            {mode === 'batch' && (
              <select className="input w-full" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">Select batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            {mode === 'select' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--secondary)]" />
                  <input
                    className="input w-full pl-8 text-sm"
                    placeholder="Search by name or email…"
                    value={applicantSearch}
                    onChange={(e) => setApplicantSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-[color:var(--border)] divide-y divide-[color:var(--border)]">
                  {loadingApplicants && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 size={16} className="animate-spin text-[color:var(--secondary)]" />
                    </div>
                  )}
                  {!loadingApplicants && filteredApplicants.length === 0 && (
                    <p className="py-4 text-center text-xs text-[color:var(--secondary)]">No applicants found.</p>
                  )}
                  {filteredApplicants.map((a) => {
                    const id = a.id
                    const name = `${a.first_name ?? a.personal?.first_name ?? ''} ${a.last_name ?? a.personal?.last_name ?? ''}`.trim() || a.personal?.full_name || '—'
                    const email = a.email ?? a.personal?.email ?? ''
                    const checked = selectedIds.has(id)
                    return (
                      <label key={id} className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[color:var(--surface)] transition ${checked ? 'bg-[color:var(--accent-tint)]' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleApplicant(id)}
                          className="h-4 w-4 rounded accent-[color:var(--accent)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[color:var(--text)]">{name}</p>
                          <p className="truncate text-xs text-[color:var(--secondary)]">{email}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {selectedIds.size > 0 && (
                  <p className="text-xs font-semibold text-[color:var(--accent)]">{selectedIds.size} applicant{selectedIds.size > 1 ? 's' : ''} selected</p>
                )}
              </div>
            )}

            {/* Email toggle */}
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[color:var(--border)] px-3 py-2.5">
              <div
                onClick={() => setSendEmail((v) => !v)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition ${sendEmail ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${sendEmail ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">Send credentials via email</p>
                <p className="text-[11px] text-[color:var(--secondary)]">Each candidate receives their unique login link + username + password at <strong>postdoc@dyperf.com</strong></p>
              </div>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
              <button onClick={submit} disabled={loading || !canSubmit} className="btn-primary inline-flex items-center gap-2 text-sm">
                {loading ? <Loader2 size={14} className="animate-spin" /> : sendEmail ? <Mail size={14} /> : <Users size={14} />}
                {sendEmail ? 'Assign & Send Emails' : 'Assign Only'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="mb-3 flex gap-3">
              <div className="flex-1 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-center">
                <p className="text-lg font-bold text-emerald-700">{result.assigned_count}</p>
                <p className="text-[10px] text-emerald-600">Assigned</p>
              </div>
              {sendEmail && (
                <div className="flex-1 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-blue-700">{result.emails_sent ?? 0}</p>
                  <p className="text-[10px] text-blue-600">Emails Sent</p>
                </div>
              )}
            </div>

            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[color:var(--text)]">Credentials</span>
              <div className="flex gap-2">
                <button onClick={() => setShowPw((s) => !s)} className="text-xs text-[color:var(--secondary)] inline-flex items-center gap-1">
                  {showPw ? <EyeOff size={12} /> : <Eye size={12} />} {showPw ? 'Hide' : 'Show'} pw
                </button>
                <button onClick={copyAll} className="rounded-xl bg-[color:var(--accent-tint)] px-2 py-1 text-xs font-semibold text-[color:var(--accent)] inline-flex items-center gap-1">
                  <Copy size={12} /> Copy all
                </button>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {result.credentials?.map((c) => (
                <div key={c.applicant_id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[color:var(--text)] truncate">{c.name}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {c.email_sent && <MailCheck size={12} className="text-emerald-500" title="Email sent" />}
                    </div>
                  </div>
                  <span className="text-[color:var(--secondary)]">u: {c.username} · pw: {showPw ? (c.password || '(existing)') : '••••••'}</span>
                  <div className="mt-1 truncate">
                    <a href={c.login_url} target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent)] text-[10px] hover:underline truncate">{c.login_url}</a>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="btn-primary mt-3 w-full text-sm">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Compact question row ───────────────────────────────────────────────────────
function QuestionRow({ question, idx, onChange, onDelete, expanded, onToggle }) {
  const { config = {} } = question
  const options = config.options || OPTS.map((k) => ({ key: k, text: '' }))
  const correct = config.correct_answer || 'A'

  return (
    <div className="border-b border-[color:var(--border)] last:border-0">
      <div
        className="flex cursor-pointer items-start gap-2 px-3 py-2 hover:bg-[color:var(--surface)] transition"
        onClick={onToggle}
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[color:var(--surface)] text-[10px] font-bold text-[color:var(--secondary)]">
          {idx + 1}
        </span>
        <p className={`flex-1 text-sm ${question.question_text ? 'text-[color:var(--text)]' : 'italic text-[color:var(--secondary)]'}`}>
          {question.question_text || 'Empty question…'}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {question.question_text && (
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              {correct}✓
            </span>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-[color:var(--secondary)] hover:text-red-500">
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronDown size={14} className="text-[color:var(--secondary)]" /> : <ChevronRight size={14} className="text-[color:var(--secondary)]" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[color:var(--border)] bg-[color:var(--surface)] px-3 pb-3 pt-2">
          <textarea
            className="textarea w-full text-sm"
            rows={2}
            placeholder="Question text…"
            value={question.question_text}
            onChange={(e) => onChange({ question_text: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {options.map((opt) => (
              <label key={opt.key} className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="radio"
                  name={`c_${question._id || question.id}`}
                  checked={correct === opt.key}
                  onChange={() => onChange({ config: { ...config, correct_answer: opt.key } })}
                  className="accent-[color:var(--accent)] h-3 w-3 shrink-0"
                />
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[color:var(--card)] text-[10px] font-bold text-[color:var(--secondary)]">{opt.key}</span>
                <input
                  className="input h-7 flex-1 text-xs"
                  placeholder={`Option ${opt.key}`}
                  value={opt.text}
                  onChange={(e) => onChange({ config: { ...config, options: options.map((o) => o.key === opt.key ? { ...o, text: e.target.value } : o) } })}
                />
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-[color:var(--secondary)]">
              Marks
              <input type="number" className="input h-6 w-12 text-xs" min={0} value={question.marks}
                onChange={(e) => onChange({ marks: Number(e.target.value) })} />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TestBuilderPage() {
  const addToast = useUiStore((s) => s.addToast)
  const currentCourse = useCourseStore((s) => s.currentCourse)
  const navigate = useNavigate()

  const [tests, setTests] = useState(null)
  const [activeTestId, setActiveTestId] = useState(null)
  const [form, setForm] = useState(null)
  const [savingMeta, setSavingMeta] = useState(false)

  const [sections, setSections] = useState([])
  const [activeSectionId, setActiveSectionId] = useState(null)
  const [allQuestions, setAllQuestions] = useState([])
  const [savingQ, setSavingQ] = useState(false)
  const [expandedQ, setExpandedQ] = useState(null)
  const [showAssign, setShowAssign] = useState(false)

  // Tab: 'builder' | 'assigned'
  const [activeTab, setActiveTab] = useState('builder')

  // ── Assigned applicants panel ─────────────────────────────────────────────
  const [assigned, setAssigned]   = useState([])
  const [resetState, setResetState] = useState({})
  const [showPwFor, setShowPwFor]  = useState({})

  const activeTest = tests?.find((t) => t.id === activeTestId)

  useEffect(() => {
    setTests(null)
    setActiveTestId(null)
    setForm(null)
    setSections([])
    setAllQuestions([])
    const params = currentCourse ? { course_id: currentCourse.id } : {}
    getTests(params).then((r) => {
      const list = r.data || []
      setTests(list)
      if (list[0]) selectTest(list[0])
    })
  }, [currentCourse?.id])

  const selectTest = useCallback(async (test) => {
    setActiveTestId(test.id)
    setAssigned([])
    setResetState({})
    setShowPwFor({})
    setActiveTab('builder')
    setForm({
      title: test.title || '',
      instructions: test.instructions || '',
      duration_minutes: test.duration_minutes || 90,
      passing_marks: test.passing_marks || 60,
    })
    try {
      const testData = await getTestById(test.id)
      const t = testData.data
      const secs = t.sections || []
      setSections(secs)
      const qs = secs.flatMap((s) =>
        (s.questions || []).map((q) => ({ ...q, _id: q.id, config: q.config || { options: OPTS.map((k) => ({ key: k, text: '' })), correct_answer: 'A' } }))
      )
      setAllQuestions(qs)
      setActiveSectionId(secs[0]?.id || null)
      setExpandedQ(null)
    } catch {
      setSections([])
      setAllQuestions([])
    }
    if (test.status === 'published') {
      getAccessTokens(test.id).then((r) => setAssigned(r.data || [])).catch(() => {})
    }
  }, [])

  const loadAssigned = (testId) =>
    getAccessTokens(testId).then((r) => setAssigned(r.data || [])).catch(() => {})

  const handleReset = async (applicantId, sendEmail) => {
    setResetState((s) => ({ ...s, [applicantId]: { loading: true, result: null } }))
    try {
      const res = await resetTestAttempt(activeTestId, { applicant_id: applicantId, send_email: sendEmail })
      setResetState((s) => ({ ...s, [applicantId]: { loading: false, result: res.data } }))
      setShowPwFor((s) => ({ ...s, [applicantId]: true }))
      loadAssigned(activeTestId)
      addToast({ type: 'success', title: `Reset done${sendEmail ? ' · email sent' : ''}` })
    } catch (e) {
      setResetState((s) => ({ ...s, [applicantId]: { loading: false, result: null } }))
      addToast({ type: 'error', title: e?.response?.data?.message || 'Reset failed' })
    }
  }

  const saveMeta = async () => {
    setSavingMeta(true)
    try {
      const res = await updateTest(activeTestId, form)
      setTests((xs) => xs.map((t) => (t.id === activeTestId ? { ...t, ...res.data } : t)))
      addToast({ type: 'success', title: 'Saved' })
    } catch (e) {
      addToast({ type: 'error', title: e?.response?.data?.message || 'Save failed' })
    } finally { setSavingMeta(false) }
  }

  const publish = async () => {
    try {
      const res = await publishTest(activeTestId)
      setTests((xs) => xs.map((t) => (t.id === activeTestId ? { ...t, ...res.data } : t)))
      addToast({ type: 'success', title: 'Test published!' })
    } catch (e) {
      addToast({ type: 'error', title: e?.response?.data?.message || 'Publish failed' })
    }
  }

  const newTest = async () => {
    const res = await createTest({
      title: 'Untitled Entrance Test',
      course_id: currentCourse?.id || null,
      instructions: 'Read all questions carefully before answering.',
      duration_minutes: 90,
      passing_marks: 60,
    })
    setTests((xs) => [res.data, ...(xs || [])])
    selectTest(res.data)
    addToast({ type: 'success', title: 'New test created' })
  }

  const addSection = async () => {
    const res = await createSection(activeTestId, { title: `Section ${sections.length + 1}` })
    setSections((xs) => [...xs, { ...res.data, questions: [] }])
    setActiveSectionId(res.data.id)
  }

  const removeSection = async (sectionId) => {
    if (!confirm('Delete section? Questions inside will be unlinked.')) return
    await deleteSection(activeTestId, sectionId)
    setSections((xs) => xs.filter((s) => s.id !== sectionId))
    setAllQuestions((qs) => qs.filter((q) => q.section_id !== sectionId))
    if (activeSectionId === sectionId) setActiveSectionId(sections.find((s) => s.id !== sectionId)?.id || null)
  }

  const sectionQs = allQuestions.filter((q) => q.section_id === activeSectionId)

  const addQuestion = () => {
    if (!activeSectionId) return
    const q = blankQ(activeSectionId, sectionQs.length)
    setAllQuestions((qs) => [...qs, q])
    setExpandedQ(q._id)
  }

  const patchQ = (qId, patch) =>
    setAllQuestions((qs) => qs.map((q) => (q._id || q.id) === qId ? { ...q, ...patch } : q))

  const deleteQ = (qId) => {
    setAllQuestions((qs) => qs.filter((q) => (q._id || q.id) !== qId))
    if (expandedQ === qId) setExpandedQ(null)
  }

  const saveQuestions = async () => {
    setSavingQ(true)
    try {
      const payload = allQuestions.map((q, i) => ({
        id: q.id || undefined,
        section_id: q.section_id,
        question_text: q.question_text,
        question_type: q.question_type || 'mcq',
        marks: q.marks || 1,
        order_index: i,
        config: q.config,
      }))
      await saveAllQuestions(activeTestId, payload)
      await selectTest(activeTest)
      addToast({ type: 'success', title: `${payload.length} questions saved` })
    } catch (e) {
      addToast({ type: 'error', title: e?.response?.data?.message || 'Save failed' })
    } finally { setSavingQ(false) }
  }

  if (!tests) return <SkeletonCard />

  return (
    <div className="fade-page">
      <PageHeader
        title="Test Builder"
        subtitle={currentCourse ? `Course: ${currentCourse.name}` : 'All courses'}
        action={
          <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={newTest}>
            <FilePlus2 size={16} /> New Test
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        {/* ── Test list ── */}
        <aside className="card p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--secondary)]">
            Tests {currentCourse ? `· ${currentCourse.name}` : ''}
          </p>
          <div className="space-y-1.5">
            {tests.length === 0 && <p className="py-4 text-center text-xs text-[color:var(--secondary)]">No tests yet.</p>}
            {tests.map((test) => (
              <button
                key={test.id}
                onClick={() => selectTest(test)}
                className={`w-full rounded-xl border p-2.5 text-left transition ${
                  activeTestId === test.id
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]'
                    : 'border-[color:var(--border)] hover:border-[color:var(--accent)]'
                }`}
              >
                <p className="truncate text-xs font-semibold text-[color:var(--text)]">{test.title}</p>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="text-[10px] text-[color:var(--secondary)]">{test.duration_minutes}min · {test.question_count ?? 0}q</span>
                  <StatusBadge status={test.status} />
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Editor ── */}
        {form && activeTest ? (
          <div className="space-y-4">
            {/* ── Tab bar ── */}
            <div className="flex gap-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1 w-fit">
              <button
                onClick={() => setActiveTab('builder')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold transition ${activeTab === 'builder' ? 'bg-[color:var(--card)] text-[color:var(--text)] shadow-sm' : 'text-[color:var(--secondary)] hover:text-[color:var(--text)]'}`}
              >
                <ClipboardList size={14} /> Builder
              </button>
              {activeTest.status === 'published' && (
                <button
                  onClick={() => { setActiveTab('assigned'); loadAssigned(activeTest.id) }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold transition ${activeTab === 'assigned' ? 'bg-[color:var(--card)] text-[color:var(--text)] shadow-sm' : 'text-[color:var(--secondary)] hover:text-[color:var(--text)]'}`}
                >
                  <Users size={14} /> Assigned
                  {assigned.length > 0 && (
                    <span className="ml-1 rounded-full bg-[color:var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">{assigned.length}</span>
                  )}
                </button>
              )}
            </div>

            {/* ── BUILDER TAB ── */}
            {activeTab === 'builder' && (
              <>
                {/* Metadata bar */}
                <div className="card p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <input
                        className="input w-full font-semibold"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Test title"
                      />
                    </div>
                    <input
                      className="input w-24 text-sm"
                      type="number"
                      title="Duration (min)"
                      placeholder="Min"
                      value={form.duration_minutes}
                      onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                    />
                    <input
                      className="input w-20 text-sm"
                      type="number"
                      title="Passing marks"
                      placeholder="Pass"
                      value={form.passing_marks}
                      onChange={(e) => setForm((f) => ({ ...f, passing_marks: Number(e.target.value) }))}
                    />
                    <StatusBadge status={activeTest.status} />
                  </div>
                  <textarea
                    className="textarea mt-3 h-16 w-full text-sm"
                    placeholder="Instructions (shown on test start page)…"
                    value={form.instructions}
                    onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={saveMeta} disabled={savingMeta} className="btn-primary inline-flex items-center gap-1.5 text-sm">
                      {savingMeta ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                    </button>
                    {activeTest.status === 'draft' && (
                      <button onClick={publish} className="inline-flex items-center gap-1.5 rounded-[14px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                        <Send size={13} /> Publish
                      </button>
                    )}
                    {activeTest.status === 'published' && (
                      <button onClick={() => setShowAssign(true)} className="inline-flex items-center gap-1.5 rounded-[14px] bg-[color:var(--accent-tint)] px-3 py-2 text-sm font-semibold text-[color:var(--accent)]">
                        <Users size={13} /> Assign to Applicants
                      </button>
                    )}
                  </div>

                  {/* Published link banner */}
                  {activeTest.status === 'published' && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-emerald-800">Test is Live</p>
                          <p className="mt-0.5 text-[11px] text-emerald-700">
                            Each candidate receives a unique login link when you assign the test. Copy the base URL below to include in emails.
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <code className="flex-1 truncate rounded-lg bg-white/70 px-2 py-1 text-[11px] font-mono text-emerald-900 border border-emerald-200">
                              {window.location.origin}/test-login
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/test-login`)
                                addToast({ type: 'success', title: 'Link copied!' })
                              }}
                              className="shrink-0 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 inline-flex items-center gap-1"
                            >
                              <Copy size={11} /> Copy
                            </button>
                          </div>
                          <p className="mt-1.5 text-[10px] text-emerald-600">
                            Full link format: <span className="font-mono">/test-login?token=&lt;unique_token&gt;</span> — generated per candidate when you click &quot;Assign to Applicants&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sections + Questions */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="card p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--secondary)]">Sections</span>
                      <button onClick={addSection} className="text-[color:var(--accent)] hover:opacity-70"><Plus size={15} /></button>
                    </div>
                    <div className="space-y-1">
                      {sections.map((sec) => (
                        <div key={sec.id} className="flex items-center gap-1">
                          <button
                            onClick={() => setActiveSectionId(sec.id)}
                            className={`flex-1 truncate rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition ${
                              activeSectionId === sec.id ? 'bg-[color:var(--accent)] text-white' : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'
                            }`}
                          >
                            {sec.title}
                            <span className="ml-1 opacity-70">({allQuestions.filter((q) => q.section_id === sec.id).length})</span>
                          </button>
                          <button onClick={() => removeSection(sec.id)} className="shrink-0 text-[color:var(--secondary)] hover:text-red-500"><X size={12} /></button>
                        </div>
                      ))}
                      {sections.length === 0 && <p className="py-2 text-center text-[10px] text-[color:var(--secondary)]">No sections</p>}
                    </div>
                  </div>

                  <div className="card overflow-hidden p-0">
                    {activeSectionId && (
                      <div className="flex items-center gap-3 border-b border-[color:var(--border)] px-4 py-2">
                        <input
                          className="flex-1 bg-transparent text-sm font-semibold text-[color:var(--text)] outline-none"
                          value={sections.find((s) => s.id === activeSectionId)?.title || ''}
                          onChange={(e) => setSections((xs) => xs.map((s) => s.id === activeSectionId ? { ...s, title: e.target.value } : s))}
                          onBlur={(e) => updateSection(activeTestId, activeSectionId, { title: e.target.value })}
                        />
                        <span className="text-xs text-[color:var(--secondary)]">{sectionQs.length} questions</span>
                      </div>
                    )}

                    <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
                      {sectionQs.length === 0 && activeSectionId && (
                        <p className="py-8 text-center text-sm text-[color:var(--secondary)]">No questions. Add one below.</p>
                      )}
                      {!activeSectionId && (
                        <p className="py-8 text-center text-sm text-[color:var(--secondary)]">Select or create a section.</p>
                      )}
                      {sectionQs.map((q, idx) => (
                        <QuestionRow
                          key={q._id || q.id}
                          question={q}
                          idx={idx}
                          expanded={expandedQ === (q._id || q.id)}
                          onToggle={() => setExpandedQ((cur) => cur === (q._id || q.id) ? null : (q._id || q.id))}
                          onChange={(patch) => patchQ(q._id || q.id, patch)}
                          onDelete={() => deleteQ(q._id || q.id)}
                        />
                      ))}
                    </div>

                    {activeSectionId && (
                      <div className="flex items-center gap-2 border-t border-[color:var(--border)] p-3">
                        <button
                          onClick={addQuestion}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                        >
                          <Plus size={13} /> Add Question
                        </button>
                        <button onClick={saveQuestions} disabled={savingQ} className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3">
                          {savingQ ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                          Save {sectionQs.length > 0 ? `(${sectionQs.length})` : ''}
                        </button>
                        <span className="ml-auto text-xs text-[color:var(--secondary)]">
                          Total: {allQuestions.length}q
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── ASSIGNED TAB ── */}
            {activeTab === 'assigned' && (
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">Assigned Applicants</p>
                    <p className="text-[11px] text-[color:var(--secondary)]">
                      Reset a candidate&apos;s attempt to let them retake. View responses for submitted candidates.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAssign(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)]"
                    >
                      <Users size={13} /> Assign More
                    </button>
                    <button
                      onClick={() => loadAssigned(activeTest.id)}
                      className="shrink-0 rounded-xl border border-[color:var(--border)] p-1.5 text-[color:var(--secondary)] hover:text-[color:var(--accent)]"
                      title="Refresh list"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                {assigned.length === 0 ? (
                  <p className="py-4 text-center text-xs text-[color:var(--secondary)]">
                    No applicants assigned yet. Click &quot;Assign More&quot; above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assigned.map((row) => {
                      const rs = resetState[row.applicant_id] || {}
                      const showPw = showPwFor[row.applicant_id]
                      const fresh = rs.result
                      const attemptBadgeColor =
                        row.attempt_status === 'submitted'   ? 'bg-emerald-100 text-emerald-700' :
                        row.attempt_status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                                               'bg-[color:var(--surface)] text-[color:var(--secondary)]'
                      return (
                        <div key={row.applicant_id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                          <div className="flex flex-wrap items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold text-[color:var(--text)]">
                                {row.first_name} {row.last_name}
                              </p>
                              <p className="truncate text-xs text-[color:var(--secondary)]">{row.email}</p>
                            </div>
                            <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${attemptBadgeColor}`}>
                              {row.attempt_status || 'not started'}
                            </span>
                            {row.attempt_status === 'submitted' && row.score != null && (
                              <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                Score: {row.score}
                              </span>
                            )}
                          </div>

                          {/* Fresh credentials after reset */}
                          {fresh && (
                            <div className="mt-2 rounded-xl bg-[color:var(--card)] border border-[color:var(--border)] px-3 py-2 text-xs space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[color:var(--secondary)]">u:</span>
                                <span className="font-mono text-[color:var(--text)]">{fresh.username}</span>
                                <span className="text-[color:var(--secondary)]">pw:</span>
                                <span className="font-mono text-[color:var(--text)]">
                                  {showPw ? fresh.password : '••••••••'}
                                </span>
                                <button onClick={() => setShowPwFor((s) => ({ ...s, [row.applicant_id]: !s[row.applicant_id] }))}>
                                  {showPw ? <EyeOff size={11} className="text-[color:var(--secondary)]" /> : <Eye size={11} className="text-[color:var(--secondary)]" />}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 min-w-0">
                                <Link2 size={11} className="shrink-0 text-[color:var(--secondary)]" />
                                <a
                                  href={fresh.login_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate font-mono text-[10px] text-[color:var(--accent)] hover:underline"
                                >
                                  {fresh.login_url}
                                </a>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(fresh.login_url); addToast({ type: 'success', title: 'Link copied!' }) }}
                                  className="shrink-0"
                                >
                                  <Copy size={11} className="text-[color:var(--secondary)]" />
                                </button>
                                {fresh.email_sent && <MailCheck size={11} className="shrink-0 text-emerald-500" title="Email sent" />}
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {row.attempt_status === 'submitted' && (
                              <button
                                onClick={() => navigate(`/admin/applicants/${row.applicant_id}/test-results?testId=${activeTestId}`)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                <ExternalLink size={12} /> View Responses
                              </button>
                            )}
                            <button
                              onClick={() => handleReset(row.applicant_id, true)}
                              disabled={rs.loading}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:opacity-80 disabled:opacity-50"
                            >
                              {rs.loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                              Reset &amp; Resend Email
                            </button>
                            <button
                              onClick={() => handleReset(row.applicant_id, false)}
                              disabled={rs.loading}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:text-[color:var(--text)] disabled:opacity-50"
                            >
                              {rs.loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                              Reset Only
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="card flex items-center justify-center p-12">
            <p className="text-sm text-[color:var(--secondary)]">Select a test or create a new one.</p>
          </div>
        )}
      </div>

      {showAssign && activeTest && (
        <AssignModal
          test={activeTest}
          courseId={activeTest.course_id}
          onClose={() => { setShowAssign(false); loadAssigned(activeTest.id) }}
          addToast={addToast}
        />
      )}
    </div>
  )
}
