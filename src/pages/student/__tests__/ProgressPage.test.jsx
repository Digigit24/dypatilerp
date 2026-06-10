import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../../../store/authStore.js', () => ({
  useAuthStore: (selector) => selector({ currentUser: auth.user, role: null }),
}))

vi.mock('../../../api/services/progressReportService.js', () => ({
  getProgressReportByStudent: vi.fn(),
  generateProgressReportPDF: vi.fn(),
}))

import { getProgressReportByStudent, generateProgressReportPDF } from '../../../api/services/progressReportService.js'
import ProgressPage from '../ProgressPage.jsx'

const STUDENT = { id: 'aaaa1111-2222-4333-8444-555555555555' }
const reports = [
  {
    id: 'r1', period_label: 'First Review Period', status: 'completed', completion_percentage: 80,
    submissions: [{ submission_id: 's1', title: 'CRISPR Screening', final_status: 'approved' }],
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = STUDENT
  getProgressReportByStudent.mockResolvedValue({ data: reports })
  generateProgressReportPDF.mockResolvedValue({})
})

describe('ProgressPage', () => {
  it('shows a skeleton while loading', () => {
    getProgressReportByStudent.mockReturnValue(new Promise(() => {}))
    const { container } = render(<ProgressPage />)
    expect(container.querySelector('.shimmer')).toBeInTheDocument()
  })

  it('does not fetch without an authenticated user id', () => {
    auth.user = null
    render(<ProgressPage />)
    expect(getProgressReportByStudent).not.toHaveBeenCalled()
  })

  it('fetches reports for the authenticated user id (not hardcoded)', async () => {
    render(<ProgressPage />)
    await waitFor(() => expect(getProgressReportByStudent).toHaveBeenCalledWith(STUDENT.id))
    expect(getProgressReportByStudent).not.toHaveBeenCalledWith('stu_001')
  })

  it('renders report content after load', async () => {
    render(<ProgressPage />)
    expect(await screen.findByText('First Review Period')).toBeInTheDocument()
    expect(screen.getByText('CRISPR Screening')).toBeInTheDocument()
  })

  it('triggers PDF generation on Download PDF click', async () => {
    const user = userEvent.setup()
    render(<ProgressPage />)
    const btn = await screen.findByRole('button', { name: /download pdf/i })
    await user.click(btn)
    await waitFor(() => expect(generateProgressReportPDF).toHaveBeenCalledWith('r1'))
  })
})
