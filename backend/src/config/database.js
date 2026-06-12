import dns from 'node:dns';
import { env } from './env.js';

// Prefer IPv4 — broken IPv6 on VPSes causes AggregateError ETIMEDOUT
dns.setDefaultResultOrder('ipv4first');

/**
 * Database driver selection:
 *
 *  1. @neondatabase/serverless (default) — speaks the Postgres protocol over
 *     a WebSocket on port 443. Hosting firewalls that throttle/drop outbound
 *     port-5432 connections (the cause of intermittent ETIMEDOUT in prod)
 *     cannot affect it: 443 is always open.
 *  2. Plain `pg` over TCP 5432 — set DB_DRIVER=pg in .env to force it,
 *     or automatic fallback if the serverless package isn't installed.
 */
let pool;
let driver = 'pg';

if (process.env.DB_DRIVER !== 'pg') {
  try {
    const neon = await import('@neondatabase/serverless');
    const { default: ws } = await import('ws');
    neon.neonConfig.webSocketConstructor = ws;
    neon.neonConfig.poolQueryViaFetch = true; // single queries via HTTPS fetch — fastest + most reliable
    pool = new neon.Pool({
      connectionString: env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 20000,
    });
    driver = 'neon-ws (port 443)';
  } catch (e) {
    console.warn('[db] @neondatabase/serverless unavailable, falling back to pg:', e.message);
  }
}

if (!pool) {
  const pg = await import('pg');
  pool = new pg.default.Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 20000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
    maxUses: 7500,
  });
}

console.log(`[db] Driver: ${driver}`);

pool.on('error', (err) => {
  // Never kill the process on idle-client errors — log and recover.
  console.error('[db] Idle client error (recovering):', err.message);
});

export { pool };

// ─── Query with one automatic retry on transient connection failures ─────────
const TRANSIENT = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'EPIPE']);
const isTransient = (err) =>
  TRANSIENT.has(err?.code) ||
  (Array.isArray(err?.errors) && err.errors.some((e) => TRANSIENT.has(e?.code))) ||
  /Connection terminated|timeout exceeded|fetch failed|socket hang up/i.test(err?.message || '');

export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (isTransient(err)) {
      console.warn('[db] Transient connection error — retrying once:', err.code || err.message);
      return pool.query(text, params);
    }
    throw err;
  }
};

export const getClient = () => pool.connect();
