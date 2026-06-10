import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../../../store/authStore.js', () => ({
  useAuthStore: (selector) => selector({ currentUser: auth.user, role: null }),
}))

vi.mock('../../../api/services/submissionService.js', () => ({
  getSubmissionsByStudent: vi.fn(),
}))
vi.mock('../../../api/services/approvalService.js', () => ({
  getApprovalsBySubmission: vi.fn(),
}))

import { getSubmissionsByStudent } from '../../../api/services/submissionService.js'
import { getApprovalsBySubmission } from '../../../api/services/approvalService.js'
import SubmissionsPage from '../SubmissionsPage.jsx'

const STUDENT = { id: 'bbbb1111-2222-4333-8444-555555555555' }
const submissions = [
  { id: 's1', title: 'CRISPR Screening', report_period: 2, submitted_at: '2025-03-01', status: 'pending', title_version: 1 },
]
const approvals = [{ id: 'a1', stage: 'coordinator', status: 'pending', comments: '' }]

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = STUDENT
  getSubmissionsByStudent.mockResolvedValue({ data: submissions })
  getApprovalsBySubmission.mockResolvedValue({ data: approvals })
})

describe('SubmissionsPage', () => {
  it('shows a skeleton while loading', () => {
    getSubmissionsByStudent.mockReturnValue(new Promise(() => {}))
    const { container } = render(<SubmissionsPage />)
    expect(container.querySelector('.shimmer')).toBeInTheDocument()
  })

  it('does not fetch without an authenticated user id', () => {
    auth.user = null
    render(<SubmissionsPage />)
    expect(getSubmissionsByStudent).not.toHaveBeenCalled()
  })

  it('fetches submissions for the authenticated user id (not hardcoded)', async () => {
    render(<SubmissionsPage />)
    await waitFor(() => expect(getSubmissionsByStudent).toHaveBeenCalledWith(STUDENT.id))
    expect(getSubmissionsByStudent).not.toHaveBeenCalledWith('stu_001')
  })

  it('renders submission cards with approvals after load', async () => {
    render(<SubmissionsPage />)
    expect(await screen.findByText('CRISPR Screening')).toBeInTheDocument()
    await waitFor(() => expect(getApprovalsBySubmission).toHaveBeenCalledWith('s1'))
  })

  it('opens the detail drawer when a card is clicked', async () => {
    const user = userEvent.setup()
    render(<SubmissionsPage />)
    const card = await screen.findByText('CRISPR Screening')
    await user.click(card)
    expect(await screen.findByText('Submission Detail')).toBeInTheDocument()
  })

  it('renders empty state with no submission cards', async () => {
    getSubmissionsByStudent.mockResolvedValue({ data: [] })
    render(<SubmissionsPage />)
    expect(await screen.findByText('My Submissions')).toBeInTheDocument()
    expect(screen.queryByText('CRISPR Screening')).not.toBeInTheDocument()
  })
})
