import { Check, Palette, RotateCcw, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { deriveThemeTokens } from '../../api/services/themeService.js'
import { useUiStore } from '../../store/uiStore.js'

const presets = [
  { name: 'Rose', value: '#E54873' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Slate', value: '#475569' },
]

export default function SettingsPage() {
  const themeConfig = useUiStore((s) => s.themeConfig)
  const setThemeConfig = useUiStore((s) => s.setThemeConfig)
  const resetThemeConfig = useUiStore((s) => s.resetThemeConfig)
  const addToast = useUiStore((s) => s.addToast)
  const [primaryColor, setPrimaryColor] = useState(themeConfig.primaryColor)
  const tokens = useMemo(() => deriveThemeTokens(primaryColor), [primaryColor])

  const save = () => {
    setThemeConfig({ primaryColor })
    addToast({ type: 'success', title: 'Theme updated across the app' })
  }

  const reset = () => {
    resetThemeConfig()
    setPrimaryColor('#E54873')
    addToast({ type: 'info', title: 'Theme reset to default rose' })
  }

  return (
    <div className="fade-page">
      <PageHeader
        title="Settings"
        subtitle="Configure the visual theme used across all ERP pages."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card p-6">
          <div className="safe-row items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted)]">Theme Service</p>
              <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">Primary Color</h2>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">This color powers CTAs, active sidebar states, pills, focus rings, scrollbars, and highlights.</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
              <Palette size={22} />
            </div>
          </div>

          <div className="mt-8">
            <label className="text-sm font-semibold text-[color:var(--text)]">Choose a preset</label>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {presets.map((preset) => {
                const active = primaryColor.toLowerCase() === preset.value.toLowerCase()
                return (
                  <button
                    key={preset.value}
                    className={`safe-row rounded-3xl border p-3 text-left transition ${active ? 'border-[color:var(--accent)] bg-[color:var(--accent-tint)]' : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]'}`}
                    onClick={() => setPrimaryColor(preset.value)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="h-8 w-8 shrink-0 rounded-full shadow-soft" style={{ background: preset.value }} />
                      <span className="truncate text-sm font-semibold text-[color:var(--text)]">{preset.name}</span>
                    </span>
                    {active && <Check size={16} className="shrink-0 text-[color:var(--accent)]" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
            <label className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <span className="block text-sm font-semibold text-[color:var(--text)]">Custom color</span>
              <input
                className="mt-3 h-14 w-full cursor-pointer rounded-2xl bg-transparent"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </label>
            <label className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <span className="block text-sm font-semibold text-[color:var(--text)]">Hex value</span>
              <input
                className="input mt-3 w-full font-mono uppercase"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                maxLength={7}
              />
            </label>
          </div>

          <div className="safe-actions mt-8">
            <button className="btn-primary inline-flex items-center gap-2" onClick={save}><Save size={17} /> Save Theme</button>
            <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={reset}><RotateCcw size={16} className="mr-2 inline" />Reset</button>
          </div>
        </section>

        <aside className="card p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">Live Preview</h2>
          <p className="mt-1 text-sm text-[color:var(--secondary)]">Preview generated from `themeService` tokens.</p>
          <div className="mt-6 rounded-[28px] border border-[color:var(--border)] p-5" style={{ background: tokens.accentTint }}>
            <div className="safe-row">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">Active Module</p>
                <p className="text-xs text-[color:var(--secondary)]">Sidebar state, pills and highlights</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: primaryColor }}>Active</span>
            </div>
            <button className="mt-5 h-11 rounded-[14px] px-5 font-semibold text-white shadow-soft" style={{ background: primaryColor }}>Primary action</button>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <Token label="Accent" value={tokens.accent} />
            <Token label="Hover" value={tokens.accentHover} />
            <Token label="Tint" value={tokens.accentTint} />
            <Token label="Scrollbar" value={tokens.scrollbarThumb} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Token({ label, value }) {
  return <div className="safe-row rounded-2xl bg-[color:var(--surface)] px-4 py-3"><span className="font-semibold text-[color:var(--text)]">{label}</span><code className="truncate text-xs text-[color:var(--secondary)]">{value}</code></div>
}
