/**
 * Email Sender — pick recipients (applicants + scholars), choose a broadcast-safe
 * template, preview the FINAL rendered email, confirm, and send.
 *
 * Reuses the existing services: exportApplicants / getStudents for contacts,
 * listTemplates for the (broadcast-safe) template picker, and the new
 * email-sender endpoints for preview + send. No email logic lives here.
 */
import { CheckSquare, Loader2, Mail, Search, Send, Square, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { exportApplicants } from '../../api/services/applicantService.js'
import { getStudents } from '../../api/services/studentService.js'
import { listTemplates } from '../../api/services/emailTemplateService.js'
import { previewSenderEmail, sendTemplatedEmail } from '../../api/services/emailSenderService.js'
import { useUiStore } from '../../store/uiStore.js'

// Warn (and require an extra beat) before emailing a batch this large or larger.
const LARGE_BATCH = 50

// Human labels for applicant pipeline + scholar enrollment statuses.
const STATUS_LABELS = {
  submitted: 'Applied', shortlisted_test: 'Shortlisted for Test', test_pending: 'Test Sent',
  test_completed: 'Test Submitted', shortlisted: 'Final Shortlist',
  payment_received: 'Registration Fee Paid', enrolled: 'Enrolled', rejected: 'Rejected',
  active: 'Active', suspended: 'Suspended', withdrawn: 'Archived',
}
const statusLabel = (s) => STATUS_LABELS[s] || (s ? String(s).replaceAll('_', ' ') : '—')

export default function EmailSender() {
  const addToast = useUiStore((s) => s.addToast)

  const [contacts, setContacts] = useState(null)   // combined, deduped by email
  const [templates, setTemplates] = useState([])   // broadcast-safe only
  const [templateKey, setTemplateKey] = useState('')

  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')       // all | applicant | scholar
  const [statusFilter, setStatusFilter] = useState('all')
  const [batchFilter, setBatchFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())

  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState(null)      // { subject, html, unresolved, recipientCount }
  const [previewing, setPreviewing] = useState(false)
  const [sending, setSending] = useState(false)

  // ── Load contacts (applicants + scholars) + broadcast-safe templates ──
  useEffect(() => {
    let alive = true
    Promise.allSettled([
      exportApplicants(),
      getStudents({ limit: 2000, offset: 0 }),
      listTemplates(),
    ]).then(([appRes, stuRes, tplRes]) => {
      if (!alive) return
      const applicants = appRes.status === 'fulfilled' ? (appRes.value.data || []) : []
      const students = stuRes.status === 'fulfilled' ? (stuRes.value.data || []) : []
      const tpls = tplRes.status === 'fulfilled' ? (tplRes.value.data || []) : []

      const rows = [
        ...applicants.map((a) => ({
          id: `app_${a.id}`,
          name: a.personal?.full_name || `${a.first_name || ''} ${a.last_name || ''}`.trim(),
          email: (a.personal?.email || a.email || '').trim(),
          source: 'applicant',
          status: a.status || '',
          batch: a.batch_code || a.batch_name || '',
        })),
        ...students.map((s) => ({
          id: `stu_${s.id}`,
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          email: (s.email || '').trim(),
          source: 'scholar',
          status: s.status || '',
          batch: s.batch_code || s.batch_name || '',
        })),
      ].filter((r) => r.email)

      // Dedupe by lowercased email; merge the source label so it's clear when a
      // person exists in both tables (backend also dedupes on send).
      const byEmail = new Map()
      for (const r of rows) {
        const key = r.email.toLowerCase()
        const prev = byEmail.get(key)
        if (!prev) { byEmail.set(key, { ...r }); continue }
        if (!prev.source.includes(r.source)) prev.source = `${prev.source}+${r.source}`
      }
      setContacts([...byEmail.values()])
      setTemplates(tpls.filter((t) => t.broadcastSafe))
    })
    return () => { alive = false }
  }, [])

  const batches = useMemo(() => {
    const s = new Set((contacts || []).map((c) => c.batch).filter(Boolean))
    return [...s].sort()
  }, [contacts])
  const statuses = useMemo(() => {
    const s = new Set((contacts || []).map((c) => c.status).filter(Boolean))
    return [...s].sort()
  }, [contacts])

  const filtered = useMemo(() => {
    if (!contacts) return []
    const q = search.trim().toLowerCase()
    return contacts.filter((c) => {
      if (source !== 'all' && !c.source.includes(source)) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (batchFilter !== 'all' && c.batch !== batchFilter) return false
      if (q && !(`${c.name} ${c.email}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [contacts, search, source, statusFilter, batchFilter])

  const selectedContacts = useMemo(
    () => (contacts || []).filter((c) => selected.has(c.id)),
    [contacts, selected],
  )

  const filteredIds = filtered.map((c) => c.id)
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id))

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (allFilteredSelected) filteredIds.forEach((id) => n.delete(id))
      else filteredIds.forEach((id) => n.add(id))
      return n
    })
  }
  const toggleOne = (id) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const recipientsPayload = () => selectedContacts.map((c) => ({
    email: c.email,
    name: c.name,
    source: c.source.includes('applicant') ? 'applicant' : 'scholar',
    batch: c.batch,
    status: c.status,
  }))

  // ── Preview (mandatory) — renders the FIRST selected recipient exactly as it will send ──
  const openPreview = async () => {
    if (!templateKey) { addToast({ type: 'error', title: 'Pick a template first.' }); return }
    if (!selectedContacts.length) { addToast({ type: 'error', title: 'Select at least one recipient.' }); return }
    setPreviewing(true)
    setPreviewOpen(true)
    setPreview(null)
    try {
      const first = selectedContacts[0]
      const { data } = await previewSenderEmail(templateKey, {
        email: first.email, name: first.name, source: first.source, batch: first.batch, status: first.status,
      })
      setPreview({ ...data, recipientCount: selectedContacts.length, sampleName: first.name || first.email })
    } catch (err) {
      addToast({ type: 'error', title: 'Preview failed', message: err.response?.data?.message })
      setPreviewOpen(false)
    } finally { setPreviewing(false) }
  }

  // ── Send — guarded against double-click / repeat batch ──
  const doSend = async () => {
    if (sending) return
    const recipients = recipientsPayload()
    if (!recipients.length) return
    if (recipients.length >= LARGE_BATCH &&
        !window.confirm(`Send this email to ${recipients.length} recipients? This is a large batch.`)) return
    setSending(true)
    try {
      const { data } = await sendTemplatedEmail(templateKey, recipients)
      const failedList = (data.failed || []).map((f) => f.email)
      const skippedList = (data.skipped || []).map((s) => s.email)
      addToast({
        type: data.failed?.length ? (data.sent ? 'warning' : 'error') : 'success',
        title: `Sent ${data.sent} of ${data.total}${data.skipped?.length ? `, ${data.skipped.length} skipped` : ''}${data.failed?.length ? `, ${data.failed.length} failed` : ''}.`,
        message: [
          failedList.length ? `Failed: ${failedList.join(', ')}` : '',
          skippedList.length ? `Skipped: ${skippedList.join(', ')}` : '',
        ].filter(Boolean).join(' · ') || undefined,
      })
      setPreviewOpen(false)
      setSelected(new Set()) // prevent an accidental repeat send of the same batch
    } catch (err) {
      addToast({ type: 'error', title: 'Send failed', message: err.response?.data?.message })
    } finally { setSending(false) }
  }

  if (!contacts) {
    return <div className="grid place-items-center py-20"><Loader2 size={22} className="animate-spin text-[color:var(--accent)]" /></div>
  }

  const blockedByUnresolved = !!preview?.unresolved?.length

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* ── Recipients ── */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--border)] p-3">
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-[color:var(--surface)] px-3 py-2 text-sm">
            <Search size={15} className="text-[color:var(--muted)]" />
            <input className="w-full bg-transparent outline-none" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select className="input !w-auto text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            <option value="applicant">Applicants</option>
            <option value="scholar">Scholars</option>
          </select>
          <select className="input !w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <select className="input !w-auto text-sm" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value="all">All batches</option>
            {batches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="max-h-[calc(100vh-360px)] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[color:var(--card)] text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <button onClick={toggleAllFiltered} title={allFilteredSelected ? 'Deselect filtered' : 'Select all filtered'}>
                    {allFilteredSelected ? <CheckSquare size={17} className="text-[color:var(--accent)]" /> : <Square size={17} className="text-[color:var(--muted)]" />}
                  </button>
                </th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Batch</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-12 text-center text-[color:var(--muted)]"><Users size={26} className="mx-auto mb-2 text-[color:var(--border)]" />No contacts match.</td></tr>
              )}
              {filtered.map((c) => {
                const checked = selected.has(c.id)
                return (
                  <tr key={c.id} className={`cursor-pointer border-b border-[color:var(--border)] transition hover:bg-[color:var(--surface)] ${checked ? 'bg-[color:var(--accent-tint)]/40' : ''}`} onClick={() => toggleOne(c.id)}>
                    <td className="px-3 py-2.5">{checked ? <CheckSquare size={16} className="text-[color:var(--accent)]" /> : <Square size={16} className="text-[color:var(--muted)]" />}</td>
                    <td className="px-3 py-2.5 font-semibold text-[color:var(--text)]">{c.name || '—'}</td>
                    <td className="px-3 py-2.5 text-[color:var(--secondary)]">{c.email}</td>
                    <td className="px-3 py-2.5"><span className="rounded-full bg-[color:var(--surface)] px-2 py-0.5 text-[11px] font-semibold capitalize text-[color:var(--secondary)]">{c.source.replace('+', ' + ')}</span></td>
                    <td className="px-3 py-2.5"><span className="text-[11px] font-semibold text-[color:var(--secondary)]">{statusLabel(c.status)}</span></td>
                    <td className="px-3 py-2.5 text-[color:var(--secondary)]">{c.batch || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Compose panel ── */}
      <div className="card h-max p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[color:var(--text)]"><Mail size={16} /> Compose</p>

        <label className="block text-xs font-semibold text-[color:var(--secondary)]">Template (broadcast-safe only)</label>
        <select className="input mt-1.5 w-full text-sm" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
          <option value="">Select a template…</option>
          {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        {templates.length === 0 && <p className="mt-1.5 text-[11px] text-amber-600">No broadcast-safe templates are configured.</p>}

        <div className="mt-4 rounded-xl bg-[color:var(--surface)] p-3">
          <p className="text-2xl font-bold text-[color:var(--text)]">{selectedContacts.length}</p>
          <p className="text-[11px] font-semibold text-[color:var(--secondary)]">recipient{selectedContacts.length === 1 ? '' : 's'} selected</p>
        </div>

        <button
          onClick={openPreview}
          disabled={!templateKey || !selectedContacts.length || sending}
          className="btn-primary mt-4 flex w-full items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <Send size={15} /> Preview &amp; Send
        </button>
        <p className="mt-2 text-[11px] leading-4 text-[color:var(--muted)]">You must preview the final email and confirm before anything is sent. Nothing is sent to unselected recipients.</p>
      </div>

      {/* ── Preview + confirm modal ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !sending && setPreviewOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-[color:var(--card)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-5">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text)]">Preview &amp; confirm</h2>
                <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
                  Sending to <b>{preview?.recipientCount ?? selectedContacts.length}</b> recipient(s){preview?.sampleName ? ` · preview for ${preview.sampleName}` : ''}
                </p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => !sending && setPreviewOpen(false)}><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {previewing || !preview ? (
                <div className="grid place-items-center py-16"><Loader2 size={20} className="animate-spin text-[color:var(--accent)]" /></div>
              ) : (
                <>
                  {blockedByUnresolved && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <b>Cannot send.</b> This template has unfilled placeholders: <b>{preview.unresolved.join(', ')}</b>. These can't be resolved from contact data — edit the template (Templates tab) to include this content or remove the placeholders, then retry.
                    </div>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Subject</p>
                  <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{preview.subject || '—'}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Body</p>
                  <div className="mt-1.5 overflow-hidden rounded-xl border border-[color:var(--border)]">
                    <iframe title="Email preview" srcDoc={preview.html} className="h-[46vh] w-full bg-white" sandbox="" />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[color:var(--border)] p-4">
              <button className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => !sending && setPreviewOpen(false)}>Cancel</button>
              <button
                className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
                disabled={sending || previewing || !preview || blockedByUnresolved}
                onClick={doSend}
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sending ? 'Sending…' : `Confirm & send to ${preview?.recipientCount ?? selectedContacts.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
