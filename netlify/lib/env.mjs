// Which backend the functions use, and the few settings that live in environment variables.
// Every secret is a Netlify environment variable (docs/SETUP-BACKEND.md); none is in the code.
//
//   supabase  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set: the real database
//   mock      DK_MOCK_BACKEND=1 (local dev and tests only): an in-memory / file store
//   missing   anything else (e.g. deployed before setup): ordering answers "not set up yet",
//             so orders are never silently kept in memory and lost
import { site } from '../../src/config/site.js'

const env = (name) => (typeof process !== 'undefined' ? process.env[name] : undefined) || ''

export function backendMode() {
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
  /** The live site address: Netlify's own URL variable, else the config */
  get siteUrl() {
    return (env('URL') || site.url).replace(/\/$/, '')
  },
  /** Where new-order and enquiry emails go (admin Settings can override it): HEMA_EMAIL, else the site's email */
  get hemaEmail() {
    return env('HEMA_EMAIL') || site.email
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
  /** Local dev only: the mock store's admin login (never used with Supabase) */
  get devAdmin() {
    return { email: env('DK_DEV_ADMIN_EMAIL'), password: env('DK_DEV_ADMIN_PASSWORD') }
  },
  /** Local dev only: where the mock store keeps its data between restarts ('' = memory only) */
  get devDataDir() {
    return env('DK_DEV_DATA_DIR')
  },
}
