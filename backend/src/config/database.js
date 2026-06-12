import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  // Discard idle connections quickly — Neon's pooler silently drops idle TCP
  // sockets, and reusing a dead socket is what produces AggregateError ETIMEDOUT.
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  // Recycle each connection after this many queries (guards against stale sockets)
  maxUses: 7500,
});

pool.on('error', (err) => {
  // Neon routinely drops idle connections — log it, never kill the process.
  // (process.exit here caused the whole backend to crash-loop in production.)
  console.error('[db] Idle client error (recovering):', err.message);
});

export const query = (text, params) => pool.query(text, params);

export const getClient = () => pool.connect();
