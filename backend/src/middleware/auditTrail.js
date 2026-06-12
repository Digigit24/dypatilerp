/**
 * Global audit trail — automatically records every successful mutating
 * request (POST / PUT / PATCH / DELETE) across ALL API modules.
 *
 * One middleware, zero per-endpoint wiring: new modules are audited the
 * moment they're mounted. Writes are fire-and-forget and can never break
 * or slow a request.
 *
 * Action naming: "<module>.<verb>" — e.g. students.create, tests.publish,
 * applicants.status_change, courses.delete.
 */
import { writeAuditLog } from '../utils/auditLog.js';

const ACTION_BY_METHOD = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// High-frequency heartbeats & auth plumbing — logged elsewhere or pure noise
const SKIP = [
  /^\/api\/auth\//,        // login/logout already audited in auth controller
  /^\/api\/test-auth\//,   // candidate logins are tracked via test_access_tokens.used_at
  /\/autosave$/,           // test answer heartbeat (every 30s per candidate)
  /\/progress$/,           // video watch heartbeat
  /\/session$/,            // video streaming sessions
];

// Nicer verbs for action-style endpoints
const SPECIAL_VERBS = [
  [/\/publish$/, 'publish'],
  [/\/close$/, 'close'],
  [/\/bulk-convert$/, 'bulk_convert'],
  [/\/convert$/, 'convert'],
  [/\/assign\/reset$/, 'reset_test_link'],
  [/\/assign(\/|$)/, 'assign'],
  [/\/import$/, 'import'],
  [/\/submit$/, 'submit'],
  [/\/status$/, 'status_change'],
  [/\/test-email$/, 'test_email'],
  [/\/upload(\/|$)/, 'upload'],
  [/\/permissions$/, 'permissions_change'],
  [/\/questions$/, 'questions_save'],
  [/\/reorder$/, 'reorder'],
];

// Never persist credentials or secrets in the log payload
const REDACT = new Set([
  'password', 'password_hash', 'apikey', 'api_key', 'token',
  'refresh_token', 'access_token', 'smtp_pass', 'brevo_smtp_pass',
]);

const summarize = (body) => {
  if (!body || typeof body !== 'object') return null;
  const out = {};
  let count = 0;
  for (const [k, v] of Object.entries(body)) {
    if (count >= 15) { out._truncated = true; break; }
    if (REDACT.has(k.toLowerCase())) { out[k] = '[redacted]'; }
    else if (Array.isArray(v)) { out[k] = `[array · ${v.length} items]`; }
    else if (v !== null && typeof v === 'object') { out[k] = '[object]'; }
    else if (typeof v === 'string' && v.length > 150) { out[k] = `${v.slice(0, 150)}…`; }
    else { out[k] = v; }
    count++;
  }
  return out;
};

export const auditTrail = (req, res, next) => {
  const method = req.method.toUpperCase();
  if (!ACTION_BY_METHOD[method]) return next();

  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (SKIP.some((re) => re.test(path))) return next();

  // Capture the body summary NOW — some handlers mutate req.body
  const bodySummary = summarize(req.body);

  res.on('finish', () => {
    if (res.statusCode >= 400) return; // only successful mutations
    try {
      const parts = path.replace(/^\/api\//, '').split('/').filter(Boolean);
      const moduleName = (parts[0] || 'unknown').replaceAll('-', '_');

      let verb = ACTION_BY_METHOD[method];
      for (const [re, special] of SPECIAL_VERBS) {
        if (re.test(path)) { verb = special; break; }
      }

      const idMatch = path.match(UUID_RE);
      writeAuditLog({
        userId: req.user?.id || null,
        action: `${moduleName}.${verb}`,
        resourceType: moduleName,
        resourceId: idMatch ? idMatch[0] : null,
        changes: { method, path, status: res.statusCode, ...(bodySummary ? { body: bodySummary } : {}) },
        ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null,
      });
    } catch { /* the audit trail must never affect the request */ }
  });

  next();
};
