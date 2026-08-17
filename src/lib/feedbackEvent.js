/**
 * Reduce a submission's approval rows to the single most recent "feedback
 * event" worth surfacing to a scholar: a document-style feedback note, a
 * revision request, or a plain approval — whichever happened most recently.
 * Returns null if nothing has actually happened yet (still pending, no
 * reviewer action taken).
 */
export const latestFeedbackEvent = (approvals) => {
  let best = null
  for (const a of approvals || []) {
    const at = a.feedback_updated_at || a.action_at
    if (!at) continue
    if (a.feedback_html) {
      if (!best || new Date(at) > new Date(best.at)) best = { at, kind: 'feedback', text: a.feedback_html, stage: a.stage }
    }
    if (a.status === 'needs_revision' && a.comments) {
      if (!best || new Date(at) > new Date(best.at)) best = { at, kind: 'revision', text: a.comments, stage: a.stage }
    } else if (a.status === 'approved') {
      if (!best || new Date(at) > new Date(best.at)) best = { at, kind: 'approved', text: a.comments || null, stage: a.stage }
    }
  }
  return best
}
