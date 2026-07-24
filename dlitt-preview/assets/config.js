/*
 * DLitt application preview configuration.
 *
 * PREVIEW MODE: applicationsEnabled = false.
 *   - The form is shown for design review only.
 *   - The Submit button is disabled and no API request is ever made.
 *
 * To go live LATER (once the DLitt course, intake batch, and
 * public_application_targets are configured on the backend), change ONLY:
 *     applicationsEnabled: false  ->  applicationsEnabled: true
 * and re-copy the dist/ folder to the server.
 *
 * No secrets, tokens, or database IDs belong in this file — the backend
 * resolves the course/batch server-side from the program key alone.
 */
window.DLITT_CONFIG = {
  applicationsEnabled: false,
  apiUrl: "https://app.dyperf.com/api/public/applications"
};
