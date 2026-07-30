import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const auth = vi.hoisted(() => ({ user: null }))
const dz = vi.hoisted(() => ({ onDrop: null }))

vi.mock('../../../store/authStore.js', () => ({
  useAuthStore: (selector) => selector({ currentUser: auth.user, role: null }),
}))

// tiptap editor is DOM-heavy — stub it with a valid (>=3 char) title.
vi.mock('@tiptap/react', () => ({
  useEditor: () => ({
    getText: () => 'Progress Report 1',
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
  submitForReview: vi.fn(),
  uploadSubmissionAttachment: vi.fn(),
}))
vi.mock('../../../api/services/assignmentService.js', () => ({ getMyAssignments: vi.fn() }))

import { createSubmission, submitForReview, uploadSubmissionAttachment } from '../../../api/services/submissionService.js'
import SubmitPage from '../SubmitPage.jsx'

const STUDENT = { id: 'eeee1111-2222-4333-8444-555555555555' }
const renderPage = () => render(<MemoryRouter><SubmitPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = STUDENT
  dz.onDrop = null
  createSubmission.mockResolvedValue({ data: { id: 'sub1' } })
  uploadSubmissionAttachment.mockResolvedValue({})
  submitForReview.mockResolvedValue({})
})

describe('SubmitPage', () => {
  it('renders the progress-report header and editor', () => {
    renderPage()
    expect(screen.getByText('Submit Progress Report')).toBeInTheDocument()
    expect(screen.getByTestId('editor')).toBeInTheDocument()
  })

  it('keeps Submit disabled until a file is attached', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /submit for approval/i })).toBeDisabled()
  })

  it('enables submit after a file is dropped and shows the file name', async () => {
    renderPage()
    await act(async () => { dz.onDrop([{ name: 'report.pdf', size: 2 * 1024 * 1024 }]) })
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit for approval/i })).toBeEnabled()
  })

  it('creates a progress_report draft, uploads the file, then submits', async () => {
    const user = userEvent.setup()
    renderPage()
    await act(async () => { dz.onDrop([{ name: 'report.pdf', size: 1024 }]) })
    await user.click(screen.getByRole('button', { name: /submit for approval/i }))
    await user.click(await screen.findByRole('button', { name: /confirm submission/i }))

    await waitFor(() => expect(createSubmission).toHaveBeenCalledTimes(1))
    expect(createSubmission.mock.calls[0][0]).toMatchObject({
      title: 'Progress Report 1',
      submission_type: 'progress_report',
    })
    await waitFor(() => expect(uploadSubmissionAttachment).toHaveBeenCalledTimes(1))
    expect(uploadSubmissionAttachment.mock.calls[0][0]).toBe('sub1')
    expect(uploadSubmissionAttachment.mock.calls[0][1]).toMatchObject({ name: 'report.pdf' })
    await waitFor(() => expect(submitForReview).toHaveBeenCalledWith('sub1'))
  })
})
