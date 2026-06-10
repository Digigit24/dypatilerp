import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../../../store/authStore.js', () => ({
  useAuthStore: (selector) => selector({ currentUser: auth.user, role: null }),
}))

vi.mock('../../../api/services/researchProfileService.js', () => ({
  getProfile: vi.fn(),
  togglePublic: vi.fn(),
}))

import { getProfile } from '../../../api/services/researchProfileService.js'
import ResearchProfilePage from '../ResearchProfilePage.jsx'

const STUDENT = { id: 'cccc1111-2222-4333-8444-555555555555' }
const profile = {
  student_id: STUDENT.id,
  is_public: false,
  public_slug: 'priya',
  research_papers: [{ id: 'p1', title: 'Paper A', is_verified: true }],
  patents: [],
  workshops_seminars: [],
  publications: [],
  skills: ['Genomics', 'Python'],
}

const renderPage = () => render(<MemoryRouter><ResearchProfilePage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = STUDENT
  getProfile.mockResolvedValue({ data: profile })
})

describe('ResearchProfilePage', () => {
  it('shows a skeleton while loading', () => {
    getProfile.mockReturnValue(new Promise(() => {}))
    const { container } = renderPage()
    expect(container.querySelector('.shimmer')).toBeInTheDocument()
  })

  it('does not fetch without an authenticated user id', () => {
    auth.user = null
    renderPage()
    expect(getProfile).not.toHaveBeenCalled()
  })

  it('fetches the profile for the authenticated user id (not hardcoded)', async () => {
    renderPage()
    await waitFor(() => expect(getProfile).toHaveBeenCalledWith(STUDENT.id))
    expect(getProfile).not.toHaveBeenCalledWith('stu_001')
  })

  it('renders profile sections and skills after load', async () => {
    renderPage()
    expect(await screen.findByText('Research Papers')).toBeInTheDocument()
    expect(screen.getByText('Paper A')).toBeInTheDocument()
    expect(screen.getByText('Genomics')).toBeInTheDocument()
  })
})
