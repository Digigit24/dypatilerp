import dns from 'node:dns';
import pg from 'pg';
import { env } from './env.js';

// Prefer IPv4 — broken/half-configured IPv6 on VPSes is a common cause of
// AggregateError ETIMEDOUT when connecting to Neon (dual-stack host).
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  // Keep connections warm — opening NEW connections is the unreliable part,
  // so hold idle ones longer and let TCP keepalive maintain them.
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
  maxUses: 7500,
});

pool.on('error', (err) => {
  // Neon drops idle connections — log and recover, never kill the process.
  console.error('[db] Idle client error (recovering):', err.message);
});

// ─── Query with one automatic retry on transient connection failures ─────────
const TRANSIENT = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'EPIPE']);
const isTransient = (err) =>
  TRANSIENT.has(err?.code) ||
  (Array.isArray(err?.errors) && err.errors.some((e) => TRANSIENT.has(e?.code))) ||
  /Connection terminated|timeout exceeded/i.test(err?.message || '');

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
