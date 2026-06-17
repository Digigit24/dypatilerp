import {
  Code2, Eye, Loader2, Mail, RotateCcw, Save, Search, Tag,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { useUiStore } from '../../store/uiStore.js'
import {
  listTemplates, previewTemplate, resetTemplate, saveTemplate,
} from '../../api/services/emailTemplateService.js'

const AUDIENCE_STYLES = {
  Applicant: 'bg-sky-100 text-sky-700',
  Staff: 'bg-violet-100 text-violet-700',
  Scholar: 'bg-emerald-100 text-emerald-700',
}

export default function EmailTemplatesPage() {
  const addToast = useUiStore((s) => s.addToast)

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState(null)

  // Editor draft
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Preview
  const [preview, setPreview] = useState({ subject: '', html: '' })
  const [previewing, setPreviewing] = useState(false)
  const [tab, setTab] = useState('preview') // 'preview' | 'html'

  const subjectRef = useRef(null)
  const bodyRef = useRef(null)
  const lastFocused = useRef('body')

  const selected = useMemo(
    () => templates.find((t) => t.key === selectedKey) || null,
    [templates, selectedKey]
  )

  const selectTemplate = (t) => {
    setSelectedKey(t.key)
    setSubject(t.effective.subject)
    setBody(t.effective.body)
    setDirty(false)
    setTab('preview')
  }

  // ── Load list ──────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const { data } = await listTemplates()
      setTemplates(data)
      if (data.length && !selectedKey) selectTemplate(data[0])
    } catch {
      addToast({ type: 'error', title: 'Failed to load email templates' })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onPick = (t) => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    selectTemplate(t)
  }

  // ── Live preview (debounced) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedKey) return
    setPreviewing(true)
    const id = setTimeout(async () => {
      try {
        const { data } = await previewTemplate(selectedKey, { subject, body })
        setPreview(data)
      } catch {
        /* preview is best-effort */
      } finally {
        setPreviewing(false)
      }
    }, 450)
    return () => clearTimeout(id)
  }, [selectedKey, subject, body])

  // ── Insert variable at cursor of last-focused field ──────────────────────────
  const insertVariable = (name) => {
    const token = `{{${name}}}`
    const ref = lastFocused.current === 'subject' ? subjectRef : bodyRef
    const setter = lastFocused.current === 'subject' ? setSubject : setBody
    const value = lastFocused.current === 'subject' ? subject : body
    const el = ref.current
    if (!el) { setter(value + token); setDirty(true); return }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + token + value.slice(end)
    setter(next)
    setDirty(true)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  // ── Save / reset ─────────────────────────────────────────────────────────────
  const onSave = async () => {
    if (!selected) return
    if (!subject.trim() || !body.trim()) {
      addToast({ type: 'error', title: 'Subject and body cannot be empty' })
      return
    }
    setSaving(true)
    try {
      const { data } = await saveTemplate(selected.key, { subject, body })
      setTemplates((prev) => prev.map((t) => (t.key === data.key ? data : t)))
      setDirty(false)
      addToast({ type: 'success', title: `Saved "${selected.label}"` })
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to save template', message: e?.response?.data?.message })
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!selected) return
    if (!window.confirm(`Reset "${selected.label}" to the built-in default? This removes your customizations.`)) return
    setResetting(true)
    try {
      const { data } = await resetTemplate(selected.key)
      setTemplates((prev) => prev.map((t) => (t.key === data.key ? data : t)))
      setSubject(data.effective.subject)
      setBody(data.effective.body)
      setDirty(false)
      addToast({ type: 'success', title: `Reset "${selected.label}" to default` })
    } catch {
      addToast({ type: 'error', title: 'Failed to reset template' })
    } finally {
      setResetting(false)
    }
  }

  // ── Grouped + filtered list ──────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = templates.filter(
      (t) => !q || t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.key.includes(q)
    )
    const map = new Map()
    for (const t of filtered) {
      if (!map.has(t.category)) map.set(t.category, [])
      map.get(t.category).push(t)
    }
    return [...map.entries()]
  }, [templates, search])

  return (
    <div>
      <PageHeader
        title="Email Templates"
        subtitle="View, edit and save the transactional emails your portal sends. Use {{variables}} for personalized values."
      />

      {loading ? (
        <div className="grid h-64 place-items-center text-[color:var(--secondary)]">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          {/* ── Left: template list ── */}
          <aside className="card flex flex-col p-4">
            <div className="relative mb-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] py-2 pl-9 pr-3 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--accent)]"
              />
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto pr-1" style={{ maxHeight: '70vh' }}>
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{category}</p>
                  <div className="flex flex-col gap-1">
                    {items.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => onPick(t)}
                        className={`flex flex-col items-start gap-1 rounded-2xl px-3 py-2.5 text-left transition ${
                          t.key === selectedKey
                            ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]'
                            : 'hover:bg-[color:var(--surface)] text-[color:var(--text)]'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{t.label}</span>
                          {t.isCustomized && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Edited</span>
                          )}
                        </div>
                        <span className="text-xs text-[color:var(--secondary)] line-clamp-1">{t.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {grouped.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-[color:var(--secondary)]">No templates match your search.</p>
              )}
            </div>
          </aside>

          {/* ── Right: editor + preview ── */}
          {selected ? (
            <section className="flex flex-col gap-6">
              {/* Header row */}
              <div className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                      <Mail size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-[color:var(--text)]">{selected.label}</h2>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${AUDIENCE_STYLES[selected.audience] || 'bg-slate-100 text-slate-700'}`}>
                          {selected.audience}
                        </span>
                      </div>
                      <p className="mt-0.5 max-w-2xl text-sm text-[color:var(--secondary)]">{selected.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onReset}
                      disabled={resetting || !selected.isCustomized}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-[color:var(--border)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
                      title={selected.isCustomized ? 'Reset to built-in default' : 'No customizations to reset'}
                    >
                      {resetting ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Reset
                    </button>
                    <button
                      onClick={onSave}
                      disabled={saving || !dirty}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Editor */}
                <div className="card flex flex-col gap-4 p-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[color:var(--text)]">Subject</label>
                    <input
                      ref={subjectRef}
                      value={subject}
                      onFocus={() => { lastFocused.current = 'subject' }}
                      onChange={(e) => { setSubject(e.target.value); setDirty(true) }}
                      className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--accent)]"
                    />
                  </div>

                  {/* Variable chips */}
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[color:var(--text)]">
                      <Tag size={14} /> Variables <span className="font-normal text-[color:var(--muted)]">(click to insert)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.variables.map((v) => (
                        <button
                          key={v.name}
                          onClick={() => insertVariable(v.name)}
                          title={v.description}
                          className="rounded-lg bg-[color:var(--accent-tint)] px-2 py-1 font-mono text-xs font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white"
                        >
                          {`{{${v.name}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col">
                    <label className="mb-1.5 block text-sm font-semibold text-[color:var(--text)]">HTML Body</label>
                    <textarea
                      ref={bodyRef}
                      value={body}
                      onFocus={() => { lastFocused.current = 'body' }}
                      onChange={(e) => { setBody(e.target.value); setDirty(true) }}
                      spellCheck={false}
                      className="min-h-[360px] flex-1 resize-y rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 font-mono text-[13px] leading-relaxed text-[color:var(--text)] outline-none focus:border-[color:var(--accent)]"
                    />
                    <p className="mt-1.5 text-xs text-[color:var(--muted)]">
                      The body is wrapped in the standard branded email layout (header, footer, styles) automatically.
                    </p>
                  </div>
                </div>

                {/* Preview */}
                <div className="card flex flex-col p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex rounded-2xl border border-[color:var(--border)] p-0.5">
                      <button
                        onClick={() => setTab('preview')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${tab === 'preview' ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--secondary)]'}`}
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <button
                        onClick={() => setTab('html')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${tab === 'html' ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--secondary)]'}`}
                      >
                        <Code2 size={14} /> HTML
                      </button>
                    </div>
                    {previewing && <Loader2 size={15} className="animate-spin text-[color:var(--muted)]" />}
                  </div>

                  <div className="mb-3 rounded-2xl bg-[color:var(--surface)] px-3 py-2">
                    <p className="text-xs text-[color:var(--muted)]">Subject</p>
                    <p className="text-sm font-semibold text-[color:var(--text)]">{preview.subject || '—'}</p>
                  </div>

                  {tab === 'preview' ? (
                    <iframe
                      title="Email preview"
                      srcDoc={preview.html}
                      className="min-h-[420px] flex-1 rounded-2xl border border-[color:var(--border)] bg-white"
                    />
                  ) : (
                    <pre className="min-h-[420px] flex-1 overflow-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 font-mono text-[12px] leading-relaxed text-[color:var(--text)] whitespace-pre-wrap">
                      {preview.html}
                    </pre>
                  )}
                  <p className="mt-2 text-xs text-[color:var(--muted)]">Preview uses sample data for each variable.</p>
                </div>
              </div>
            </section>
          ) : (
            <div className="card grid h-64 place-items-center text-[color:var(--secondary)]">
              Select a template to edit.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
