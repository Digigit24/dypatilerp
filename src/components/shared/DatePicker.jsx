/**
 * DatePicker — a custom calendar dropdown matching Select's chrome, replacing
 * bare `<input type="date">` (a different native picker per browser/OS, no
 * way to carry the app's accent color or a min/max guardrail consistently).
 *
 * Value/onChange are plain 'YYYY-MM-DD' strings — the same shape every call
 * site already stores dates in (`String(value).slice(0, 10)`), so swapping a
 * native date input for this one is a drop-in change, not a data migration.
 *
 * Month/year are native <select> dropdowns (not prev/next-only) so jumping
 * to e.g. a 1975 date of birth doesn't take 600 clicks, and the trigger is a
 * real text input so a known date can just be typed — "15 Aug 1975",
 * "15/08/1975" and "1975-08-15" are all accepted.
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
const isValidYMD = (y, m, d) => {
  if (!y || !m || !d) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** Accepts "15 Aug 1975" / "15 August 1975", "15/08/1975", "15-08-1975", "1975-08-15". */
const parseTyped = (raw) => {
  const s = raw.trim()
  if (!s) return null

  let m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/)
  if (m) {
    const d = Number(m[1]), y = Number(m[3])
    const monthIdx = MONTHS.findIndex((mo) => mo.toLowerCase().startsWith(m[2].toLowerCase().slice(0, 3)))
    if (monthIdx >= 0 && isValidYMD(y, monthIdx + 1, d)) return toIso(y, monthIdx, d)
    return null
  }

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
    return isValidYMD(y, mo, d) ? toIso(y, mo - 1, d) : null
  }

  // Indian convention: DD/MM/YYYY, DD-MM-YYYY.
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3])
    return isValidYMD(y, mo, d) ? toIso(y, mo - 1, d) : null
  }

  return null
}

export default function DatePicker({ value, onChange, placeholder = 'Select or type a date…', min, max, disabled = false, required = false, name, className = '' }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(formatDisplay(value))
  const [typeError, setTypeError] = useState(false)
  const selected = parseIso(value)
  const [viewY, setViewY] = useState((selected || todayParts()).y)
  const [viewM, setViewM] = useState((selected || todayParts()).m)
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Re-sync the visible month/typed text to the value whenever the panel opens.
  useEffect(() => {
    if (!open) return
    const p = parseIso(value) || todayParts()
    setViewY(p.y); setViewM(p.m)
    setText(formatDisplay(value))
    setTypeError(false)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the typed text in sync when the value changes from outside (e.g. reset).
  useEffect(() => {
    if (!open) setText(formatDisplay(value))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const minIso = min ? parseIso(min) : null
  const maxIso = max ? parseIso(max) : null
  const isDisabled = (y, m, d) => {
    const iso = toIso(y, m, d)
    if (minIso && iso < toIso(minIso.y, minIso.m, minIso.d)) return true
    if (maxIso && iso > toIso(maxIso.y, maxIso.m, maxIso.d)) return true
    return false
  }

  // Year dropdown range — wide enough for a date of birth by default, and
  // always widened to include the currently selected/viewed year so an
  // out-of-default-range value is never stranded off the list.
  const years = useMemo(() => {
    const lo = minIso ? minIso.y : Math.min(todayParts().y - 100, viewY)
    const hi = maxIso ? maxIso.y : Math.max(todayParts().y, viewY)
    const list = []
    for (let y = hi; y >= lo; y--) list.push(y)
    return list
  }, [minIso, maxIso, viewY])

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
    const iso = toIso(viewY, viewM, d)
    onChange(iso)
    setText(formatDisplay(iso))
    setTypeError(false)
    setOpen(false)
  }

  const commitTyped = () => {
    if (!text.trim()) {
      setTypeError(false)
      if (value) onChange('')
      return
    }
    const iso = parseTyped(text)
    if (!iso) { setTypeError(true); return }
    const p = parseIso(iso)
    if (isDisabled(p.y, p.m, p.d)) { setTypeError(true); return }
    setTypeError(false)
    onChange(iso)
    setText(formatDisplay(iso))
    setViewY(p.y); setViewM(p.m)
  }

  const today = todayParts()

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Invisible mirror input — see Select.jsx for why this exists: keeps
          native `required` form-validation working against the typed/calendar
          controls instead of a plain <input>. */}
      {(required || name) && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required={required}
          name={name}
          value={value || ''}
          onChange={() => {}}
          onFocus={() => inputRef.current?.focus?.()}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0 w-full opacity-0"
        />
      )}

      <div className={`input flex w-full items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setText(e.target.value); setTypeError(false) }}
          onBlur={commitTyped}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitTyped() }
            if (e.key === 'Escape') { setText(formatDisplay(value)); setTypeError(false); setOpen(false) }
          }}
          className={`w-full min-w-0 bg-transparent outline-none placeholder:text-[color:var(--muted)] ${typeError ? 'text-red-500' : 'text-[color:var(--text)]'}`}
        />
        <button
          type="button"
          disabled={disabled}
          tabIndex={-1}
          className="shrink-0 text-[color:var(--muted)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed"
          onClick={() => setOpen((o) => !o)}
        >
          <CalendarIcon size={15} />
        </button>
      </div>
      {typeError && <p className="mt-1 text-xs text-red-500">Couldn&apos;t read that date — try 15 Aug 1975 or 15/08/1975.</p>}

      {open && (
        <div className="absolute z-30 mt-1.5 w-72 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-lg">
          <div className="flex items-center justify-between gap-1 px-0.5">
            <button type="button" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={15} />
            </button>
            <select
              value={viewM}
              onChange={(e) => setViewM(Number(e.target.value))}
              className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent py-1 text-center text-sm font-semibold text-[color:var(--text)] hover:border-[color:var(--border)] focus:border-[color:var(--accent)] focus:outline-none"
            >
              {MONTHS.map((mo, i) => <option key={mo} value={i}>{mo}</option>)}
            </select>
            <select
              value={viewY}
              onChange={(e) => setViewY(Number(e.target.value))}
              className="w-20 shrink-0 rounded-md border border-transparent bg-transparent py-1 text-center text-sm font-semibold text-[color:var(--text)] hover:border-[color:var(--border)] focus:border-[color:var(--accent)] focus:outline-none"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={() => changeMonth(1)}>
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
            onClick={() => { const t = todayParts(); if (!isDisabled(t.y, t.m, t.d)) { setViewY(t.y); setViewM(t.m); pick(t.d) } }}
          >
            Today
          </button>
        </div>
      )}
    </div>
  )
}
