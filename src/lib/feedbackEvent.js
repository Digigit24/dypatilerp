/**
 * Reduce a submission's approval rows AND its free-form remarks thread to
 * the single most recent "feedback event" worth surfacing to a scholar:
 * document-style feedback, a revision request, a plain approval, or a
 * remark left by a reviewer — whichever happened most recently. Returns
 * null if nothing has happened yet (still pending, no reviewer action,
 * no remarks posted).
 *
 * The displayed *label* (kind/stage/author) always follows the single most
 * recent event, but its *text* falls back to the most recent event that
 * actually carries text. Without this split, a final-stage approval given
 * with no comment (very common — the "Approve" button's feedback field is
 * optional) would win on recency and silently hide an earlier stage's real
 * written feedback, making an approved submission look like it got no
 * feedback at all.
 */
export const latestFeedbackEvent = (approvals, remarks) => {
  let bestLabel = null
  let bestText = null
  const considerLabel = (candidate) => {
    if (!candidate?.at) return
    if (!bestLabel || new Date(candidate.at) > new Date(bestLabel.at)) bestLabel = candidate
  }
  const considerText = (candidate) => {
    if (!candidate?.at || !candidate.text) return
    if (!bestText || new Date(candidate.at) > new Date(bestText.at)) bestText = candidate
  }
  const consider = (candidate) => { considerLabel(candidate); considerText(candidate) }

  for (const a of approvals || []) {
    const at = a.feedback_updated_at || a.action_at
    if (!at) continue
    if (a.feedback_html) consider({ at, kind: 'feedback', text: a.feedback_html, stage: a.stage })
    if (a.status === 'needs_revision' && a.comments) {
      consider({ at, kind: 'revision', text: a.comments, stage: a.stage })
    } else if (a.status === 'approved') {
      considerLabel({ at, kind: 'approved', text: a.comments || null, stage: a.stage })
      if (a.comments) considerText({ at, kind: 'approved', text: a.comments, stage: a.stage })
    }
  }

  for (const r of remarks || []) {
    if (!r.created_at) continue
    const author = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Reviewer'
    consider({ at: r.created_at, kind: 'remark', text: r.remark, author })
  }

  if (!bestLabel) return null
  if (bestLabel.text) return bestLabel
  if (bestText) return { ...bestLabel, text: bestText.text, stage: bestText.stage ?? bestLabel.stage, author: bestText.author ?? bestLabel.author }
  return bestLabel
}
