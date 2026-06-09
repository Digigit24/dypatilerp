/**
 * Fire-and-forget audit log writer.
 * Call from controllers/services after mutations — errors are silently swallowed
 * so they never affect the main request flow.
 */
import { query } from '../config/database.js';

/**
 * @param {object} opts
 * @param {string}  opts.userId       - Actor user ID
 * @param {string}  opts.action       - e.g. 'CREATE_SUBMISSION', 'APPROVE_STAGE'
 * @param {string}  [opts.resourceType] - e.g. 'submission', 'batch'
 * @param {string}  [opts.resourceId]   - UUID of the affected record
 * @param {object}  [opts.changes]      - { before, after } or any structured payload
 * @param {string}  [opts.ipAddress]    - Client IP
 */
export const writeAuditLog = (opts) => {
  const { userId, action, resourceType, resourceId, changes, ipAddress } = opts;
  query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes, ip_address)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [userId || null, action, resourceType || null, resourceId || null,
     changes ? JSON.stringify(changes) : null, ipAddress || null]
  ).catch(() => { /* silent */ });
};
