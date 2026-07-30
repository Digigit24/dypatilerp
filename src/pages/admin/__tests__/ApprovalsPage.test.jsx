import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const store = vi.hoisted(() => ({ currentCourse: { id: 'c1' }, currentBatch: null }))
vi.mock('../../../store/courseStore.js', () => ({ useCourseStore: () => store }))
vi.mock('../../../store/uiStore.js', () => ({ useUiStore: (s) => s({ addToast: vi.fn() }) }))
vi.mock('../../../hooks/useScrollLock.js', () => ({ default: () => {} }))
vi.mock('../../../api/services/videoService.js', () => ({ getSubmissionFileUrl: vi.fn().mockResolvedValue({ data: { url: null } }) }))
vi.mock('../../../api/services/submissionService.js', () => ({ getSubmissions: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('../../../api/services/approvalService.js', () => ({ getApprovals: vi.fn(), reviewSubmission: vi.fn() }))

import { getApprovals } from '../../../api/services/approvalService.js'
import ApprovalsPage from '../ApprovalsPage.jsx'

const ROWS = [
  { id: 'a1', submission_id: 's1', title: 'Progress Report 1', stage: 'coordinator', status: 'pending',
    student_first_name: 'Rahul', student_last_name: 'Verma', student_email: 'rahul@x.edu',
    batch_name: 'ABRF-2024-A', course_name: 'Applied Business Research', reviewer_first_name: 'Super', reviewer_last_name: 'Admin' },
  { id: 'a2', submission_id: 's2', title: 'Thesis Ch. 2', stage: 'academic_guide', status: 'under_review',
    student_first_name: 'Anita', student_last_name: 'Desai', student_email: 'anita@x.edu',
    batch_name: 'DMBR-2024-A', course_name: 'Digital Marketing', reviewer_first_name: 'Guide', reviewer_last_name: 'One' },
  { id: 'a3', submission_id: 's3', title: 'Report B', stage: 'coordinator', status: 'pending',
    student_first_name: 'Vikram', student_last_name: 'Iyer', batch_name: 'ABRF-2024-A', course_name: 'Applied Business Research' },
]

beforeEach(() => {
  vi.clearAllMocks()
  store.currentCourse = { id: 'c1' }; store.currentBatch = null
  getApprovals.mockResolvedValue({ data: ROWS })
})

describe('ApprovalsPage', () => {
  it('renders the scholar name, batch and course from the approvals response', async () => {
    render(<ApprovalsPage />)
    expect(await screen.findByText('Rahul Verma')).toBeInTheDocument()
    expect(screen.getByText('Anita Desai')).toBeInTheDocument()
    // batch + course cells
    expect(screen.getAllByText('ABRF-2024-A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Applied Business Research').length).toBeGreaterThan(0)
    expect(screen.getByText('Digital Marketing')).toBeInTheDocument()
    // report titles
    expect(screen.getByText('Progress Report 1')).toBeInTheDocument()
  })

  it('derives stage summary cards dynamically from the rows', async () => {
    render(<ApprovalsPage />)
    await screen.findByText('Rahul Verma')
    // two coordinator + one academic_guide → a "2" and a "1" card
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    // no hardcoded industry_mentor card when absent
    expect(screen.queryByText(/industry mentor/i)).not.toBeInTheDocument()
  })

  it('shows Scholar · Batch · Course in the detail drawer', async () => {
    const user = userEvent.setup()
    render(<ApprovalsPage />)
    await user.click(await screen.findByText('Progress Report 1'))
    const drawer = await screen.findByText('Submission Detail')
    const header = drawer.closest('div')
    expect(within(header).getByText(/Rahul Verma · ABRF-2024-A · Applied Business Research · coordinator/i)).toBeInTheDocument()
  })

  it('refetches when the selected course changes', async () => {
    const { rerender } = render(<ApprovalsPage />)
    await waitFor(() => expect(getApprovals).toHaveBeenCalledTimes(1))
    store.currentCourse = { id: 'c2' }
    rerender(<ApprovalsPage />)
    await waitFor(() => expect(getApprovals).toHaveBeenCalledTimes(2))
  })
})
