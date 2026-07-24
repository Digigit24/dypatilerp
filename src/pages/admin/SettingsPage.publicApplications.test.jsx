import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react'

/**
 * Tests for the admin "Public Applications" Settings section (D.Litt only).
 * All services + stores are mocked — no network, no backend, no production.
 * Covers: admin-only visibility, D.Litt-only UI, preservation of the full
 * existing public_application_targets value (postdoc + unknown keys), null
 * (not "") for unset IDs, course→batch filtering, enable validation, and the
 * enable-from-disabled confirmation.
 */

const h = vi.hoisted(() => ({
  addToast: vi.fn(),
  getCourses: vi.fn(),
  getBatches: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  role: { current: 'admin' },
}))

vi.mock('../../api/services/courseService.js', () => ({ getCourses: h.getCourses }))
vi.mock('../../api/services/batchService.js', () => ({ getBatches: h.getBatches }))
vi.mock('../../api/services/settingsService.js', () => ({
  getSettings: h.getSettings,
  saveSettings: h.saveSettings,
  getEffectiveEmailConfig: vi.fn().mockResolvedValue({ data: { mode: 'mock', smtp: {}, sender: {}, settings: {}, env_defaults: {} } }),
  sendTestEmail: vi.fn(),
}))
vi.mock('../../api/services/themeService.js', () => ({
  deriveThemeTokens: () => ({ accent: '#000', accentHover: '#000', accentTint: '#eee', scrollbarThumb: '#ccc' }),
}))
vi.mock('../../store/uiStore.js', () => ({
  useUiStore: (sel) => sel({
    theme: 'light', themeConfig: { primaryColor: '#4F46E5' },
    setThemeConfig: vi.fn(), resetThemeConfig: vi.fn(), toggleTheme: vi.fn(), addToast: h.addToast,
  }),
}))
vi.mock('../../store/brandingStore.js', () => ({ useBrandingStore: (sel) => sel({ setBranding: vi.fn() }) }))
vi.mock('../../store/authStore.js', () => ({ useAuthStore: (sel) => sel({ role: h.role.current }) }))

import SettingsPage, { PublicApplicationsSection } from './SettingsPage.jsx'

const COURSES = [
  { id: 'c-dlitt', name: 'Doctor of Letters', code: 'DLITT' },
  { id: 'c-other', name: 'Other Course', code: 'OTHER' },
]
const BATCHES = {
  'c-dlitt': [{ id: 'b-dlitt-1', name: 'DLitt Intake 2026', code: 'DL26', course_id: 'c-dlitt' }],
  'c-other': [{ id: 'b-other-1', name: 'Other 2026', code: 'OT26', course_id: 'c-other' }],
}

// Prior stored value: an existing postdoc entry + an unknown/future program key.
const EXISTING = {
  postdoc: { enabled: true, course_id: 'c-pd', batch_id: 'b-pd', legacyFlag: 'keep-me' },
  future_program: { anything: { nested: true }, list: [1, 2, 3] },
}

let confirmSpy

beforeEach(() => {
  vi.clearAllMocks()
  h.role.current = 'admin'
  h.getCourses.mockResolvedValue({ data: COURSES })
  h.getBatches.mockImplementation(({ course_id }) => Promise.resolve({ data: BATCHES[course_id] || [] }))
  h.getSettings.mockImplementation(() => Promise.resolve({ data: {} })) // default: no setting yet
  h.saveSettings.mockResolvedValue({ data: {} })
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => { confirmSpy.mockRestore(); cleanup() })

const comboboxes = () => screen.getAllByRole('combobox') // [0]=course, [1]=batch (D.Litt only)
const courseSel = () => comboboxes()[0]
const batchSel = () => comboboxes()[1]
const enableToggle = () => screen.getByRole('button', { name: /Toggle public applications for Doctor of Letters/i })
const saveBtn = () => screen.getByRole('button', { name: /Save D\.Litt Settings/i })

async function renderLoaded(settingValue = {}) {
  h.getSettings.mockResolvedValue({ data: settingValue })
  render(<PublicApplicationsSection />)
  await waitFor(() => expect(h.getCourses).toHaveBeenCalled())
  await waitFor(() => expect(screen.queryByText(/Loading…/)).not.toBeInTheDocument())
}

// ── Admin-only visibility (tests 1–4) ────────────────────────────────────────
describe('SettingsPage — admin-only visibility', () => {
  it('shows the section for role=admin', async () => {
    h.role.current = 'admin'
    render(<SettingsPage />)
    expect(await screen.findByText('Public Applications')).toBeInTheDocument()
  })
  it.each(['coordinator', 'academic_guide', 'industry_mentor'])('hides the section for role=%s', async (role) => {
    h.role.current = role
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument())
    expect(screen.queryByText('Public Applications')).not.toBeInTheDocument()
  })
})

