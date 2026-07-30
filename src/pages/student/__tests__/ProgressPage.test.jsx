import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../../../store/authStore.js', () => ({
  useAuthStore: (selector) => selector({ currentUser: auth.user, role: null }),
}))

vi.mock('../../../api/services/submissionService.js', () => ({ getSubmissionsByStudent: vi.fn() }))
vi.mock('../../../api/services/approvalService.js', () => ({ getApprovalsBySubmission: vi.fn() }))
vi.mock('../../../api/services/progressReportService.js', () => ({ getProgressReportByStudent: vi.fn() }))
vi.mock('../../../api/services/videoService.js', () => ({ getSubmissionFileUrl: vi.fn() }))

import { getSubmissionsByStudent } from '../../../api/services/submissionService.js'
import { getApprovalsBySubmission } from '../../../api/services/approvalService.js'
import { getProgressReportByStudent } from '../../../api/services/progressReportService.js'
import { getSubmissionFileUrl } from '../../../api/services/videoService.js'
import ProgressPage from '../ProgressPage.jsx'

const STUDENT = { id: 'aaaa1111-2222-4333-8444-555555555555' }
const renderPage = () => render(<MemoryRouter><ProgressPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = STUDENT
  getSubmissionsByStudent.mockResolvedValue({ data: [
    { id: 's1', title: 'Progress Report 1', submission_type: 'progress_report', status: 'approved', submitted_at: '2026-01-01', file_urls: [{ name: 'report.pdf', media_id: 'm1', type: 'pdf' }] },
    { id: 's2', title: 'Some Research Paper', submission_type: 'research_paper', status: 'submitted', file_urls: [] },
  ] })
  getApprovalsBySubmission.mockResolvedValue({ data: [{ id: 'a1', comments: 'Well done — approved.' }] })
  getProgressReportByStudent.mockResolvedValue({ data: [] })
  getSubmissionFileUrl.mockResolvedValue({ data: { url: 'http://example/file' } })
})

describe('ProgressPage', () => {
  it('shows a skeleton while loading', () => {
    getSubmissionsByStudent.mockReturnValue(new Promise(() => {}))
    const { container } = renderPage()
    expect(container.querySelector('.shimmer')).toBeInTheDocument()
  })

  it('does not fetch without an authenticated user id', () => {
    auth.user = null
    renderPage()
    expect(getSubmissionsByStudent).not.toHaveBeenCalled()
  })

  it('fetches submissions for the authenticated user id (not hardcoded)', async () => {
    renderPage()
    await waitFor(() => expect(getSubmissionsByStudent).toHaveBeenCalledWith(STUDENT.id))
    expect(getSubmissionsByStudent).not.toHaveBeenCalledWith('stu_001')
  })

  it('lists only progress_report submissions and shows their institute feedback', async () => {
    renderPage()
    expect(await screen.findByText('Progress Report 1')).toBeInTheDocument()
    expect(screen.queryByText('Some Research Paper')).not.toBeInTheDocument()
    expect(await screen.findByText('Well done — approved.')).toBeInTheDocument()
  })

  it('offers an Upload Progress Report action linking to /student/submit', async () => {
    renderPage()
    const link = await screen.findByRole('link', { name: /upload progress report/i })
    expect(link).toHaveAttribute('href', '/student/submit')
  })

  it('shows an empty state when there are no progress reports', async () => {
    getSubmissionsByStudent.mockResolvedValue({ data: [] })
    renderPage()
    expect(await screen.findByText(/No progress reports yet/i)).toBeInTheDocument()
  })
})
