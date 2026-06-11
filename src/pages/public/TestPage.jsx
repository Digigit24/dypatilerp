import { AlertTriangle, CheckCircle, Clock, Loader2, Moon, Sun, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { autosaveResponses, getMyAttempt, getTestById, submitTest } from '../../api/services/testService.js'
import { useTestStore } from '../../store/testStore.js'
import { useUiStore } from '../../store/uiStore.js'

// ── Timer ──────────────────────────────────────────────────────────────────────
// Accepts the server-computed remaining seconds (time_remaining_secs from getMyAttempt).
// This is completely timezone-independent — no client-side date arithmetic at all.
function useCountdown(initialSeconds) {
  const [secondsLeft, setSecondsLeft] = useState(null)

  useEffect(() => {
    if (initialSeconds == null) return
    setSecondsLeft(initialSeconds)
    const id = setInterval(() => {
      setSecondsLeft((s) => (s != null && s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [initialSeconds])

  return secondsLeft
}

function formatTime(seconds) {
  if (seconds == null) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function TestPage() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  const { testToken, answers, setAnswer, setTest, setAttempt, clear } = useTestStore()

  const [test, setLocalTest] = useState(null)
  const [attempt, setLocalAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [offline, setOffline] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [activeSectionIdx, setActiveSectionIdx] = useState(0)
  const [activeQIdx, setActiveQIdx] = useState(0)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  const answersRef = useRef(answers)
  useEffect(() => { answersRef.current = answers }, [answers])

  // ── auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testToken) {
      // Try session storage
      const stored = sessionStorage.getItem('test_token')
      if (!stored) { navigate('/test-login', { replace: true }); return }
    }
    init()
  }, [])

  // ── online/offline ────────────────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  // ── load test + resume ────────────────────────────────────────────────────
  const init = async () => {
    setLoading(true)
    try {
      const [testRes, attemptRes] = await Promise.all([
        getTestById(testId),
        getMyAttempt(testId),
      ])
      const t = testRes.data
      const a = attemptRes.data

      setLocalTest(t)
      setTest(t)
      setLocalAttempt(a)
      setAttempt(a)

      if (!a) {
        // No active attempt — send back to instructions to create one
        navigate(`/test/${testId}/instructions`, { replace: true })
        return
      }
      if (a.status === 'submitted') { setSubmitted(true) }
    } catch (e) {
      if (e?.response?.status === 401) { navigate('/test-login', { replace: true }); return }
      setError(e?.response?.data?.message || 'Failed to load test.')
    } finally {
      setLoading(false)
    }
  }

  // ── timer ─────────────────────────────────────────────────────────────────
  const secondsLeft = useCountdown(attempt?.time_remaining_secs)

  // Auto-submit when timer runs out
  useEffect(() => {
    if (secondsLeft === 0 && !submitted && !submitting && test) {
      handleSubmit(true)
    }
  }, [secondsLeft])

  // ── autosave every 30s ────────────────────────────────────────────────────
  const doAutosave = useCallback(async () => {
    if (!testId || offline || submitted) return
    const responses = Object.entries(answersRef.current).map(([qId, opt]) => ({
      question_id: qId,
      selected_option: opt,
    }))
    if (!responses.length) return
    try {
      await autosaveResponses(testId, responses)
      setLastSaved(new Date())
    } catch { /* silent */ }
  }, [testId, offline, submitted])

  useEffect(() => {
    const id = setInterval(doAutosave, 30_000)
    return () => clearInterval(id)
  }, [doAutosave])

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (auto = false) => {
    setSubmitting(true)
    const responses = Object.entries(answersRef.current).map(([qId, opt]) => ({
      question_id: qId,
      selected_option: opt,
    }))
    try {
      await submitTest(testId, responses)
      setSubmitted(true)
      clear()
    } catch (e) {
      if (!auto) alert(e?.response?.data?.message || 'Submit failed.')
    } finally {
      setSubmitting(false)
      setShowSubmitConfirm(false)
    }
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const allSections = test?.sections || []
  const activeSection = allSections[activeSectionIdx]
  const sectionQs = activeSection?.questions || []
  const activeQuestion = sectionQs[activeQIdx]

  const allQuestions = allSections.flatMap((s) => s.questions || [])
  const answeredCount = allQuestions.filter((q) => answers[q.id]).length
  const unansweredCount = allQuestions.length - answeredCount

  // ── loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg)]">
        <Loader2 size={32} className="animate-spin text-[color:var(--accent)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg)] p-4">
        <div className="card max-w-md p-8 text-center">
          <AlertTriangle size={36} className="mx-auto mb-4 text-red-500" />
          <p className="text-[color:var(--text)]">{error}</p>
          <button onClick={() => navigate('/test-login', { replace: true })} className="btn-primary mt-4">
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg)] p-4">
        <div className="card max-w-md p-10 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
          <h1 className="text-2xl font-bold text-[color:var(--text)]">Test Submitted</h1>
          <p className="mt-2 text-[color:var(--secondary)]">
            Your responses have been recorded. You may close this window.
          </p>
          <p className="mt-4 text-sm text-[color:var(--secondary)]">
            Submitted at {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    )
  }

  const timerColor = secondsLeft != null && secondsLeft < 300 ? 'text-red-500' : 'text-[color:var(--text)]'

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)] text-[color:var(--text)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3">
        <img src="/logo-new.jpg" alt="DYPERF" className="h-9 w-auto rounded-xl object-contain" />
        <div className="flex-1 truncate">
          <p className="truncate text-sm font-semibold text-[color:var(--text)]">{test?.title}</p>
        </div>
        {offline && (
          <span className="inline-flex items-center gap-1 rounded-xl bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            <WifiOff size={13} /> Offline
          </span>
        )}
        {lastSaved && !offline && (
          <span className="hidden text-xs text-[color:var(--secondary)] sm:block">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
        <div className={`flex items-center gap-1.5 rounded-2xl bg-[color:var(--surface)] px-3 py-2 font-mono text-sm font-bold ${timerColor}`}>
          <Clock size={15} />
          {formatTime(secondsLeft)}
        </div>
        <button onClick={toggleTheme} className="theme-icon-button">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Section tabs */}
      {allSections.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2">
          {allSections.map((sec, idx) => {
            const secAnswered = (sec.questions || []).filter((q) => answers[q.id]).length
            return (
              <button
                key={sec.id}
                onClick={() => { setActiveSectionIdx(idx); setActiveQIdx(0) }}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeSectionIdx === idx
                    ? 'bg-[color:var(--accent)] text-white'
                    : 'bg-[color:var(--surface)] text-[color:var(--secondary)] hover:bg-[color:var(--accent-tint)]'
                }`}
              >
                {sec.title}
                <span className="ml-1.5 text-xs opacity-75">{secAnswered}/{sec.questions?.length || 0}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Question grid sidebar */}
        <aside className="hidden w-[200px] shrink-0 overflow-y-auto border-r border-[color:var(--border)] bg-[color:var(--card)] p-3 md:block">
          <p className="mb-2 text-xs font-semibold uppercase text-[color:var(--secondary)]">
            {activeSection?.title}
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {sectionQs.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setActiveQIdx(idx)}
                className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                  idx === activeQIdx
                    ? 'bg-[color:var(--accent)] text-white'
                    : answers[q.id]
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-xs text-[color:var(--secondary)]">
            <div className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-emerald-100" /> Answered</div>
            <div className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-[color:var(--surface)]" /> Not answered</div>
          </div>
        </aside>

        {/* Main question area */}
        <main className="flex flex-1 flex-col overflow-y-auto p-4 pb-24 md:p-8 md:pb-28">
          {activeQuestion ? (
            <>
              <p className="mb-2 text-sm text-[color:var(--secondary)]">
                Question {activeQIdx + 1} of {sectionQs.length}
                {allSections.length > 1 && ` · ${activeSection?.title}`}
              </p>
              <h2 className="text-lg font-semibold leading-relaxed text-[color:var(--text)] md:text-xl">
                {activeQuestion.question_text}
              </h2>

              <div className="mt-6 space-y-3">
                {(activeQuestion.config?.options || []).map((opt) => {
                  const selected = answers[activeQuestion.id] === opt.key
                  return (
                    <label
                      key={opt.key}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                        selected
                          ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]'
                          : 'border-[color:var(--border)] bg-[color:var(--card)] hover:border-[color:var(--accent)]'
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold transition ${
                        selected
                          ? 'border-[color:var(--accent)] bg-[color:var(--accent)] text-white'
                          : 'border-[color:var(--border)] text-[color:var(--secondary)]'
                      }`}>
                        {opt.key}
                      </div>
                      <span className="text-[color:var(--text)]">{opt.text}</span>
                      <input
                        type="radio"
                        className="sr-only"
                        checked={selected}
                        onChange={() => setAnswer(activeQuestion.id, opt.key)}
                      />
                    </label>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-[color:var(--secondary)]">No questions in this section.</p>
          )}
        </main>
      </div>

      {/* Bottom nav */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3">
        <div className="flex gap-2">
          <button
            className="rounded-2xl bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text)] disabled:opacity-40"
            disabled={activeQIdx === 0 && activeSectionIdx === 0}
            onClick={() => {
              if (activeQIdx > 0) { setActiveQIdx((i) => i - 1) }
              else if (activeSectionIdx > 0) { setActiveSectionIdx((i) => i - 1); setActiveQIdx(allSections[activeSectionIdx - 1]?.questions?.length - 1 || 0) }
            }}
          >
            ← Prev
          </button>
          <button
            className="rounded-2xl bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text)] disabled:opacity-40"
            disabled={activeQIdx === sectionQs.length - 1 && activeSectionIdx === allSections.length - 1}
            onClick={() => {
              if (activeQIdx < sectionQs.length - 1) { setActiveQIdx((i) => i + 1) }
              else if (activeSectionIdx < allSections.length - 1) { setActiveSectionIdx((i) => i + 1); setActiveQIdx(0) }
            }}
          >
            Next →
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[color:var(--secondary)]">
            {answeredCount}/{allQuestions.length} answered
          </span>
          <button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
            Submit Test
          </button>
        </div>
      </footer>

      {/* Submit confirm modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
            <h3 className="text-lg font-semibold text-[color:var(--text)]">Submit Test?</h3>
            <p className="mt-2 text-sm text-[color:var(--secondary)]">
              You have <strong>{unansweredCount}</strong> unanswered question{unansweredCount !== 1 ? 's' : ''}.
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="rounded-2xl bg-[color:var(--surface)] px-5 py-2.5 text-sm font-semibold">
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