// ── D.Litt-only UI + load (tests 5,6,7) ──────────────────────────────────────
describe('PublicApplicationsSection — D.Litt only', () => {
  it('initializes safely when the setting is missing ({}), without auto-saving', async () => {
    await renderLoaded({})
    expect(screen.getByText('Doctor of Letters (D.Litt)')).toBeInTheDocument()
    expect(enableToggle()).toHaveAttribute('aria-pressed', 'false')
    expect(courseSel()).toHaveValue('')
    expect(h.saveSettings).not.toHaveBeenCalled() // no save on load
  })

  it('loads an existing D.Litt target correctly', async () => {
    await renderLoaded({ dlitt: { enabled: true, course_id: 'c-dlitt', batch_id: 'b-dlitt-1' } })
    await waitFor(() => expect(h.getBatches).toHaveBeenCalledWith({ course_id: 'c-dlitt' }))
    expect(enableToggle()).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(courseSel()).toHaveValue('c-dlitt'))
    await waitFor(() => expect(batchSel()).toHaveValue('b-dlitt-1'))
  })

  it('renders no editable Postdoc controls (only the D.Litt program)', async () => {
    await renderLoaded(EXISTING)
    expect(screen.queryByText(/Postdoc/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/postdoc/)).not.toBeInTheDocument()
    // exactly two dropdowns (D.Litt course + batch), and one enable toggle
    expect(comboboxes()).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /Toggle public applications/i })).toHaveLength(1)
  })
})

// ── Preservation of other entries (tests 8,9,10,11) ──────────────────────────
describe('PublicApplicationsSection — preserves other entries', () => {
  it('preserves postdoc + unknown keys byte-for-byte and replaces only dlitt', async () => {
    await renderLoaded(EXISTING)
    fireEvent.change(courseSel(), { target: { value: 'c-dlitt' } })
    await waitFor(() => expect(batchSel()).not.toBeDisabled())
    fireEvent.change(batchSel(), { target: { value: 'b-dlitt-1' } })
    fireEvent.click(enableToggle()) // enable → will require confirm (spy returns true)
    fireEvent.click(saveBtn())

    await waitFor(() => expect(h.saveSettings).toHaveBeenCalledTimes(1))
    const [key, payload] = h.saveSettings.mock.calls[0]
    expect(key).toBe('public_application_targets')
    // postdoc + future_program untouched (deep equal to the originals)
    expect(payload.postdoc).toEqual(EXISTING.postdoc)
    expect(payload.future_program).toEqual(EXISTING.future_program)
    // only dlitt is (re)written
    expect(payload.dlitt).toEqual({ enabled: true, course_id: 'c-dlitt', batch_id: 'b-dlitt-1' })
    expect(Object.keys(payload).sort()).toEqual(['dlitt', 'future_program', 'postdoc'])
  })

  it('saves null (not empty strings) for unset IDs when disabled+unconfigured', async () => {
    await renderLoaded({ postdoc: EXISTING.postdoc })
    // leave D.Litt disabled with nothing selected, just save
    fireEvent.click(saveBtn())
    await waitFor(() => expect(h.saveSettings).toHaveBeenCalledTimes(1))
    const payload = h.saveSettings.mock.calls[0][1]
    expect(payload.dlitt).toEqual({ enabled: false, course_id: null, batch_id: null })
    expect(payload.dlitt.course_id).toBeNull()
    expect(payload.dlitt.batch_id).toBeNull()
    expect(payload.postdoc).toEqual(EXISTING.postdoc) // preserved
  })
})

