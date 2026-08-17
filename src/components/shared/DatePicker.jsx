/**
 * DatePicker — a custom calendar dropdown matching Select's chrome, replacing
 * bare `<input type="date">` (a different native picker per browser/OS, no
 * way to carry the app's accent color or a min/max guardrail consistently).
 *
 * Value/onChange are plain 'YYYY-MM-DD' strings — the same shape every call
 * site already stores dates in (`String(value).slice(0, 10)`), so swapping a
 * native date input for this one is a drop-in change, not a data migration.
 */
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const pad = (n) => String(n).padStart(2, '0')
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const parseIso = (s) => {
  if (!s) return null
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m: m - 1, d }
}
const todayParts = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() } }
const formatDisplay = (iso) => {
  const p = parseIso(iso)
  if (!p) return ''
  return `${p.d} ${MONTHS[p.m].slice(0, 3)} ${p.y}`
}

export default function DatePicker({ value, onChange, placeholder = 'Select date…', min, max, disabled = false, required = false, name, className = '' }) {
  const [open, setOpen] = useState(false)
  const selected = parseIso(value)
  const [viewY, setViewY] = useState((selected || todayParts()).y)
  const [viewM, setViewM] = useState((selected || todayParts()).m)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Re-sync the visible month to the value whenever the panel opens.
  useEffect(() => {
    if (!open) return
    const p = parseIso(value) || todayParts()
    setViewY(p.y); setViewM(p.m)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const minIso = min ? parseIso(min) : null
  const maxIso = max ? parseIso(max) : null
  const isDisabled = (y, m, d) => {
    const iso = toIso(y, m, d)
    if (minIso && iso < toIso(minIso.y, minIso.m, minIso.d)) return true
    if (maxIso && iso > toIso(maxIso.y, maxIso.m, maxIso.d)) return true
    return false
  }

  const grid = useMemo(() => {
    const firstOfMonth = new Date(viewY, viewM, 1)
    const startWeekday = firstOfMonth.getDay()
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [viewY, viewM])

  const changeMonth = (delta) => {
    let m = viewM + delta, y = viewY
    if (m < 0) { m = 11; y -= 1 } else if (m > 11) { m = 0; y += 1 }
    setViewM(m); setViewY(y)
  }

  const pick = (d) => {
    if (isDisabled(viewY, viewM, d)) return
    onChange(toIso(viewY, viewM, d))
    setOpen(false)
  }

  const today = todayParts()

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Invisible mirror input — see Select.jsx for why this exists: keeps
          native `required` form-validation working against a non-<input>
          visible control. */}
      {(required || name) && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required={required}
          name={name}
          value={value || ''}
          onChange={() => {}}
          onFocus={(e) => e.target.nextElementSibling?.focus?.()}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0 w-full opacity-0"
        />
      )}
      <button
        type="button"
        disabled={disabled}
        className="input flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`truncate ${selected ? 'text-[color:var(--text)]' : 'text-[color:var(--muted)]'}`}>
          {selected ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon size={15} className="shrink-0 text-[color:var(--muted)]" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-72 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-lg">
          <div className="flex items-center justify-between px-1">
            <button type="button" className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold text-[color:var(--text)]">{MONTHS[viewM]} {viewY}</span>
            <button type="button" className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => changeMonth(1)}>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 px-1 text-center text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">
            {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 px-1">
            {grid.map((d, i) => {
              if (d === null) return <span key={i} />
              const isSelected = selected && selected.y === viewY && selected.m === viewM && selected.d === d
              const isToday = today.y === viewY && today.m === viewM && today.d === d
              const dayDisabled = isDisabled(viewY, viewM, d)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dayDisabled}
                  onClick={() => pick(d)}
                  className={`grid h-8 w-8 place-items-center rounded-md text-xs font-semibold transition ${
                    dayDisabled
                      ? 'cursor-not-allowed text-[color:var(--muted)] opacity-40'
                      : isSelected
                        ? 'bg-[color:var(--accent)] text-white'
                        : isToday
                          ? 'border border-[color:var(--accent)] text-[color:var(--accent)]'
                          : 'text-[color:var(--text)] hover:bg-[color:var(--surface)]'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className="mt-2 w-full rounded-md py-1.5 text-center text-xs font-semibold text-[color:var(--accent)] hover:bg-[color:var(--accent-tint)]"
            onClick={() => { const t = todayParts(); if (!isDisabled(t.y, t.m, t.d)) { setViewY(t.y); setViewM(t.m); onChange(toIso(t.y, t.m, t.d)); setOpen(false) } }}
          >
            Today
          </button>
        </div>
      )}
    </div>
  )
}
