import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * ResearchProfilePage now delegates rendering to StudentProfileView (defaultTab
 * "research") instead of fetching the profile itself — see ISSUE-005 resolution.
 * These tests assert the header + prop wiring + the currentUser gating.
 */

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../../../store/authStore.js', () => ({
  useAuthStore: (selector) => selector({ currentUser: auth.user, role: null }),
}))

// StudentProfileView is heavy (many services); stub it and assert the prop wiring.
vi.mock('../../../components/shared/StudentProfileView.jsx', () => ({
  default: ({ studentId, isAdminView, defaultTab }) => (
    <div
      data-testid="profile-view"
      data-student-id={studentId}
      data-admin={String(isAdminView)}
      data-tab={defaultTab}
    />
  ),
}))

import ResearchProfilePage from '../ResearchProfilePage.jsx'

const STUDENT = { id: 'cccc1111-2222-4333-8444-555555555555' }

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = STUDENT
})

describe('ResearchProfilePage', () => {
  it('always renders the page header', () => {
    render(<ResearchProfilePage />)
    expect(screen.getByText('Research Profile')).toBeInTheDocument()
  })

  it('passes the authenticated user id and research tab to StudentProfileView', () => {
    render(<ResearchProfilePage />)
    const view = screen.getByTestId('profile-view')
    expect(view).toHaveAttribute('data-student-id', STUDENT.id)
    expect(view).toHaveAttribute('data-admin', 'false')
    expect(view).toHaveAttribute('data-tab', 'research')
  })

  it('does not render the profile view when there is no authenticated user', () => {
    auth.user = null
    render(<ResearchProfilePage />)
    expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument()
  })
})
