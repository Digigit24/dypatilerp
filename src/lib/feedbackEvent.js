/**
 * Reduce a submission's approval rows AND its free-form remarks thread to
 * the single most recent "feedback event" worth surfacing to a scholar:
 * document-style feedback, a revision request, a plain approval, or a
 * remark left by a reviewer — whichever happened most recently. Returns
 * null if nothing has happened yet (still pending, no reviewer action,
 * no remarks posted).
 */
export const latestFeedbackEvent = (approvals, remarks) => {
  let best = null
  const consider = (candidate) => {
    if (!candidate?.at) return
    if (!best || new Date(candidate.at) > new Date(best.at)) best = candidate
  }

  for (const a of approvals || []) {
    const at = a.feedback_updated_at || a.action_at
    if (!at) continue
    if (a.feedback_html) consider({ at, kind: 'feedback', text: a.feedback_html, stage: a.stage })
    if (a.status === 'needs_revision' && a.comments) {
      consider({ at, kind: 'revision', text: a.comments, stage: a.stage })
    } else if (a.status === 'approved') {
      consider({ at, kind: 'approved', text: a.comments || null, stage: a.stage })
    }
  }

  for (const r of remarks || []) {
    if (!r.created_at) continue
    const author = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Reviewer'
    consider({ at: r.created_at, kind: 'remark', text: r.remark, author })
  }

  return best
}
