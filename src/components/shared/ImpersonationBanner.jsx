import { Eye } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { endImpersonation as endImpersonationApi } from '../../api/services/userService.js'

/**
 * Persistent, impossible-to-miss strip shown for the entire duration of an
 * admin "view as" session. Renders nothing (zero DOM, zero layout impact) for
 * every normal, non-impersonated session.
 */
export default function ImpersonationBanner() {
  const impersonation = useAuthStore((s) => s.impersonation)
  const currentUser = useAuthStore((s) => s.currentUser)
  const endImpersonation = useAuthStore((s) => s.endImpersonation)
  const addToast = useUiStore((s) => s.addToast)
  const navigate = useNavigate()
  // Guards against a double-click firing two concurrent return flows — the
  // store-side endImpersonation() is idempotent regardless, but this also
  // stops a redundant second toast/navigate.
  const [returning, setReturning] = useState(false)

  if (!impersonation) return null

  const targetName = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ')
    : 'this user'

  const handleReturn = async () => {
    if (returning) return
    setReturning(true)
    // Close the session server-side FIRST, while the impersonation token is
    // still the active one — the store swap below immediately points every
    // subsequent request back at the admin's own token.
    await endImpersonationApi()
    endImpersonation()
    addToast({
      type: 'success',
      title: 'Back in your own account',
      message: `You've returned from viewing as ${targetName}.`,
    })
    navigate('/admin', { replace: true })
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-center text-sm font-semibold text-white"
      style={{ background: '#b45309' }}
    >
      <span className="inline-flex items-center gap-2">
        <Eye size={15} />
        Viewing as <strong>{targetName}</strong> — actions taken now are logged under your admin account
      </span>
      <button
        onClick={handleReturn}
        disabled={returning}
        className="rounded-lg bg-white/15 px-3 py-1 font-semibold text-white transition hover:bg-white/25 disabled:opacity-60"
      >
        {returning ? 'Returning…' : 'Return to Admin'}
      </button>
    </div>
  )
}
