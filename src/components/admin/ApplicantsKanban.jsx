/**
 * Applicants Kanban — button-driven pipeline board (no drag & drop).
 *
 * Applied → Shortlisted for Test → Test Sent → Test Submitted (pass/fail)
 *   → Final Shortlist → Enrolled        (Rejected as a side column)
 *
 * Every stage exposes exactly the actions a teacher needs at that moment.
 * Clicking a card opens the same detail drawer used by the list view.
 */
import {
  ArrowRight, BellRing, CheckCircle2, GraduationCap, Loader2, Mail, RefreshCw, RotateCcw, Send, X, XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { assignTest, getTests, resetTestAttempt } from '../../api/services/testService.js'
import { convertToStudent, remindTest, updateApplicantStatus } from '../../api/services/applicantService.js'
import { useUiStore } from '../../store/uiStore.js'
import { useLabels } from '../../store/labelStore.js'
import { formatDate } from '../../lib/formatters.js'

const COLUMNS = [
  { key: 'submitted',        title: 'Applied',              dot: 'bg-slate-400' },
  { key: 'shortlisted_test', title: 'Shortlisted for Test', dot: 'bg-indigo-400' },
  { key: 'test_pending',     title: 'Test Sent',            dot: 'bg-amber-400' },
  { key: 'test_completed',   title: 'Test Submitted',       dot: 'bg-blue-400' },
  { key: 'shortlisted',      title: 'Final Shortlist',      dot: 'bg-violet-400' },
  { key: 'enrolled',         title: 'Enrolled',             dot: 'bg-emerald-500' },
  { key: 'rejected',         title: 'Rejected',             dot: 'bg-red-400' },
]

const passInfo = (a) => {
  if (a.test_score == null) return null
  const pass = a.test_passing_marks != null ? Number(a.test_score) >= Number(a.test_passing_marks) : null
  return { score: a.test_score, max: a.test_max_score, pass }
}

const timeAgo = (d) => {
  if (!d) return null
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (Number.isNaN(s)) return null
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function ApplicantsKanban({ items, courseId, batches, statusCounts, onSelect, onChanged, onOptimisticUpdate }) {
  const addToast = useUiStore((s) => s.addToast)
  const labels = useLabels()
  const [busyId, setBusyId] = useState(null)
  const [remindingAll, setRemindingAll] = useState(false)
  const [remindedMap, setRemindedMap] = useState({}) // applicant_id -> ISO timestamp (optimistic)
  const [modal, setModal] = useState(null) // {type:'send'|'reset'|'convert', applicant}

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.key, []]))
    for (const a of items) (map[a.status] || (map[a.status] = [])).push(a)
    return map
  }, [items])

  const act = async (a, status, successMsg) => {
    const prevStatus = a.status
    onOptimisticUpdate(a.id, { status }) // move card instantly
    setBusyId(a.id)
    try {
      const res = await updateApplicantStatus(a.id, status)
      // Final Shortlist auto-sends the registration-fee email — reflect whether
      // it actually went out instead of always claiming success.
      if (status === 'shortlisted') {
        const emailFailed = res.data?.shortlist_email && res.data.shortlist_email.sent === false
        addToast(emailFailed
          ? { type: 'warning', title: 'Candidate shortlisted, but payment email failed. Please retry or send manually.' }
          : { type: 'success', title: 'Candidate shortlisted and payment email sent.' })
      } else {
        addToast({ type: status === 'rejected' ? 'warning' : 'success', title: successMsg || `Moved to ${status.replaceAll('_', ' ')}.` })
      }
      onChanged() // silent background sync
    } catch (err) {
      onOptimisticUpdate(a.id, { status: prevStatus }) // rollback
      addToast({ type: 'error', title: 'Action failed', message: err.response?.data?.message })
    } finally { setBusyId(null) }
  }

  const remind = async (a) => {
    if (busyId) return // guard against double-fire
    const name = a.personal?.full_name || `${a.first_name} ${a.last_name}`
    const optimisticTs = new Date().toISOString()
    setRemindedMap((m) => ({ ...m, [a.id]: optimisticTs })) // optimistic timestamp
    setBusyId(a.id)
    try {
      const r = await remindTest(a.id)
      setRemindedMap((m) => ({ ...m, [a.id]: r.data?.last_reminded_at || optimisticTs }))
      addToast({ type: 'success', title: `Reminder emailed to ${name}.` })
    } catch (err) {
      setRemindedMap((m) => { const n = { ...m }; delete n[a.id]; return n }) // rollback
      addToast({ type: 'error', title: 'Reminder failed', message: err.response?.data?.message })
    } finally { setBusyId(null) }
  }

  // Remind everyone in the Test Sent column who hasn't started the exam yet.
  const remindAll = async (cards) => {
    const targets = cards.filter((a) => !a.test_in_progress)
    if (!targets.length) {
      addToast({ type: 'info', title: 'No one to remind — everyone here has already started.' })
      return
    }
    setRemindingAll(true)
    let sent = 0
    const stamps = {}
    for (const a of targets) {
      try { const r = await remindTest(a.id); stamps[a.id] = r.data?.last_reminded_at || new Date().toISOString(); sent++ } catch { /* keep going */ }
    }
    setRemindedMap((m) => ({ ...m, ...stamps }))
    setRemindingAll(false)
    addToast({
      type: sent ? 'success' : 'error',
      title: sent ? `Reminder emailed to ${sent} applicant${sent === 1 ? '' : 's'}.` : 'Could not send reminders.',
    })
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
        {COLUMNS.map((col) => {
          const cards = byStatus[col.key] || []
          return (
            <div key={col.key} className="w-[265px] shrink-0 rounded-2xl bg-[color:var(--surface)] p-2.5">
              {/* Column header */}
              <div className="mb-2 flex items-center gap-2 px-1.5">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--secondary)]">{col.title}</p>
                <span className="ml-auto rounded-full bg-[color:var(--card)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--muted)]">{statusCounts?.[col.key] ?? cards.length}</span>
              </div>

              {/* Bulk reminder for the Test Sent stage — nudges everyone who hasn't started */}
              {col.key === 'test_pending' && cards.some((a) => !a.test_in_progress) && (
                <button
                  onClick={() => remindAll(cards)}
                  disabled={remindingAll}
                  className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-100 px-2 py-1.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-200 disabled:opacity-50"
                  title="Email a reminder to everyone in this stage who hasn't started the exam"
                >
                  {remindingAll ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />} Remind All
                </button>
              )}

              {/* Cards */}
              <div className="max-h-[calc(100vh-330px)] space-y-2 overflow-y-auto pr-0.5">
                {cards.length === 0 && (
                  <p className="py-6 text-center text-[11px] text-[color:var(--muted)]">No applicants</p>
                )}
                {cards.map((a) => (
                  <KanbanCard
                    key={a.id}
                    a={a}
                    col={col.key}
                    busy={busyId === a.id}
                    labels={labels}
                    onOpen={() => onSelect(a)}
                    onAct={act}
                    onRemind={() => remind(a)}
                    remindedAt={remindedMap[a.id] || a.last_reminded_at}
                    onSendTest={() => setModal({ type: 'send', applicant: a })}
                    onReset={() => setModal({ type: 'reset', applicant: a })}
                    onConvert={() => setModal({ type: 'convert', applicant: a })}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {modal?.type === 'send' && (
        <TestPickerModal
          title="Send Test Link"
          cta="Send Test Link"
          icon={Mail}
          applicant={modal.applicant}
          courseId={courseId}
          onClose={() => setModal(null)}
          onConfirm={async (testId) => {
            const res = await assignTest(testId, { applicant_ids: [modal.applicant.id], send_email: true })
            onOptimisticUpdate(modal.applicant.id, { status: 'test_pending' })
            addToast({ type: 'success', title: `Test link emailed to ${modal.applicant.personal?.email || modal.applicant.email}.${res.data?.emails_sent ? '' : ' (email may have failed — check credentials in Test Builder)'}` })
            setModal(null)
            onChanged()
          }}
        />
      )}
      {modal?.type === 'reset' && (
        <TestPickerModal
          title="Reset & Resend Test Link"
          cta="Reset & Resend"
          icon={RefreshCw}
          note="This deletes the previous attempt, rotates the password and emails a fresh 5-day link."
          applicant={modal.applicant}
          courseId={courseId}
          onClose={() => setModal(null)}
          onConfirm={async (testId) => {
            await resetTestAttempt(testId, { applicant_id: modal.applicant.id, send_email: true })
            onOptimisticUpdate(modal.applicant.id, { status: 'test_pending', test_score: null, test_submitted_at: null })
            addToast({ type: 'success', title: 'Attempt reset — fresh link emailed.' })
            setModal(null)
            onChanged()
          }}
        />
      )}
      {modal?.type === 'convert' && (
        <ConvertModal
          applicant={modal.applicant}
          batches={batches}
          labels={labels}
          onClose={() => setModal(null)}
          onConfirm={async (batchId) => {
            const r = await convertToStudent(modal.applicant.id, batchId, { send_credentials: true })
            onOptimisticUpdate(modal.applicant.id, { status: 'enrolled' })
            addToast({
              type: 'success',
              title: r.data?.credentials_emailed
                ? `${modal.applicant.personal?.full_name} converted — login credentials emailed.`
                : `${modal.applicant.personal?.full_name} converted to ${labels.student.toLowerCase()}.`,
            })
            setModal(null)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

// ─── Compact card ───────────────────────────────────────────────────────────────
function KanbanCard({ a, col, busy, labels, onOpen, onAct, onRemind, remindedAt, onSendTest, onReset, onConvert }) {
  const p = passInfo(a)
  const name = a.personal?.full_name || `${a.first_name} ${a.last_name}`

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-2.5 transition hover:border-[color:var(--accent)] hover:shadow-sm">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13px] font-semibold text-[color:var(--text)]">{name}</p>
          {a.test_in_progress && (
            <span
              title="Currently taking the test"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-[color:var(--secondary)]">{a.personal?.email || a.email}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-[color:var(--muted)]">{formatDate(a.applied_at)}</span>
          {(a.batch_code || a.batch_name) && (
            <span className="rounded-full bg-[color:var(--accent-tint)] px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--accent)]">
              {a.batch_code || a.batch_name}
            </span>
          )}
          {p && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              p.pass === true ? 'bg-emerald-100 text-emerald-700'
              : p.pass === false ? 'bg-red-100 text-red-600'
              : 'bg-blue-50 text-blue-700'
            }`}>
              {p.score}{p.max ? `/${p.max}` : ''}{p.pass === true ? ' · Passed' : p.pass === false ? ' · Failed' : ''}
            </span>
          )}
        </div>
      </button>

      {/* Stage actions */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {busy && <Loader2 size={13} className="animate-spin text-[color:var(--accent)]" />}
        {!busy && col === 'submitted' && (
          <>
            <Btn primary onClick={() => onAct(a, 'shortlisted_test', `${name} shortlisted for test.`)}>
              <CheckCircle2 size={11} /> Shortlist for Test
            </Btn>
            <RejectBtn onClick={() => onAct(a, 'rejected')} />
          </>
        )}
        {!busy && col === 'shortlisted_test' && (
          <>
            <Btn primary onClick={onSendTest}><Send size={11} /> Send Test Link</Btn>
            <RejectBtn onClick={() => onAct(a, 'rejected')} />
          </>
        )}
        {!busy && col === 'test_pending' && (
          <>
            {!a.test_in_progress && (
              <Btn primary onClick={onRemind} title="Email a reminder — re-uses their original test link and credentials">
                <BellRing size={11} /> Remind
              </Btn>
            )}
            <Btn onClick={onReset}><RefreshCw size={11} /> Reset &amp; Resend</Btn>
            {remindedAt && (
              <span className="inline-flex w-full items-center gap-1 text-[10px] font-medium text-[color:var(--muted)]" title={`Last reminded: ${new Date(remindedAt).toLocaleString()}`}>
                <BellRing size={9} /> Reminded {timeAgo(remindedAt)}
              </span>
            )}
          </>
        )}
        {!busy && col === 'test_completed' && (
          <>
            <Btn primary onClick={() => onAct(a, 'shortlisted', `${name} moved to final shortlist.`)}>
              <ArrowRight size={11} /> Final Shortlist
            </Btn>
            <Btn onClick={onReset} title="Reset answers & email a fresh test link (for accidental submissions)">
              <RefreshCw size={11} /> Reset &amp; Resend
            </Btn>
            <RejectBtn onClick={() => onAct(a, 'rejected')} />
          </>
        )}
        {!busy && col === 'shortlisted' && (
          <Btn primary onClick={onConvert}>
            <GraduationCap size={11} /> Convert to {labels.student}
          </Btn>
        )}
        {!busy && col === 'rejected' && (
          <Btn onClick={() => onAct(a, 'submitted', `${name} moved back to Applied.`)}>
            <RotateCcw size={11} /> Reconsider
          </Btn>
        )}
      </div>
    </div>
  )
}

function Btn({ primary, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold transition ${
        primary
          ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white'
          : 'border border-[color:var(--border)] text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]'
      }`}
    >
      {children}
    </button>
  )
}

function RejectBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Reject"
      className="grid h-6 w-6 place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
      <X size={11} />
    </button>
  )
}

// ─── Test picker modal (send / reset) ───────────────────────────────────────────
function TestPickerModal({ title, cta, icon: Icon, note, applicant, courseId, onClose, onConfirm }) {
  const [tests, setTests] = useState(null)
  const [testId, setTestId] = useState('')
  const [busy, setBusy] = useState(false)
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    getTests({ course_id: courseId, status: 'published' }).then((r) => {
      const list = r.data || []
      setTests(list)
      if (list.length === 1) setTestId(list[0].id)
    }).catch(() => setTests([]))
  }, [courseId])

  const confirm = async () => {
    if (!testId) return
    setBusy(true)
    try { await onConfirm(testId) }
    catch (err) { addToast({ type: 'error', title: 'Failed', message: err.response?.data?.message || err.message }) }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[24px] bg-[color:var(--card)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">{title}</h2>
            <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
              {applicant.personal?.full_name} · {applicant.personal?.email || applicant.email}
            </p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--surface)]" onClick={onClose}><XCircle size={16} /></button>
        </div>

        {!tests ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[color:var(--accent)]" /></div>
        ) : tests.length === 0 ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">No published tests in this course. Publish a test in the Test Builder first.</p>
        ) : (
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-[color:var(--text)]">Test</span>
            <select className="input mt-1.5 w-full" value={testId} onChange={(e) => setTestId(e.target.value)}>
              <option value="">Select test…</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.duration_minutes} min</option>)}
            </select>
          </label>
        )}

        {note && <p className="mt-3 text-[11px] text-[color:var(--secondary)]">{note}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={onClose}>Cancel</button>
          <button className="btn-primary inline-flex items-center gap-2 text-sm" disabled={!testId || busy} onClick={confirm}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />} {cta}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Convert modal ──────────────────────────────────────────────────────────────
function ConvertModal({ applicant, batches, labels, onClose, onConfirm }) {
  // Default to the batch the applicant applied for, falling back to the first batch
  const appliedBatch = batches.find((b) => b.id === applicant.batch_id)
  const [batchId, setBatchId] = useState(appliedBatch?.id || batches[0]?.id || '')
  const [busy, setBusy] = useState(false)
  const addToast = useUiStore((s) => s.addToast)

  const confirm = async () => {
    if (!batchId) return
    setBusy(true)
    try { await onConfirm(batchId) }
    catch (err) { addToast({ type: 'error', title: 'Conversion failed', message: err.response?.data?.message || err.message }) }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[24px] bg-[color:var(--card)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Convert to {labels.student}</h2>
        <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
          {applicant.personal?.full_name} will be enrolled and get a {labels.student.toLowerCase()} account.
        </p>
        <p className="mt-3 rounded-xl border border-[color:var(--accent)] bg-[color:var(--accent-tint)] px-3 py-2.5 text-xs font-semibold text-[color:var(--accent)]">
          📧 An email with fresh login credentials (username + password) will be sent to the {labels.student.toLowerCase()} immediately after conversion.
        </p>
        <label className="mt-4 block">
          <span className="text-sm font-semibold text-[color:var(--text)]">Enroll into batch</span>
          <select className="input mt-1.5 w-full" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Select batch…</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.id === applicant.batch_id ? ' — applied for' : ''}</option>)}
          </select>
          {appliedBatch && (
            <p className="mt-1 text-[11px] text-[color:var(--secondary)]">
              Pre-selected: <strong>{appliedBatch.code || appliedBatch.name}</strong> — the batch this applicant applied for.
            </p>
          )}
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={onClose}>Cancel</button>
          <button className="btn-primary inline-flex items-center gap-2 text-sm" disabled={!batchId || busy} onClick={confirm}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />} Convert
          </button>
        </div>
      </div>
    </div>
  )
}
