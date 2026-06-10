import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../../../store/authStore.js', () => ({
  useAuthStore: (selector) => selector({ currentUser: auth.user, role: null }),
}))

// StudentProfileView is heavy (many services); stub it and assert the prop wiring.
vi.mock('../../../components/shared/StudentProfileView.jsx', () => ({
  default: ({ studentId, isAdminView }) => (
    <div data-testid="profile-view" data-student-id={studentId} data-admin={String(isAdminView)} />
  ),
}))

import ProfilePage from '../ProfilePage.jsx'

const STUDENT = { id: 'dddd1111-2222-4333-8444-555555555555' }

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = STUDENT
})

describe('ProfilePage', () => {
  it('always renders the page header', () => {
    render(<ProfilePage />)
    expect(screen.getByText('My Profile')).toBeInTheDocument()
  })

  it('passes the authenticated user id to StudentProfileView (not hardcoded)', () => {
    render(<ProfilePage />)
    const view = screen.getByTestId('profile-view')
    expect(view).toHaveAttribute('data-student-id', STUDENT.id)
    expect(view).toHaveAttribute('data-admin', 'false')
  })

  it('does not render the profile view when there is no authenticated user', () => {
    auth.user = null
    render(<ProfilePage />)
    expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument()
  })
})
