import { AlertTriangle, Loader2, XCircle } from 'lucide-react'

const TONE_STYLES = {
  danger: { icon: 'text-red-500 bg-red-50', button: 'bg-red-600 hover:bg-red-700' },
  success: { icon: 'text-emerald-500 bg-emerald-50', button: 'bg-emerald-600 hover:bg-emerald-700' },
  accent: { icon: 'text-[color:var(--accent)] bg-[color:var(--accent-tint)]', button: 'bg-[color:var(--accent)] hover:opacity-90' },
}

/**
 * App-styled confirm dialog — replaces window.confirm() so confirmations
 * match the rest of the UI instead of popping a native browser dialog.
 *
 * Props:
 *   open              — whether the modal is visible
 *   title             — header text
 *   message           — body copy (string or node)
 *   confirmLabel      — confirm button text (default "Confirm")
 *   cancelLabel       — cancel button text (default "Cancel")
 *   tone              — 'danger' | 'success' | 'accent' (default 'danger')
 *   busy              — disables buttons + shows a spinner while in flight
 *   onConfirm()       — called when the user confirms
 *   onClose()         — called to dismiss without confirming
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null
  const toneStyle = TONE_STYLES[tone] || TONE_STYLES.danger

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-[color:var(--card)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${toneStyle.icon}`}>
              <AlertTriangle size={18} />
            </div>
            <div className="pt-1.5">
              <h3 className="text-base font-semibold text-[color:var(--text)]">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--surface)] disabled:opacity-50"
          >
            <XCircle size={16} />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-[color:var(--secondary)]">{message}</p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${toneStyle.button}`}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}
            {busy ? 'Working…' : confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] transition hover:text-[color:var(--text)] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
