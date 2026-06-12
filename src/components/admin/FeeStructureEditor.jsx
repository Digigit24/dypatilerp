/**
 * FeeStructureEditor — friendly per-semester fee editor.
 * Maps to/from the backend's JSON shape: { "1": 50000, "2": 50000, ... }
 */
import { IndianRupee, Plus, Trash2 } from 'lucide-react'

const inr = new Intl.NumberFormat('en-IN')

export default function FeeStructureEditor({ value = {}, onChange }) {
  const entries = Object.entries(value)
    .map(([sem, amt]) => [Number(sem), amt])
    .sort((a, b) => a[0] - b[0])

  const setAmount = (sem, amount) => {
    onChange({ ...value, [sem]: amount === '' ? 0 : Number(amount) })
  }

  const removeSemester = (sem) => {
    const next = { ...value }
    delete next[sem]
    onChange(next)
  }

  const addSemester = () => {
    const nextSem = entries.length ? Math.max(...entries.map(([s]) => s)) + 1 : 1
    const lastAmount = entries.length ? entries[entries.length - 1][1] : 50000
    onChange({ ...value, [nextSem]: lastAmount })
  }

  const total = entries.reduce((s, [, amt]) => s + (Number(amt) || 0), 0)

  return (
    <div className="rounded-2xl border border-[color:var(--border)] p-3">
      {entries.length === 0 && (
        <p className="px-1 py-2 text-xs text-[color:var(--muted)]">No semesters yet — add the first one.</p>
      )}
      <div className="space-y-2">
        {entries.map(([sem, amt]) => (
          <div key={sem} className="flex items-center gap-2.5">
            <span className="w-24 shrink-0 text-xs font-semibold text-[color:var(--secondary)]">Semester {sem}</span>
            <div className="relative flex-1">
              <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
              <input
                type="number"
                min={0}
                step={500}
                className="input h-9 w-full pl-8 text-sm"
                value={amt}
                onChange={(e) => setAmount(sem, e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => removeSemester(sem)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[color:var(--muted)] hover:bg-red-50 hover:text-red-500"
              title={`Remove semester ${sem}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[color:var(--border)] pt-3">
        <button
          type="button"
          onClick={addSemester}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
        >
          <Plus size={12} /> Add Semester
        </button>
        <span className="text-xs font-semibold text-[color:var(--secondary)]">
          Total: <span className="text-[color:var(--text)]">₹{inr.format(total)}</span>
        </span>
      </div>
    </div>
  )
}
