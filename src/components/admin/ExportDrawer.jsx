/**
 * ExportDrawer — Scholars page "Export" side drawer.
 *
 * Two independent actions fire on submit:
 *  1. CSV of the selected profile columns — downloads immediately, same as
 *     the old one-click Export button.
 *  2. Optional documents ZIP — queued as a background job on the backend
 *     (see students-export.service.js#runDocumentsZipJob); this drawer only
 *     confirms it was queued, the actual link arrives by email.
 */
import { CheckSquare, Download, Loader2, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { exportStudents, getExportColumns, requestDocumentsZipExport } from '../../api/services/studentService.js'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ExportDrawer({ open, onClose, filters = {} }) {
  const addToast = useUiStore((s) => s.addToast)
  const currentUser = useAuthStore((s) => s.currentUser)

  const [columns, setColumns] = useState(null)          // [{key,label}] from backend
  const [selected, setSelected] = useState(new Set())
  const [includeDocs, setIncludeDocs] = useState(false)
  const [email, setEmail] = useState('')
  const [csvLoading, setCsvLoading] = useState(false)
  const [zipLoading, setZipLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail(currentUser?.email || '')
    getExportColumns().then((r) => {
      setColumns(r.data)
      setSelected(new Set(r.data.map((c) => c.key)))
    }).catch(() => setColumns([]))
  }, [open, currentUser])

  if (!open) return null

  const toggle = (key) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const allSelected = columns?.length > 0 && selected.size === columns.length
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(columns.map((c) => c.key)))

  const emailValid = EMAIL_RE.test(email.trim())
  const canSubmit = selected.size > 0 && (!includeDocs || emailValid)

  const handleSubmit = async () => {
    // 1. CSV — synchronous download, unaffected by the ZIP toggle.
    // Ordered by the canonical `columns` list, not Set insertion order — a
    // column that was unchecked then rechecked would otherwise jump to the
    // end instead of keeping its original position.
    setCsvLoading(true)
    try {
      const orderedKeys = columns.filter((c) => selected.has(c.key)).map((c) => c.key)
      await exportStudents(filters, orderedKeys)
      addToast({ type: 'success', title: 'Scholars exported as CSV.' })
    } catch {
      addToast({ type: 'error', title: 'CSV export failed. Please try again.' })
    } finally {
      setCsvLoading(false)
    }

    // 2. Documents ZIP — fire-and-forget background job, only when requested.
    if (includeDocs) {
      setZipLoading(true)
      try {
        const r = await requestDocumentsZipExport(filters, email.trim())
        addToast({ type: 'success', title: r.message || `You'll get an email at ${email.trim()} when the ZIP is ready.` })
      } catch (err) {
        addToast({ type: 'error', title: 'Could not start documents export.', message: err.response?.data?.message })
      } finally {
        setZipLoading(false)
      }
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="drawer-panel lg:!w-[min(480px,calc(100vw-32px))] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Export</p>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Export Scholars</h2>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)] text-[color:var(--secondary)] hover:bg-[color:var(--border)]"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto overscroll-contain p-6 space-y-6">
          {/* ── Columns ── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">CSV Columns</p>
              <button className="text-xs font-semibold text-[color:var(--accent)]" onClick={toggleAll} disabled={!columns?.length}>
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>
            {columns === null ? (
              <p className="text-sm text-[color:var(--secondary)]">Loading columns…</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {columns.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => toggle(c.key)}
                    className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-left text-sm hover:bg-[color:var(--surface)]"
                  >
                    {selected.has(c.key)
                      ? <CheckSquare size={15} className="shrink-0 text-[color:var(--accent)]" />
                      : <Square size={15} className="shrink-0 text-[color:var(--muted)]" />}
                    <span className="truncate text-[color:var(--text)]">{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Documents ZIP ── */}
          <div className="rounded-xl border border-[color:var(--border)] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={includeDocs}
                onChange={(e) => setIncludeDocs(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[color:var(--border)]"
              />
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">Also export scholar documents (ZIP)</p>
                <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
                  Every uploaded onboarding document, one folder per scholar. Built in the background —
                  you'll get an email with the download link, it doesn't hold up the CSV above.
                </p>
              </div>
            </label>

            {includeDocs && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-[color:var(--secondary)]">Send the download link to</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-sm text-[color:var(--text)] focus:border-[color:var(--accent)] focus:outline-none"
                />
                {!emailValid && email.trim().length > 0 && (
                  <p className="mt-1 text-xs text-red-500">Enter a valid email address.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3 border-t border-[color:var(--border)] p-6">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={csvLoading || zipLoading}>
            Cancel
          </button>
          <button
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
            onClick={handleSubmit}
            disabled={!canSubmit || csvLoading || zipLoading}
          >
            {csvLoading || zipLoading
              ? <><Loader2 size={16} className="animate-spin" /> Exporting…</>
              : <><Download size={16} /> Export</>}
          </button>
        </div>
      </div>
    </div>
  )
}
