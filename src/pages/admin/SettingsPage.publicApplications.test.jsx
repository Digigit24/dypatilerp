import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react'

/**
 * Tests for the admin "Public Applications" Settings section.
 * All services + stores are mocked — no network, no backend, no production.
 * Covers: admin-only visibility, course→batch filtering, the exact save
 * payload shape, and the "cannot enable without course + batch" rule.
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
  { id: 'c-pd', name: 'Postdoc Program', code: 'POSTDOC' },
]
const BATCHES = {
  'c-dlitt': [{ id: 'b-dlitt-1', name: 'DLitt Intake 2026', code: 'DL26', course_id: 'c-dlitt' }],
  'c-pd': [{ id: 'b-pd-1', name: 'Postdoc 2026', code: 'PD26', course_id: 'c-pd' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  h.role.current = 'admin'
  h.getCourses.mockResolvedValue({ data: COURSES })
  h.getBatches.mockImplementation(({ course_id }) => Promise.resolve({ data: BATCHES[course_id] || [] }))
  h.getSettings.mockImplementation((key) =>
    Promise.resolve({ data: key === 'public_application_targets' ? {} : {} }))
  h.saveSettings.mockResolvedValue({ data: {} })
})

// combobox order: [0] dlitt course, [1] dlitt batch, [2] postdoc course, [3] postdoc batch
const comboboxes = () => screen.getAllByRole('combobox')

describe('PublicApplicationsSection — course → batch filtering', () => {
  it('disables the batch dropdown until a course is chosen, then loads that course\'s batches only', async () => {
    render(<PublicApplicationsSection />)
    await waitFor(() => expect(h.getCourses).toHaveBeenCalled())

    const [dlittCourse, dlittBatch] = comboboxes()
    expect(dlittBatch).toBeDisabled()

    fireEvent.change(dlittCourse, { target: { value: 'c-dlitt' } })

    await waitFor(() => expect(h.getBatches).toHaveBeenCalledWith({ course_id: 'c-dlitt' }))
    await waitFor(() => expect(comboboxes()[1]).not.toBeDisabled())

    const batchOptions = within(comboboxes()[1]).getAllByRole('option').map((o) => o.textContent)
    expect(batchOptions).toContain('DLitt Intake 2026 (DL26)')
    expect(batchOptions).not.toContain('Postdoc 2026 (PD26)') // only the chosen course's batches
  })
})

describe('PublicApplicationsSection — save payload', () => {
  it('saves exactly { program: { enabled, course_id, batch_id } } via PUT public_application_targets', async () => {
    render(<PublicApplicationsSection />)
    await waitFor(() => expect(h.getCourses).toHaveBeenCalled())

    fireEvent.change(comboboxes()[0], { target: { value: 'c-dlitt' } })          // dlitt course
    await waitFor(() => expect(comboboxes()[1]).not.toBeDisabled())
    fireEvent.change(comboboxes()[1], { target: { value: 'b-dlitt-1' } })         // dlitt batch
    fireEvent.click(screen.getByRole('button', { name: /Toggle public applications for Doctor of Letters/i })) // enable dlitt

    fireEvent.click(screen.getByRole('button', { name: /Save Public Application Settings/i }))

    await waitFor(() => expect(h.saveSettings).toHaveBeenCalledTimes(1))
    const [key, payload] = h.saveSettings.mock.calls[0]
    expect(key).toBe('public_application_targets')
    expect(payload).toEqual({
      dlitt: { enabled: true, course_id: 'c-dlitt', batch_id: 'b-dlitt-1' },
      postdoc: { enabled: false, course_id: '', batch_id: '' },
    })
    // no forbidden/extra keys smuggled into any program object
    for (const prog of Object.values(payload)) {
      expect(Object.keys(prog).sort()).toEqual(['batch_id', 'course_id', 'enabled'])
    }
  })
})

describe('PublicApplicationsSection — validation', () => {
  it('refuses to save an enabled program with no course/batch, and does not call PUT', async () => {
    render(<PublicApplicationsSection />)
    await waitFor(() => expect(h.getCourses).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /Toggle public applications for Doctor of Letters/i })) // enable, but no course/batch
    fireEvent.click(screen.getByRole('button', { name: /Save Public Application Settings/i }))

    await waitFor(() => expect(h.addToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Cannot save' })))
    expect(h.saveSettings).not.toHaveBeenCalled()
  })

  it('pre-fills saved targets and loads their batches on mount', async () => {
    h.getSettings.mockImplementation((key) => Promise.resolve({
      data: key === 'public_application_targets'
        ? { dlitt: { enabled: true, course_id: 'c-dlitt', batch_id: 'b-dlitt-1' } }
        : {},
    }))
    render(<PublicApplicationsSection />)
    await waitFor(() => expect(h.getBatches).toHaveBeenCalledWith({ course_id: 'c-dlitt' }))
    await waitFor(() => expect(comboboxes()[0]).toHaveValue('c-dlitt'))
    await waitFor(() => expect(comboboxes()[1]).toHaveValue('b-dlitt-1'))
  })
})

describe('SettingsPage — admin-only visibility', () => {
  it('shows the Public Applications section for role=admin', async () => {
    h.role.current = 'admin'
    render(<SettingsPage />)
    expect(await screen.findByText('Public Applications')).toBeInTheDocument()
  })

  it('hides the Public Applications section for non-admin roles (coordinator)', async () => {
    h.role.current = 'coordinator'
    render(<SettingsPage />)
    // let effects settle
    await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument())
    expect(screen.queryByText('Public Applications')).not.toBeInTheDocument()
    cleanup()
  })
})
