// Which backend the functions use, and the few settings that live in environment variables.
// In Cloudflare Workers, bindings and secrets come from env; in Node/local dev they come from process.env.
//
//   d1        DB binding (Cloudflare D1) is set: Cloudflare Workers + D1 database
//   supabase  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set: Supabase database
//   mock      DK_MOCK_BACKEND=1 (local dev and tests only): an in-memory / file store
//   missing   anything else (e.g. deployed before setup): ordering answers "not set up yet",
//             so orders are never silently kept in memory and lost
import { site } from '../../src/config/site.js'

let workerEnv = null

export function setWorkerEnv(env) {
  workerEnv = env
}

export function getWorkerEnv() {
  return workerEnv
}

const env = (name) => {
  if (workerEnv && workerEnv[name] !== undefined) return String(workerEnv[name] || '')
  return (typeof process !== 'undefined' ? process.env[name] : undefined) || ''
}

export function backendMode() {
  if (workerEnv?.DB || (typeof process !== 'undefined' && process.env?.DK_D1_DATABASE)) return 'd1'
  if (env('SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY')) return 'supabase'
  if (env('DK_MOCK_BACKEND') === '1') return 'mock'
  return 'missing'
}

export const config = {
  get supabaseUrl() {
    return env('SUPABASE_URL').replace(/\/$/, '')
  },
  get serviceKey() {
    return env('SUPABASE_SERVICE_ROLE_KEY')
  },
  get anonKey() {
    return env('SUPABASE_ANON_KEY')
  },
  /** The live site address: SITE_URL, Netlify's URL variable, or site config */
  get siteUrl() {
    return (env('SITE_URL') || env('URL') || site.url).replace(/\/$/, '')
  },
  /** Where new-order and enquiry emails go */
  get hemaEmail() {
    return env('HEMA_EMAIL')
  },
  get resendKey() {
    return env('RESEND_API_KEY')
  },
  /** e.g. "Dream Kitchen <orders@yourdomain.in>"; Resend's test sender until a domain is verified */
  get emailFrom() {
    return env('EMAIL_FROM') || 'Dream Kitchen <onboarding@resend.dev>'
  },
  get upiId() {
    return env('UPI_ID')
  },
  get razorpay() {
    const keyId = env('RAZORPAY_KEY_ID')
    const keySecret = env('RAZORPAY_KEY_SECRET')
    return { enabled: Boolean(keyId && keySecret), keyId, keySecret, webhookSecret: env('RAZORPAY_WEBHOOK_SECRET') }
  },
  /** Local dev only: the mock store's admin login (never used with Supabase or D1) */
  get devAdmin() {
    return { email: env('DK_DEV_ADMIN_EMAIL'), password: env('DK_DEV_ADMIN_PASSWORD') }
  },
  /** Local dev only: where the mock store keeps its data between restarts ('' = memory only) */
  get devDataDir() {
    return env('DK_DEV_DATA_DIR')
  },
}
