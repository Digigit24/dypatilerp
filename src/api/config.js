export const USE_MOCK = false

// The one and only production API base. Every URL builder in the app must
// resolve through BASE_URL (or PROD_API_BASE) below — never re-derive this
// independently, and never let a stray fallback drift to a different value.
export const PROD_API_BASE = 'https://app.dyperf.com/api'

// Hostnames this app is actually served from in production. When the page is
// loaded from one of these, the API base is FORCED to PROD_API_BASE no matter
// what VITE_API_URL got baked into the build — a leftover local/tailnet value
// from the build environment must never reach a real user in production.
const PROD_HOSTNAMES = new Set([
  'postdoc.dyperf.com',
  'www.postdoc.dyperf.com',
  'app.dyperf.com',
  'www.app.dyperf.com',
])

const isProdHost = typeof window !== 'undefined' && PROD_HOSTNAMES.has(window.location.hostname)

export const BASE_URL = isProdHost
  ? PROD_API_BASE
  : (import.meta.env.VITE_API_URL || PROD_API_BASE)
