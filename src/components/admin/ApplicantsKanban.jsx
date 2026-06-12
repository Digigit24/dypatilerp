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
  ArrowRight, CheckCircle2, GraduationCap, Loader2, Mail, RefreshCw, RotateCcw, Send, X, XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { assignTest, getTests, resetTestAttempt } from '../../api/services/testService.js'
import { convertToStudent, updateApplicantStatus } from '../../api/services/applicantService.js'
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

export default function ApplicantsKanban({ items, courseId, batches, onSelect, onChanged }) {
  const addToast = useUiStore((s) => s.addToast)
  const labels = useLabels()
  const [busyId, setBusyId] = useState(null)
  const [modal, setModal] = useState(null) // {type:'send'|'reset'|'convert', applicant}

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.key, []]))
    for (const a of items) (map[a.status] || (map[a.status] = [])).push(a)
    return map
  }, [items])

  const act = async (a, status, successMsg) => {
    setBusyId(a.id)
    try {
      await updateApplicantStatus(a.id, status)
      addToast({ type: status === 'rejected' ? 'warning' : 'success', title: successMsg || `Moved to ${status.replaceAll('_', ' ')}.` })
      onChanged()
    } catch (err) {
      addToast({ type: 'error', title: 'Action failed', message: err.response?.data?.message })
    } finally { setBusyId(null) }
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
                <span className="ml-auto rounded-full bg-[color:var(--card)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--muted)]">{cards.length}</span>
              </div>

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
function KanbanCard({ a, col, busy, labels, onOpen, onAct, onSendTest, onReset, onConvert }) {
  const p = passInfo(a)
  const name = a.personal?.full_name || `${a.first_name} ${a.last_name}`

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-2.5 transition hover:border-[color:var(--accent)] hover:shadow-sm">
      <button onClick={onOpen} className="block w-full text-left">
        <p className="truncate text-[13px] font-semibold text-[color:var(--text)]">{name}</p>
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
          <Btn onClick={onReset}><RefreshCw size={11} /> Reset & Resend</Btn>
        )}
        {!busy && col === 'test_completed' && (
          <>
            <Btn primary onClick={() => onAct(a, 'shortlisted', `${name} moved to final shortlist.`)}>
              <ArrowRight size={11} /> Final Shortlist
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

function Btn({ primary, onClick, children }) {
  return (
    <button
      onClick={onClick}
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
