import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * FeesPage tests — covers the diff that swapped the hardcoded 'stu_001' for the
 * authenticated user's id, plus render / loading / empty / interaction states.
 */

// Mutable auth state controlled per test (vi.mock is hoisted above imports).
const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../../../store/authStore.js', () => ({
  useAuthStore: (selector) => selector({ currentUser: auth.user, role: auth.user?.roles?.[0] ?? null }),
}))

vi.mock('../../../api/services/feeService.js', () => ({
  getFeesByStudent: vi.fn(),
}))

import { getFeesByStudent } from '../../../api/services/feeService.js'
import FeesPage from '../FeesPage.jsx'

const STUDENT = { id: '99999999-8888-4777-8666-555555555555', batch_id: 'b1' }

const sampleFees = [
  { id: 'f1', fee_type: 'Semester 1', amount: 50000, status: 'paid', due_date: '2025-01-10', installment: 1, transaction_id: 'TXN1', receipt_url: 'http://x/r1' },
  { id: 'f2', fee_type: 'Semester 2', amount: 50000, status: 'pending', due_date: '2025-06-10', installment: 2, remarks: 'Due soon' },
]

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = STUDENT
  getFeesByStudent.mockResolvedValue({ data: sampleFees })
})

describe('FeesPage — loading state', () => {
  it('renders a skeleton before data resolves', () => {
    getFeesByStudent.mockReturnValue(new Promise(() => {})) // never resolves
    const { container } = render(<FeesPage />)
    expect(container.querySelector('.shimmer')).toBeInTheDocument()
  })

  it('does not call the service until a user id is available', () => {
    auth.user = null
    render(<FeesPage />)
    expect(getFeesByStudent).not.toHaveBeenCalled()
  })
})

describe('FeesPage — auth scoping (the diff)', () => {
  it('fetches fees for the authenticated user id, not a hardcoded id', async () => {
    render(<FeesPage />)
    await waitFor(() => expect(getFeesByStudent).toHaveBeenCalledWith(STUDENT.id))
    expect(getFeesByStudent).not.toHaveBeenCalledWith('stu_001')
  })
})

describe('FeesPage — data render', () => {
  it('renders fee cards and computed KPIs', async () => {
    render(<FeesPage />)
    expect(await screen.findByText('Semester 1')).toBeInTheDocument()
    expect(screen.getByText('Semester 2')).toBeInTheDocument()
    // Paid + Pending KPI labels present
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })
})

describe('FeesPage — empty state', () => {
  it('renders zeroed KPIs and no fee cards when there are no fees', async () => {
    getFeesByStudent.mockResolvedValue({ data: [] })
    render(<FeesPage />)
    expect(await screen.findByText('Payment Options')).toBeInTheDocument()
    expect(screen.queryByText('Semester 1')).not.toBeInTheDocument()
  })
})

describe('FeesPage — interaction', () => {
  it('opens the payment preview when Pay Now is clicked on a pending fee', async () => {
    const user = userEvent.setup()
    render(<FeesPage />)
    const payBtn = await screen.findByRole('button', { name: /pay now/i })
    await user.click(payBtn)
    expect(await screen.findByText('Payment Preview')).toBeInTheDocument()
  })
})
