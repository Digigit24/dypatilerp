import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = vi.hoisted(() => ({ user: { id: 'stu-uuid-1' } }))
vi.mock('../../../store/authStore.js', () => ({ useAuthStore: (s) => s({ currentUser: auth.user }) }))
vi.mock('../../../store/uiStore.js', () => ({ useUiStore: (s) => s({ addToast: vi.fn() }) }))

vi.mock('../../../api/http.js', () => ({ default: { get: vi.fn() } }))
vi.mock('../../../api/services/submissionService.js', () => ({ getSubmissionsByStudent: vi.fn() }))
vi.mock('../../../api/services/notificationService.js', () => ({ getNotifications: vi.fn(), markAllAsRead: vi.fn() }))
vi.mock('../../../api/services/studentService.js', () => ({ getStudentById: vi.fn() }))

import http from '../../../api/http.js'
import { getSubmissionsByStudent } from '../../../api/services/submissionService.js'
import DashboardPage from '../DashboardPage.jsx'

const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = { id: 'stu-uuid-1' }
  http.get.mockResolvedValue({ data: { data: {
    enrollment: { batch_name: 'ABRF-2024-A' },
    progress: { completion_percentage: 40 },
    guides: [],
    unread_notifications: 2,
  } } })
  getSubmissionsByStudent.mockResolvedValue({ data: [
    { id: 's1', title: 'Progress Report 1', status: 'submitted', submitted_at: '2026-01-01' },
    { id: 's2', title: 'Progress Report 2', status: 'under_review', submitted_at: '2026-02-01' },
    { id: 's3', title: 'Old Draft', status: 'needs_revision', submitted_at: '2026-03-01' },
    { id: 's4', title: 'Approved One', status: 'approved', submitted_at: '2026-04-01' },
  ] })
})

describe('DashboardPage (student)', () => {
  it('shows real submission titles in Recent Submissions', async () => {
    renderPage()
    expect(await screen.findByText('Progress Report 1')).toBeInTheDocument()
    expect(screen.getByText('Progress Report 2')).toBeInTheDocument()
  })

  it('counts submitted + under_review as pending, needs_revision separately', async () => {
    renderPage()
    // 2 pending (submitted + under_review), 1 needs revision
    expect(await screen.findByText('2 Pending Approvals')).toBeInTheDocument()
    expect(screen.getByText('1 Needs your revision')).toBeInTheDocument()
  })

  it('renames the quick action to "Submit Progress Report"', async () => {
    renderPage()
    const link = await screen.findByRole('link', { name: /submit progress report/i })
    expect(link).toHaveAttribute('href', '/student/submit')
    expect(screen.queryByRole('link', { name: /^submit title$/i })).not.toBeInTheDocument()
  })
})
