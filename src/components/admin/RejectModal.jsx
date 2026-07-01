import { useEffect, useState } from 'react'
import { XCircle } from 'lucide-react'

/**
 * Small confirmation dialog for rejecting an applicant with an optional remark.
 * Shared by the applicants list/drawer and the Kanban board so there is a single
 * reject experience across the app.
 *
 * Props:
 *   open           — whether the modal is visible
 *   applicantName  — name shown in the header
 *   busy           — disables inputs while the reject request is in flight
 *   onClose()      — dismiss without rejecting
 *   onConfirm(remark) — confirm; receives the trimmed remark (may be '')
 */
const MAX = 500

export default function RejectModal({ open, applicantName, busy, onClose, onConfirm }) {
  const [remark, setRemark] = useState('')

  // Reset the field each time the modal opens for a new applicant.
  useEffect(() => { if (open) setRemark('') }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[color:var(--card)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-500">Reject Applicant</p>
            <h3 className="mt-1 text-lg font-semibold text-[color:var(--text)]">{applicantName}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--surface)] disabled:opacity-50"
          >
            <XCircle size={18} />
          </button>
        </div>

        <label className="mt-4 block text-sm font-semibold text-[color:var(--secondary)]">
          Reason / Remark
        </label>
        <textarea
          autoFocus
          rows={4}
          value={remark}
          onChange={(e) => setRemark(e.target.value.slice(0, MAX))}
          placeholder="e.g. Not interested · Will pursue next batch · Not responding · Not eligible"
          className="textarea mt-1 w-full"
        />
        <p className="mt-1 text-right text-[11px] text-[color:var(--muted)]">{remark.length}/{MAX}</p>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onConfirm(remark.trim())}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Rejecting…' : 'Confirm Reject'}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] transition hover:text-[color:var(--text)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
