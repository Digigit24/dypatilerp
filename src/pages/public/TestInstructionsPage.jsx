import { AlertTriangle, BookOpen, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTestForTaking, startTest } from '../../api/services/testService.js'
import { useTestStore } from '../../store/testStore.js'

export default function TestInstructionsPage() {
  const { testId } = useParams()
  const navigate = useNavigate()

  const { testToken, testUser, setTest, setAttempt } = useTestStore()

  const [test, setLocalTest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!testToken) { navigate(`/test-login`, { replace: true }); return }
    loadTest()
  }, [testToken])

  const loadTest = async () => {
    setLoading(true)
    try {
      const res = await getTestForTaking(testId)
      setLocalTest(res.data)
      setTest(res.data)
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load test.')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    setStarting(true)
    try {
      const res = await startTest(testId)
      setAttempt(res.data)
      navigate(`/test/${testId}`, { replace: true })
    } catch (e) {
      // If attempt already exists, go straight to test
      if (e?.response?.status === 409 || e?.response?.data?.message?.includes('already')) {
        navigate(`/test/${testId}`, { replace: true })
        return
      }
      setError(e?.response?.data?.message || 'Failed to start test.')
      setStarting(false)
    }
  }

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
          <h2 className="text-lg font-semibold text-[color:var(--text)]">Error</h2>
          <p className="mt-2 text-sm text-[color:var(--secondary)]">{error}</p>
        </div>
      </div>
    )
  }

  const totalQ = test?.sections?.reduce((sum, s) => sum + (s.effective_question_count ?? s.questions?.length ?? 0), 0) || 0

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--bg)] p-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <img src="/logo-new.jpg" alt="DYPERF" className="h-12 w-auto rounded-2xl object-contain" />
      </div>

      <div className="w-full max-w-2xl">
        <div className="card p-8">
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[color:var(--accent-tint)] p-4">
            <BookOpen size={22} className="shrink-0 text-[color:var(--accent)]" />
            <div>
              <p className="text-xs text-[color:var(--secondary)]">Welcome, {testUser?.first_name}</p>
              <h1 className="text-lg font-bold text-[color:var(--text)]">{test?.title}</h1>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { icon: Clock, label: 'Duration', value: `${test?.duration_minutes} min` },
              { icon: BookOpen, label: 'Questions', value: totalQ },
              { icon: CheckCircle, label: 'Sections', value: test?.sections?.length || 0 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-center">
                <Icon size={20} className="mx-auto mb-1 text-[color:var(--accent)]" />
                <p className="text-lg font-bold text-[color:var(--text)]">{value}</p>
                <p className="text-xs text-[color:var(--secondary)]">{label}</p>
              </div>
            ))}
          </div>

          {/* Sections */}
          {test?.sections?.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-[color:var(--text)]">Test Sections</p>
              <div className="space-y-2">
                {test.sections.map((sec, idx) => (
                  <div key={sec.id} className="flex items-center gap-3 rounded-2xl bg-[color:var(--surface)] p-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[color:var(--accent-tint)] text-xs font-bold text-[color:var(--accent)]">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[color:var(--text)]">{sec.title}</p>
                    </div>
                    <span className="text-xs text-[color:var(--secondary)]">{sec.effective_question_count ?? sec.questions?.length ?? 0} Q</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {test?.instructions && (
            <div className="mb-6 rounded-2xl bg-amber-50 p-4">
              <p className="mb-2 text-sm font-semibold text-amber-800">Instructions</p>
              <div className="space-y-1">
                {test.instructions.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} className="text-sm text-amber-900">• {line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="mb-6 flex gap-3 rounded-2xl bg-red-50 p-4 text-red-800">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm">
              Once you click <strong>Start Test</strong>, the timer begins and cannot be paused.
              If you lose connection, you can re-login and resume — but the timer keeps running.
            </p>
          </div>

          <button
            onClick={handleStart}
            disabled={starting}
            className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3 text-base"
          >
            {starting ? <Loader2 size={18} className="animate-spin" /> : null}
            {starting ? 'Starting…' : 'Start Test'}
          </button>
        </div>
      </div>
    </div>
  )
}
