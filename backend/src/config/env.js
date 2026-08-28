import 'dotenv/config';

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

// The one and only production frontend URL — emails, redirects and any
// backend-generated link must resolve here in production. Hard-forced below
// (ignoring FRONTEND_URL) so a stale/local value in the production .env can
// never leak a dev/tailnet URL to a real user again.
const PROD_FRONTEND_URL = 'https://postdoc.dyperf.com';
const isProdEnv = process.env.NODE_ENV === 'production';

const resolvedFrontendUrl = isProdEnv
  ? PROD_FRONTEND_URL
  : (process.env.FRONTEND_URL || 'http://localhost:5173');

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  FRONTEND_URL: resolvedFrontendUrl,
  // Extra CORS origins for local-only testing (e.g. a tailnet hostname at
  // whatever port `vite` happens to pick). Comma-separated, read from the
  // gitignored backend/.env only — never set this in a deployed environment;
  // the committed allowlist in app.js already covers every real production
  // origin, and this exists precisely so a local/tailnet value never needs to
  // go anywhere near that committed list.
  EXTRA_CORS_ORIGINS: (process.env.EXTRA_CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  // Brevo SMTP
  BREVO_SMTP_HOST:    process.env.BREVO_SMTP_HOST  || 'smtp-relay.brevo.com',
  BREVO_SMTP_PORT:    parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
  BREVO_SMTP_USER:    process.env.BREVO_SMTP_USER  || '',
  BREVO_SMTP_PASS:    process.env.BREVO_SMTP_PASS  || '',
  BREVO_API_KEY:      process.env.BREVO_API_KEY    || '',
  BREVO_SENDER_NAME:  process.env.BREVO_SENDER_NAME  || 'DY Patil ERP',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'postdoc@dyperf.com',
  // Comma-separated address(es) CC'd on the Final Shortlist / registration-fee
  // email so the institute receives a confirmation copy of every payment email.
  SHORTLIST_EMAIL_CC: process.env.SHORTLIST_EMAIL_CC || '',
  // Zata S3-compatible storage (optional — stub mode if not set)
  // ── Feature flags ────────────────────────────────────────────────────────
  // Video upload / streaming / the Lectures module are DISABLED for now.
  // Documents (formats, submission attachments) are unaffected.
  // Flip to 'true' only when the video feature is revived — see CLAUDE.md.
  VIDEO_UPLOADS_ENABLED: process.env.VIDEO_UPLOADS_ENABLED === 'true',
  // V2 submission model. Targets always use their own single-approval flow.
  // This flag ONLY controls the Phase 3 change that stops assignments creating
  // an approval chain — off by default so production behaviour is unchanged.
  V2_SUBMISSIONS: process.env.V2_SUBMISSIONS === 'true',
  // Local disk is a read CACHE only. Zata is the single source of truth.
  // Leave false on any host with an ephemeral filesystem.
  STORAGE_LOCAL_CACHE: process.env.STORAGE_LOCAL_CACHE === 'true',

  ZATA_ACCESS_KEY: process.env.ZATA_ACCESS_KEY || '',
  ZATA_SECRET_KEY: process.env.ZATA_SECRET_KEY || '',
  ZATA_ENDPOINT: process.env.ZATA_ENDPOINT || 'https://idr01.zata.ai',
  ZATA_VIDEOS_BUCKET: process.env.ZATA_VIDEOS_BUCKET || process.env.ZATA_BUCKETS || '',
  VIDEO_SESSION_TTL: parseInt(process.env.VIDEO_SESSION_TTL || '14400', 10),
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};
