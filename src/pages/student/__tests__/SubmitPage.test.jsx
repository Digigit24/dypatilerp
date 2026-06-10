import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const auth = vi.hoisted(() => ({ user: null }))
const dz = vi.hoisted(() => ({ onDrop: null }))

vi.mock('../../../store/authStore.js', () => ({
  useAuthStore: (selector) => selector({ currentUser: auth.user, role: null }),
}))

// tiptap editor is DOM-heavy — stub it with a valid (20-200 char) title.
vi.mock('@tiptap/react', () => ({
  useEditor: () => ({
    getText: () => 'CRISPR Screening for Biomarker Discovery',
    chain: () => ({ focus: () => ({ toggleBold: () => ({ run: () => {} }), toggleItalic: () => ({ run: () => {} }) }) }),
  }),
  EditorContent: () => <div data-testid="editor" />,
}))
vi.mock('@tiptap/starter-kit', () => ({ default: {} }))

// Capture the dropzone onDrop so the test can simulate a file selection.
vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }) => {
    dz.onDrop = onDrop
    return { getRootProps: () => ({}), getInputProps: () => ({}), isDragActive: false }
  },
}))

vi.mock('../../../api/services/submissionService.js', () => ({
  createSubmission: vi.fn(),
}))

import { createSubmission } from '../../../api/services/submissionService.js'
import SubmitPage from '../SubmitPage.jsx'

const STUDENT = { id: 'eeee1111-2222-4333-8444-555555555555', batch_id: 'batch-uuid-1' }

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = STUDENT
  dz.onDrop = null
  createSubmission.mockResolvedValue({})
})

describe('SubmitPage', () => {
  it('renders the page header and editor', () => {
    render(<SubmitPage />)
    expect(screen.getByText('Submit Title & Presentation')).toBeInTheDocument()
    expect(screen.getByTestId('editor')).toBeInTheDocument()
  })

  it('keeps Submit disabled until a file is attached', () => {
    render(<SubmitPage />)
    expect(screen.getByRole('button', { name: /submit for approval/i })).toBeDisabled()
  })

  it('enables submit after a file is dropped and shows the file name', async () => {
    render(<SubmitPage />)
    await act(async () => { dz.onDrop([{ name: 'deck.pdf', size: 2 * 1024 * 1024 }]) })
    expect(screen.getByText('deck.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit for approval/i })).toBeEnabled()
  })

  it('submits with the authenticated user id and batch id (not hardcoded)', async () => {
    const user = userEvent.setup()
    render(<SubmitPage />)
    await act(async () => { dz.onDrop([{ name: 'deck.pdf', size: 1024 }]) })
    await user.click(screen.getByRole('button', { name: /submit for approval/i }))
    await user.click(await screen.findByRole('button', { name: /confirm submission/i }))
    await waitFor(() => expect(createSubmission).toHaveBeenCalledTimes(1))
    expect(createSubmission.mock.calls[0][0]).toMatchObject({
      student_id: STUDENT.id,
      batch_id: STUDENT.batch_id,
      title: 'CRISPR Screening for Biomarker Discovery',
      presentation_filename: 'deck.pdf',
      presentation_type: 'pdf',
    })
    // regression guard against the old hardcoded values
    expect(createSubmission.mock.calls[0][0].student_id).not.toBe('stu_001')
    expect(createSubmission.mock.calls[0][0].batch_id).not.toBe('batch_2024_A')
  })
})
