/**
 * Progress-report cycles — one auto-opened window per batch per semester,
 * one per "Report N" chip in the UI. Report N always maps to Semester N.
 */
import http from '../http.js'

/**
 * One scholar's window for a given semester ("Report N"), with both slots
 * resolved and a can_submit flag — returns null when no cycle is open yet.
 * Omit `semester` for "whichever cycle they're currently in". Admin/
 * coordinator pass `studentUserId` to view/manage a scholar's report on
 * their behalf; students always resolve their own regardless of what's
 * passed (the backend ignores it for own-scope callers).
 */
export const getMyCycle = async (semester = null, studentUserId = null) => {
  const params = {}
  if (semester) params.semester = semester
  if (studentUserId) params.student_user_id = studentUserId
  const { data } = await http.get('/progress-reports/cycles/mine', { params })
  return { data: data.data, message: data.message }
}
