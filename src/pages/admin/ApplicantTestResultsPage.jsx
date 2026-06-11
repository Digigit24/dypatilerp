import { ArrowLeft, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getApplicantTestResults, getTests } from '../../api/services/testService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'

function fmtDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export default function ApplicantTestResultsPage() {
  const { applicantId } = useParams()
  const [searchParams] = useSearchParams()
  const testIdParam = searchParams.get('testId')
  const navigate = useNavigate()

  const [tests, setTests] = useState(null)
  const [selectedTestId, setSelectedTestId] = useState(testIdParam || null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getTests().then((r) => setTests(r.data || []))
  }, [])

  useEffect(() => {
    if (selectedTestId && applicantId) loadResults(selectedTestId)
  }, [selectedTestId, applicantId])

  const loadResults = async (testId) => {
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const res = await getApplicantTestResults(testId, applicantId)
      setResults(res.data)
    } catch (e) {
      setError(e?.response?.data?.message || 'No test results found for this applicant.')
    } finally {
      setLoading(false)
    }
  }

  if (!tests) return <SkeletonCard />

  const attempt      = results?.attempt
  const allResponses = results?.responses || []
  const sectionScores = results?.section_scores || []

  // Group responses by section for display
  const responsesBySection = allResponses.reduce((acc, r) => {
    const key = r.section_title || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})
  const sectionKeys = Object.keys(responsesBySection)

  return (
    <div className="fade-page">
      <PageHeader
        title="Test Results"
        subtitle="View applicant responses and scores."
        action={
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:text-[color:var(--text)]"
          >
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      {/* Test selector */}
      {!testIdParam && (
        <div className="card mb-6 p-5">
          <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">Select Test</p>
          <div className="flex flex-wrap gap-2">
            {tests.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTestId(t.id)}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  selectedTestId === t.id
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)] text-[color:var(--accent)]'
                    : 'border-[color:var(--border)] text-[color:var(--secondary)]'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <SkeletonCard />}

      {error && (
        <div className="card p-8 text-center">
          <p className="text-[color:var(--secondary)]">{error}</p>
        </div>
      )}

      {results && attempt && (
        <>
          {/* Summary card */}
          <div className="card mb-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text)]">
                  {results.test?.title || 'Entrance Test'}
                </h2>
                <p className="text-sm text-[color:var(--secondary)]">
                  {attempt.first_name} {attempt.last_name} · {attempt.email}
                </p>
              </div>
              <StatusBadge status={attempt.status} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Total Score',      value: attempt.score != null ? `${attempt.score} / ${results.test?.total_marks ?? '—'}` : '—' },
                { label: 'Total Questions',  value: allResponses.length },
                { label: 'Correct',          value: allResponses.filter((r) => r.is_correct).length },
                { label: 'Incorrect',        value: allResponses.filter((r) => r.selected_option && !r.is_correct).length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-[color:var(--surface)] p-4 text-center">
                  <p className="text-2xl font-bold text-[color:var(--text)]">{value}</p>
                  <p className="text-xs text-[color:var(--secondary)]">{label}</p>
                </div>
              ))}
            </div>

            {/* Submitted time + time taken */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[color:var(--secondary)]">
              {attempt.submitted_at && (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-500" />
                  Submitted: {new Date(attempt.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              )}
              {attempt.time_taken_secs != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} className="text-[color:var(--accent)]" />
                  Time taken: {fmtDuration(attempt.time_taken_secs)}
                </span>
              )}
            </div>
          </div>

          {/* Section breakdown */}
          {sectionKeys.map((secTitle) => {
            const questions  = responsesBySection[secTitle]
            const secScore   = sectionScores.find((s) => s.section_title === secTitle)
            const correct    = questions.filter((q) => q.is_correct).length
            return (
              <div key={secTitle} className="card mb-4 overflow-hidden">
                <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-3">
                  <h3 className="font-semibold text-[color:var(--text)]">{secTitle}</h3>
                  <span className="text-sm text-[color:var(--secondary)]">
                    {correct}/{questions.length} correct
                    {secScore?.marks != null && ` · ${secScore.marks} marks`}
                  </span>
                </div>
                <div className="divide-y divide-[color:var(--border)]">
                  {questions.map((q, idx) => (
                    <div key={q.id || idx} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface)] text-xs font-bold text-[color:var(--secondary)]">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-[color:var(--text)]">{q.question_text}</p>
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {(q.config?.options || []).map((opt) => {
                              const isSelected = q.selected_option === opt.key
                              const isCorrect  = q.config?.correct_answer === opt.key
                              let cls = 'rounded-xl border px-3 py-2 text-xs '
                              if (isCorrect)               cls += 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold'
                              else if (isSelected)        cls += 'border-red-300 bg-red-50 text-red-700'
                              else                        cls += 'border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--secondary)]'
                              return (
                                <div key={opt.key} className={cls}>
                                  <span className="font-bold">{opt.key}.</span> {opt.text}
                                  {isSelected && !isCorrect && <span className="ml-1">✗</span>}
                                  {isCorrect && <span className="ml-1">✓</span>}
                                </div>
                              )
                            })}
                          </div>
                          {!q.selected_option && (
                            <p className="mt-2 text-xs text-amber-600">Not answered</p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {q.is_correct
                            ? <CheckCircle size={18} className="text-emerald-500" />
                            : q.selected_option
                            ? <XCircle size={18} className="text-red-400" />
                            : <span className="text-xs text-amber-500">—</span>
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {allResponses.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-[color:var(--secondary)]">No responses recorded for this attempt.</p>
            </div>
          )}
        </>
      )}

      {!loading && !error && !results && selectedTestId && (
        <div className="card p-8 text-center">
          <p className="text-[color:var(--secondary)]">No results yet for this test.</p>
        </div>
      )}
    </div>
  )
}
