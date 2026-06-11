import 'dotenv/config';

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  // Brevo SMTP
  BREVO_SMTP_HOST:    process.env.BREVO_SMTP_HOST  || 'smtp-relay.brevo.com',
  BREVO_SMTP_PORT:    parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
  BREVO_SMTP_USER:    process.env.BREVO_SMTP_USER  || '',
  BREVO_SMTP_PASS:    process.env.BREVO_SMTP_PASS  || '',
  BREVO_SENDER_NAME:  process.env.BREVO_SENDER_NAME  || 'DY Patil ERP',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'postdoc@dyperf.com',
  // Zata S3-compatible storage (optional — stub mode if not set)
  ZATA_ACCESS_KEY: process.env.ZATA_ACCESS_KEY || '',
  ZATA_SECRET_KEY: process.env.ZATA_SECRET_KEY || '',
  ZATA_ENDPOINT: process.env.ZATA_ENDPOINT || 'https://idr01.zata.ai',
  ZATA_VIDEOS_BUCKET: process.env.ZATA_VIDEOS_BUCKET || process.env.ZATA_BUCKETS || '',
  VIDEO_SESSION_TTL: parseInt(process.env.VIDEO_SESSION_TTL || '14400', 10),
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};
