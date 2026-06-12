import {
  Check, CheckCircle2, Eye, EyeOff, Loader2, Mail, Moon,
  Palette, RotateCcw, Save, Send, Sun,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { deriveThemeTokens } from '../../api/services/themeService.js'
import { getEffectiveEmailConfig, getSettings, saveSettings, sendTestEmail } from '../../api/services/settingsService.js'
import { useUiStore } from '../../store/uiStore.js'

const presets = [
  { name: 'Rose',    value: '#E54873' },
  { name: 'Indigo',  value: '#4F46E5' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Amber',   value: '#F59E0B' },
  { name: 'Sky',     value: '#0EA5E9' },
  { name: 'Violet',  value: '#8B5CF6' },
  { name: 'Teal',    value: '#14B8A6' },
  { name: 'Slate',   value: '#475569' },
]

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--text)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-[color:var(--secondary)]">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  // ── Theme store ──────────────────────────────────────────────────────────
  const theme          = useUiStore((s) => s.theme)
  const themeConfig    = useUiStore((s) => s.themeConfig)
  const setThemeConfig = useUiStore((s) => s.setThemeConfig)
  const resetThemeConfig = useUiStore((s) => s.resetThemeConfig)
  const toggleTheme    = useUiStore((s) => s.toggleTheme)
  const addToast       = useUiStore((s) => s.addToast)

  const [primaryColor, setPrimaryColor] = useState(themeConfig.primaryColor)
  const tokens = useMemo(() => deriveThemeTokens(primaryColor), [primaryColor])

  const saveTheme = () => {
    setThemeConfig({ primaryColor })
    addToast({ type: 'success', title: 'Theme updated across the app' })
  }

  const reset = () => {
    resetThemeConfig()
    setPrimaryColor('#4F46E5')
    addToast({ type: 'info', title: 'Theme reset to default indigo' })
  }

  // ── Brevo config ─────────────────────────────────────────────────────────
  const [brevo, setBrevo] = useState({
    apiKey: '', senderName: '', senderEmail: '', enabled: false,
  })
  const [brevoLoading, setBrevoLoading] = useState(true)
  const [brevoSaving,  setBrevoSaving]  = useState(false)
  const [showKey,      setShowKey]      = useState(false)

  // Test email state
  const [testEmail,   setTestEmail]   = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult,  setTestResult]  = useState(null)   // null | { status: 'ok'|'fail', detail }

  // Effective server email config (env + DB merged)
  const [effective, setEffective] = useState(null)
  const loadEffective = () =>
    getEffectiveEmailConfig().then((r) => setEffective(r.data)).catch(() => setEffective(null))

  useEffect(() => {
    Promise.all([getSettings('brevo'), getEffectiveEmailConfig().catch(() => ({ data: null }))])
      .then(([r, eff]) => {
        const saved = (r.data && Object.keys(r.data).length) ? r.data : {}
        const envDefaults = eff.data?.env_defaults || {}
        setEffective(eff.data)
        // Prefill from saved settings, falling back to the server's .env values
        setBrevo((prev) => ({
          ...prev,
          ...saved,
          senderName:  saved.senderName  || envDefaults.senderName  || '',
          senderEmail: saved.senderEmail || envDefaults.senderEmail || '',
        }))
      })
      .catch(() => {})
      .finally(() => setBrevoLoading(false))
  }, [])

  const saveBrevo = async () => {
    setBrevoSaving(true)
    try {
      await saveSettings('brevo', brevo)
      addToast({ type: 'success', title: 'Brevo settings saved.' })
      loadEffective()
    } catch {
      addToast({ type: 'error', title: 'Failed to save Brevo settings.' })
    } finally { setBrevoSaving(false) }
  }

  const runTestEmail = async () => {
    if (!testEmail) return
    setTestLoading(true)
    setTestResult(null)
    try {
      const r = await sendTestEmail({
        to: testEmail,
        apiKey: brevo.apiKey,
        senderName: brevo.senderName,
        senderEmail: brevo.senderEmail,
      })
      const d = r.data || {}
      setTestResult({
        status: d.mock ? 'mock' : 'ok',
        detail: d.mock
          ? 'Server is in MOCK mode \u2014 BREVO_SMTP_USER / BREVO_SMTP_PASS are missing in the server .env, so the email was only logged to the server console.'
          : `Delivered via ${d.smtp_user || 'SMTP'} as ${d.sender_used || ''}${d.message_id ? ` \u00b7 id: ${d.message_id}` : ''}`,
      })
      addToast({ type: d.mock ? 'info' : 'success', title: d.mock ? 'Mock send (SMTP not configured)' : `Test email sent to ${testEmail}` })
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unknown error'
      const dbg = err.response?.data?.data
      setTestResult({
        status: 'fail',
        detail: `${msg}${dbg?.smtp_user ? ` \u00b7 SMTP user: ${dbg.smtp_user}` : ''}${dbg?.smtp_host ? ` \u00b7 host: ${dbg.smtp_host}:${dbg.smtp_port}` : ''}`,
      })
      addToast({ type: 'error', title: 'Test email failed', message: msg })
    } finally { setTestLoading(false) }
  }

  return (
    <div className="fade-page">
      <PageHeader
        title="Settings"
        subtitle="Visual theme, dark mode, and email delivery configuration."
      />

      <div className="space-y-6">

        {/* ── Appearance ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Section title="Appearance" subtitle="Accent colour and dark/light mode — saved per user account." icon={Palette}>

            {/* Dark / Light toggle */}
            <div className="mb-7 flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon size={20} className="text-[color:var(--accent)]" /> : <Sun size={20} className="text-amber-500" />}
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </p>
                  <p className="text-xs text-[color:var(--secondary)]">Toggle the colour scheme</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className={`relative h-7 w-13 rounded-full transition-colors ${theme === 'dark' ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}
                style={{ width: 52 }}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Colour presets */}
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

            {/* Custom hex */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
              <label className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <span className="block text-sm font-semibold text-[color:var(--text)]">Custom colour</span>
                <input className="mt-3 h-14 w-full cursor-pointer rounded-2xl bg-transparent" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </label>
              <label className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <span className="block text-sm font-semibold text-[color:var(--text)]">Hex value</span>
                <input className="input mt-3 w-full font-mono uppercase" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} maxLength={7} />
              </label>
            </div>

            <div className="safe-actions mt-6">
              <button className="btn-primary inline-flex items-center gap-2" onClick={saveTheme}><Save size={16} /> Save Theme</button>
              <button className="h-11 rounded-[14px] bg-[color:var(--surface)] px-4 font-semibold text-[color:var(--secondary)]" onClick={reset}><RotateCcw size={15} className="mr-2 inline" />Reset</button>
            </div>
          </Section>

          {/* Live preview */}
          <aside className="card p-6">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">Live Preview</h2>
            <p className="mt-1 text-sm text-[color:var(--secondary)]">Tokens derived from your colour selection.</p>
            <div className="mt-6 rounded-[28px] border border-[color:var(--border)] p-5" style={{ background: tokens.accentTint }}>
              <div className="safe-row">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text)]">Active Module</p>
                  <p className="text-xs text-[color:var(--secondary)]">Sidebar states and highlights</p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: primaryColor }}>Active</span>
              </div>
              <button className="mt-5 h-11 rounded-[14px] px-5 font-semibold text-white shadow-soft" style={{ background: primaryColor }}>Primary Action</button>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              {[
                { label: 'Accent',    value: tokens.accent },
                { label: 'Hover',     value: tokens.accentHover },
                { label: 'Tint',      value: tokens.accentTint },
                { label: 'Scrollbar', value: tokens.scrollbarThumb },
              ].map(({ label, value }) => (
                <div key={label} className="safe-row rounded-2xl bg-[color:var(--surface)] px-4 py-3">
                  <span className="font-semibold text-[color:var(--text)]">{label}</span>
                  <code className="truncate text-xs text-[color:var(--secondary)]">{value}</code>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* ── Email (Brevo) ── */}
        <Section
          title="Email Delivery — Brevo"
          subtitle="Configure Brevo (Sendinblue) transactional email for automated notifications."
          icon={Mail}
        >
          {brevoLoading ? (
            <div className="flex items-center gap-3 text-sm text-[color:var(--secondary)]">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-5">
              {/* Server email status — what the backend actually loaded */}
              {effective && (
                <div className={`rounded-3xl border p-5 ${effective.mode === 'live' ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[color:var(--text)]">Server Email Status</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${effective.mode === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {effective.mode === 'live' ? '\u25cf Live SMTP' : '\u25cb Mock \u2014 console only'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
                    <p className="text-[color:var(--secondary)]">SMTP Host: <span className="font-mono text-[color:var(--text)]">{effective.smtp?.host}:{effective.smtp?.port}</span></p>
                    <p className="text-[color:var(--secondary)]">SMTP User <span className="opacity-60">(.env)</span>: <span className="font-mono text-[color:var(--text)]">{effective.smtp?.user || '\u2014 not set'}</span></p>
                    <p className="text-[color:var(--secondary)]">SMTP Password <span className="opacity-60">(.env)</span>: <span className="font-mono text-[color:var(--text)]">{effective.smtp?.pass_masked || '\u2014 not set'}</span></p>
                    <p className="text-[color:var(--secondary)]">Sender: <span className="font-mono text-[color:var(--text)]">{effective.sender?.name} &lt;{effective.sender?.email}&gt;</span> <span className="opacity-60">(from {effective.sender?.source})</span></p>
                  </div>
                  {effective.mode !== 'live' && (
                    <p className="mt-3 text-xs font-semibold text-amber-700">
                      Emails will NOT be delivered: set BREVO_SMTP_USER and BREVO_SMTP_PASS in the server&apos;s backend/.env and restart the backend.
                    </p>
                  )}
                </div>
              )}

              {/* Enable toggle */}
              <div className="flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text)]">Enable email notifications</p>
                  <p className="text-xs text-[color:var(--secondary)]">When off, emails are logged to console only</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBrevo((b) => ({ ...b, enabled: !b.enabled }))}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${brevo.enabled ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${brevo.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* API Key */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-[color:var(--text)]">Brevo API Key</label>
                  <div className="relative mt-1.5">
                    <input
                      className="input w-full pr-12 font-mono text-sm"
                      type={showKey ? 'text' : 'password'}
                      value={brevo.apiKey}
                      onChange={(e) => setBrevo((b) => ({ ...b, apiKey: e.target.value }))}
                      placeholder="xkeysib-…"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] hover:text-[color:var(--text)]"
                      onClick={() => setShowKey((v) => !v)}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[color:var(--muted)]">
                    Get your key at <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="text-[color:var(--accent)] underline">app.brevo.com → API Keys</a>
                  </p>
                </div>

                {/* Sender name */}
                <div>
                  <label className="text-sm font-semibold text-[color:var(--text)]">Sender Name</label>
                  <input
                    className="input mt-1.5 w-full"
                    value={brevo.senderName}
                    onChange={(e) => setBrevo((b) => ({ ...b, senderName: e.target.value }))}
                    placeholder="DY Patil ERP"
                  />
                </div>

                {/* Sender email */}
                <div>
                  <label className="text-sm font-semibold text-[color:var(--text)]">Sender Email</label>
                  <input
                    className="input mt-1.5 w-full"
                    type="email"
                    value={brevo.senderEmail}
                    onChange={(e) => setBrevo((b) => ({ ...b, senderEmail: e.target.value }))}
                    placeholder="noreply@yourdomain.com"
                  />
                  <p className="mt-1.5 text-xs text-[color:var(--muted)]">Must be a verified sender in your Brevo account.</p>
                </div>
              </div>

              {/* Test email */}
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                <p className="text-sm font-semibold text-[color:var(--text)] mb-3">Send Test Email</p>
                <div className="flex gap-3">
                  <input
                    className="input flex-1"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                  <button
                    className="inline-flex items-center gap-2 rounded-[14px] bg-[color:var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white transition disabled:opacity-60"
                    onClick={runTestEmail}
                    disabled={testLoading || !testEmail}
                  >
                    {testLoading
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Send size={15} />}
                    Send
                  </button>
                </div>
                {testResult?.status === 'ok' && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-emerald-600">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                    <span>Email delivered successfully! <span className="text-xs opacity-80">{testResult.detail}</span></span>
                  </div>
                )}
                {testResult?.status === 'mock' && (
                  <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">{testResult.detail}</p>
                )}
                {testResult?.status === 'fail' && (
                  <p className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 break-all">{testResult.detail}</p>
                )}
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <button
                  className="btn-primary inline-flex items-center gap-2"
                  onClick={saveBrevo}
                  disabled={brevoSaving}
                >
                  {brevoSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {brevoSaving ? 'Saving…' : 'Save Email Settings'}
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
