import { FilePlus2, Plus, Save, Send, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createTest, getTestQuestions, getTests, publishTest, updateTest } from '../../api/services/testService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useUiStore } from '../../store/uiStore.js'

const blankQuestion = () => ({
  id: `q_${Date.now()}`,
  type: 'mcq',
  question_text: '',
  marks: 5,
  is_required: true,
  options: [
    { id: 'opt_a', text: 'Option A', is_correct: true },
    { id: 'opt_b', text: 'Option B', is_correct: false },
  ],
})

export default function TestBuilderPage() {
  const [tests, setTests] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [questions, setQuestions] = useState([])
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    getTests().then((r) => {
      setTests(r.data)
      if (r.data[0]) openTest(r.data[0])
    })
  }, [])

  const selected = useMemo(() => tests?.find((t) => t.id === selectedId), [tests, selectedId])

  const openTest = async (test) => {
    setSelectedId(test.id)
    setForm({ ...test })
    const q = await getTestQuestions(test.id)
    setQuestions(q.data.length ? q.data : [blankQuestion()])
  }

  const newTest = async () => {
    const draft = {
      title: 'Untitled Entrance Test',
      batch_id: 'batch_2024_A',
      duration_minutes: 60,
      total_marks: 100,
      passing_marks: 60,
      status: 'draft',
      instructions: 'Read all questions carefully before submitting.',
      created_by: 'usr_002',
    }
    const res = await createTest(draft)
    setTests((xs) => [res.data, ...(xs || [])])
    setSelectedId(res.data.id)
    setForm(res.data)
    setQuestions([blankQuestion()])
    addToast({ type: 'success', title: 'New draft test created' })
  }

  const save = async () => {
    const total = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0)
    const res = await updateTest(form.id, { ...form, total_marks: total || form.total_marks })
    setForm(res.data)
    setTests((xs) => xs.map((t) => (t.id === res.data.id ? res.data : t)))
    addToast({ type: 'success', title: 'Test details saved' })
  }

  const publish = async () => {
    const res = await publishTest(form.id)
    setForm(res.data)
    setTests((xs) => xs.map((t) => (t.id === res.data.id ? res.data : t)))
    addToast({ type: 'success', title: 'Test published' })
  }

  const updateQuestion = (id, patch) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const updateOption = (questionId, optionId, patch) => {
    setQuestions((qs) => qs.map((q) => q.id === questionId ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)) } : q))
  }

  if (!tests || !form) return <SkeletonCard />

  return (
    <div className="fade-page">
      <PageHeader
        title="Test Builder"
        subtitle="Create entrance tests, edit test details, and configure question types."
        action={<button className="btn-primary inline-flex items-center gap-2" onClick={newTest}><FilePlus2 size={17} /> Create New Test</button>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="card p-5">
          <h2 className="text-lg font-semibold text-[color:var(--text)]">Tests</h2>
          <div className="mt-4 space-y-3">
            {tests.map((test) => (
              <button
                key={test.id}
                className={`w-full rounded-3xl border p-4 text-left transition ${selectedId === test.id ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]' : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]'}`}
                onClick={() => openTest(test)}
              >
                <div className="safe-row items-start">
                  <p className="line-clamp-2 text-sm font-semibold text-[color:var(--text)]">{test.title}</p>
                  <StatusBadge status={test.status} />
                </div>
                <p className="mt-2 text-xs text-[color:var(--secondary)]">{test.duration_minutes} min · Passing {test.passing_marks}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="card p-6">
            <div className="safe-row items-start">
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--text)]">Test Details</h2>
                <p className="text-sm text-[color:var(--secondary)]">Editing {selected?.title}</p>
              </div>
              <StatusBadge status={form.status} />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="md:col-span-3"><span className="text-sm font-semibold">Test name</span><input className="input mt-2 w-full" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></label>
              <label><span className="text-sm font-semibold">Duration</span><input className="input mt-2 w-full" type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))} /></label>
              <label><span className="text-sm font-semibold">Passing marks</span><input className="input mt-2 w-full" type="number" value={form.passing_marks} onChange={(e) => setForm((f) => ({ ...f, passing_marks: Number(e.target.value) }))} /></label>
              <label><span className="text-sm font-semibold">Batch</span><input className="input mt-2 w-full" value={form.batch_id} onChange={(e) => setForm((f) => ({ ...f, batch_id: e.target.value }))} /></label>
              <label className="md:col-span-3"><span className="text-sm font-semibold">Instructions</span><textarea className="textarea mt-2 h-28 w-full" value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} /></label>
            </div>
            <div className="safe-actions mt-5">
              <button className="btn-primary inline-flex items-center gap-2" onClick={save}><Save size={17} /> Save Draft</button>
              <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={publish}><Send size={16} className="mr-2 inline" />Publish Test</button>
            </div>
          </div>

          <div className="card p-6">
            <div className="safe-row">
              <h2 className="text-xl font-semibold text-[color:var(--text)]">Questions</h2>
              <button className="rounded-2xl bg-[color:var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}><Plus size={16} className="mr-1 inline" />Add Question</button>
            </div>
            <div className="mt-5 space-y-5">
              {questions.map((q, idx) => (
                <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5" key={q.id}>
                  <div className="safe-row items-start">
                    <p className="font-semibold text-[color:var(--text)]">Question {idx + 1}</p>
                    <button className="text-red-500" onClick={() => setQuestions((qs) => qs.filter((item) => item.id !== q.id))}><Trash2 size={17} /></button>
                  </div>
                  <textarea className="textarea mt-3 h-24 w-full" value={q.question_text} onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })} placeholder="Question text" />
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <select className="input" value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value })}>
                      <option value="mcq">MCQ</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="long_answer">Long Answer</option>
                      <option value="true_false">True/False</option>
                      <option value="file_upload">File Upload</option>
                    </select>
                    <input className="input" type="number" value={q.marks} onChange={(e) => updateQuestion(q.id, { marks: Number(e.target.value) })} />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={q.is_required} onChange={(e) => updateQuestion(q.id, { is_required: e.target.checked })} /> Required</label>
                  </div>
                  {q.type === 'mcq' && (
                    <div className="mt-4 space-y-2">
                      {q.options.map((option) => (
                        <label className="flex items-center gap-3" key={option.id}>
                          <input type="radio" checked={option.is_correct} onChange={() => updateQuestion(q.id, { options: q.options.map((o) => ({ ...o, is_correct: o.id === option.id })) })} />
                          <input className="input min-h-11 flex-1" value={option.text} onChange={(e) => updateOption(q.id, option.id, { text: e.target.value })} />
                        </label>
                      ))}
                      <button className="text-sm font-semibold text-[color:var(--accent)]" onClick={() => updateQuestion(q.id, { options: [...q.options, { id: `opt_${Date.now()}`, text: 'New option', is_correct: false }] })}>+ Add option</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