// ── Course/batch behaviour (tests 12,13,14,15) ───────────────────────────────
describe('PublicApplicationsSection — course/batch behaviour', () => {
  it('course options use real returned IDs', async () => {
    await renderLoaded({})
    const values = within(courseSel()).getAllByRole('option').map((o) => o.value)
    expect(values).toContain('c-dlitt')
    expect(values).toContain('c-other')
  })

  it('batch dropdown is disabled until a course is selected, then lists only that course\'s batches', async () => {
    await renderLoaded({})
    expect(batchSel()).toBeDisabled()
    fireEvent.change(courseSel(), { target: { value: 'c-dlitt' } })
    await waitFor(() => expect(h.getBatches).toHaveBeenCalledWith({ course_id: 'c-dlitt' }))
    await waitFor(() => expect(batchSel()).not.toBeDisabled())
    const opts = within(batchSel()).getAllByRole('option').map((o) => o.textContent)
    expect(opts).toContain('DLitt Intake 2026 (DL26)')
    expect(opts).not.toContain('Other 2026 (OT26)')
  })

  it('changing the course clears the previously selected batch', async () => {
    await renderLoaded({})
    fireEvent.change(courseSel(), { target: { value: 'c-dlitt' } })
    await waitFor(() => expect(batchSel()).not.toBeDisabled())
    fireEvent.change(batchSel(), { target: { value: 'b-dlitt-1' } })
    expect(batchSel()).toHaveValue('b-dlitt-1')
    fireEvent.change(courseSel(), { target: { value: 'c-other' } })
    await waitFor(() => expect(batchSel()).toHaveValue('')) // batch cleared
  })
})

// ── Enabled/disabled validation (tests 16,17,18) ─────────────────────────────
describe('PublicApplicationsSection — enable validation', () => {
  it('rejects enabled=true without course/batch and does not call PUT', async () => {
    await renderLoaded({})
    fireEvent.click(enableToggle()) // enable, nothing selected
    fireEvent.click(saveBtn())
    await waitFor(() => expect(h.addToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Cannot save' })))
    expect(h.saveSettings).not.toHaveBeenCalled()
  })

  it('allows enabled=false with null IDs', async () => {
    await renderLoaded({})
    fireEvent.click(saveBtn())
    await waitFor(() => expect(h.saveSettings).toHaveBeenCalledTimes(1))
    expect(h.saveSettings.mock.calls[0][1].dlitt).toEqual({ enabled: false, course_id: null, batch_id: null })
  })

  it('allows enabled=false with configured IDs (state B) — no confirmation', async () => {
    await renderLoaded({ dlitt: { enabled: false, course_id: 'c-dlitt', batch_id: 'b-dlitt-1' } })
    await waitFor(() => expect(courseSel()).toHaveValue('c-dlitt'))
    fireEvent.click(saveBtn())
    await waitFor(() => expect(h.saveSettings).toHaveBeenCalledTimes(1))
    expect(confirmSpy).not.toHaveBeenCalled() // not enabling → no confirm
    expect(h.saveSettings.mock.calls[0][1].dlitt).toEqual({ enabled: false, course_id: 'c-dlitt', batch_id: 'b-dlitt-1' })
  })
})

// ── Enable confirmation (tests 19,20,21) ─────────────────────────────────────
describe('PublicApplicationsSection — enable confirmation', () => {
  async function setupEnabling() {
    await renderLoaded({ dlitt: { enabled: false, course_id: 'c-dlitt', batch_id: 'b-dlitt-1' } })
    await waitFor(() => expect(courseSel()).toHaveValue('c-dlitt'))
    fireEvent.click(enableToggle()) // disabled → enabled
  }

  it('requires confirmation when enabling from a disabled state', async () => {
    confirmSpy.mockReturnValue(true)
    await setupEnabling()
    fireEvent.click(saveBtn())
    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1))
    expect(confirmSpy.mock.calls[0][0]).toMatch(/create real applicant records/i)
    await waitFor(() => expect(h.saveSettings).toHaveBeenCalledTimes(1))
  })

  it('canceling the confirmation prevents the save', async () => {
    confirmSpy.mockReturnValue(false)
    await setupEnabling()
    fireEvent.click(saveBtn())
    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1))
    expect(h.saveSettings).not.toHaveBeenCalled()
  })
})

// ── Double-submit guard (test 22) ────────────────────────────────────────────
describe('PublicApplicationsSection — save safety', () => {
  it('prevents double submission (Save disabled while saving)', async () => {
    let resolveSave
    h.saveSettings.mockImplementation(() => new Promise((res) => { resolveSave = () => res({ data: {} }) }))
    await renderLoaded({})
    const btn = saveBtn()      // same DOM node persists across re-renders (label changes to "Saving…")
    fireEvent.click(btn)       // enabled=false, valid, no confirm
    fireEvent.click(btn)       // second click while pending — button is now disabled
    await waitFor(() => expect(btn).toBeDisabled())
    expect(h.saveSettings).toHaveBeenCalledTimes(1)
    resolveSave()
    await waitFor(() => expect(btn).not.toBeDisabled())
  })
})
