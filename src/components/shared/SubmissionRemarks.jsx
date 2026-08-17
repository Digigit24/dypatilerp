/**
 * SubmissionRemarks — the feedback thread on a submission (typically an
 * uploaded progress report).
 *
 * Deliberately independent of the approval chain: a coordinator, academic guide
 * or industry mentor can leave a note at any point without approving or
 * rejecting, and every note stays attached to the report with its author and
 * timestamp. The owning scholar reads the thread but cannot post into it — the
 * backend enforces both halves of that rule; this only mirrors it in the UI.
 */
import { Loader2, MessageSquare, Send, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  addSubmissionRemark, deleteSubmissionRemark, getSubmissionRemarks,
} from '../../api/services/submissionService.js'
import { useAuthStore } from '../../store/authStore.js'
import { usePermStore } from '../../store/permStore.js'
import { useUiStore } from '../../store/uiStore.js'

const ROLE_LABEL = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  academic_guide: 'Academic Guide',
  industry_mentor: 'Industry Mentor',
}

const STAFF_ROLES = ['admin', 'coordinator', 'academic_guide', 'industry_mentor']

// Roles an admin can post a remark "as" — the author stays the admin, only
// the displayed tag changes, so a coordinator/guide/mentor's feedback can be
// recorded on their behalf when they're not the one typing it in.
const POST_AS_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'academic_guide', label: 'Academic Guide' },
  { value: 'industry_mentor', label: 'Industry Mentor' },
]

export default function SubmissionRemarks({ submissionId, onCountChange }) {
  const [remarks, setRemarks] = useState(null)
  const [draft, setDraft] = useState('')
  const [postAs, setPostAs] = useState('admin')
  const [busy, setBusy] = useState(false)
  const addToast = useUiStore((s) => s.addToast)
  const currentUser = useAuthStore((s) => s.currentUser)
  const isAdmin = usePermStore((s) => s.hasRole('admin'))
  const canPost = usePermStore((s) => STAFF_ROLES.some((r) => s.hasRole(r)))

  useEffect(() => {
    let alive = true
    setRemarks(null)
    if (!submissionId) return undefined
    getSubmissionRemarks(submissionId)
      .then((r) => { if (alive) setRemarks(r.data || []) })
      .catch(() => { if (alive) setRemarks([]) })
    return () => { alive = false }
  }, [submissionId])

  const post = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      const r = await addSubmissionRemark(submissionId, text, isAdmin ? postAs : null)
      const next = [r.data, ...(remarks || [])]
      setRemarks(next)
      onCountChange?.(next.length)
      setDraft('')
    } catch (err) {
      addToast({ type: 'error', title: 'Could not save the feedback', message: err.response?.data?.message || err.message })
    } finally { setBusy(false) }
  }

  const remove = async (remarkId) => {
    try {
      await deleteSubmissionRemark(submissionId, remarkId)
      const next = (remarks || []).filter((x) => x.id !== remarkId)
      setRemarks(next)
      onCountChange?.(next.length)
    } catch (err) {
      addToast({ type: 'error', title: 'Could not delete the feedback', message: err.response?.data?.message || err.message })
    }
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
        <MessageSquare size={13} /> Feedback
      </p>

      {canPost && (
        <div className="mt-3">
          <textarea
            className="textarea h-20 w-full"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add feedback for this report…"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {isAdmin ? (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--secondary)]">
                Post as
                <select
                  className="input h-9 py-0 text-xs"
                  value={postAs}
                  onChange={(e) => setPostAs(e.target.value)}
                >
                  {POST_AS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            ) : <span />}
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              disabled={!draft.trim() || busy}
              onClick={post}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {busy ? 'Posting…' : 'Post Feedback'}
            </button>
          </div>
          {isAdmin && postAs !== 'admin' && (
            <p className="mt-1.5 text-[11px] text-[color:var(--muted)]">
              Posted under your name, tagged as {POST_AS_OPTIONS.find((o) => o.value === postAs)?.label} on their behalf.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {remarks === null ? (
          <p className="text-sm text-[color:var(--secondary)]">Loading feedback…</p>
        ) : remarks.length === 0 ? (
          <p className="rounded-lg bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--secondary)]">
            No feedback yet.{canPost ? ' Be the first to leave feedback.' : ''}
          </p>
        ) : (
          remarks.map((r) => {
            const author = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Reviewer'
            const mine = currentUser?.id && r.author_user_id === currentUser.id
            return (
              <div key={r.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[color:var(--text)]">
                      {author}
                      {r.author_role && (
                        <span className="ml-2 rounded-full bg-[color:var(--accent-tint)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                          {ROLE_LABEL[r.author_role] || r.author_role}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                  {(mine || isAdmin) && (
                    <button
                      type="button"
                      title="Delete feedback"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[color:var(--muted)] hover:bg-[color:var(--border)] hover:text-red-500"
                      onClick={() => remove(r.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[color:var(--text)]">{r.remark}</p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
