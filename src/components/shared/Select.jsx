/**
 * Select — a styled single-select dropdown that matches the app's `.input`
 * chrome at rest and stays on-brand when open, instead of handing off to the
 * browser/OS listbox the way a bare `<select>` does.
 *
 * Deliberately minimal: controlled value/onChange, keyboard nav (arrows,
 * Enter, Escape, type-ahead), click-outside-to-close. No search/multi-select —
 * reach for a dedicated combobox if a call site ever needs those.
 *
 *   <Select
 *     value={guideType}
 *     onChange={setGuideType}
 *     options={[{ value: 'academic', label: 'Academic Guide' }, ...]}
 *     placeholder="Choose a guide…"
 *   />
 */
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Select({ value, onChange, options, placeholder = 'Select…', disabled = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const typeAheadRef = useRef({ text: '', timer: null })

  const selected = options.find((o) => o.value === value) || null

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open])

  const pick = (opt) => { if (opt.disabled) return; onChange(opt.value); setOpen(false) }

  const moveFocus = (delta) => {
    const enabled = options.filter((o) => !o.disabled)
    if (!enabled.length) return
    const curIdx = enabled.findIndex((o) => o.value === value)
    const next = enabled[(curIdx + delta + enabled.length) % enabled.length]
    onChange(next.value)
  }

  const typeAhead = (char) => {
    const state = typeAheadRef.current
    clearTimeout(state.timer)
    state.text += char.toLowerCase()
    state.timer = setTimeout(() => { state.text = '' }, 600)
    const hit = options.find((o) => !o.disabled && o.label.toLowerCase().startsWith(state.text))
    if (hit) onChange(hit.value)
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape'].includes(e.key)) e.preventDefault()
    if (e.key === 'ArrowDown') { setOpen(true); moveFocus(1) }
    else if (e.key === 'ArrowUp') { setOpen(true); moveFocus(-1) }
    else if (e.key === 'Enter' || e.key === ' ') setOpen((o) => !o)
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key.length === 1) { setOpen(true); typeAhead(e.key) }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className="input flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className={`truncate ${selected ? 'text-[color:var(--text)]' : 'text-[color:var(--muted)]'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-[color:var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-1 shadow-lg"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-[color:var(--muted)]">No options</li>
          )}
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              data-selected={opt.value === value}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition ${
                opt.disabled
                  ? 'cursor-not-allowed text-[color:var(--muted)] opacity-50'
                  : opt.value === value
                    ? 'bg-[color:var(--accent-tint)] font-semibold text-[color:var(--accent)]'
                    : 'text-[color:var(--text)] hover:bg-[color:var(--surface)]'
              }`}
              onClick={() => pick(opt)}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && <Check size={14} className="shrink-0" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
