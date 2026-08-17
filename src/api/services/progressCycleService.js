/**
 * Progress-report cycles — one auto-opened window per batch per semester.
 * A scholar always submits into their CURRENT semester's cycle; past
 * cycles are read via the regular submissions list (submission_type
 * 'progress_report'), not this service.
 */
import http from '../http.js'

/**
 * The scholar's current-semester window, with both slots resolved and a
 * can_submit flag — returns null when no cycle is open yet (rare: only
 * right after enrollment, before the first cycle backfill/creation runs).
 */
export const getMyCycle = async () => {
  const { data } = await http.get('/progress-reports/cycles/mine')
  return { data: data.data, message: data.message }
}
