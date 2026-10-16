// GET /api/setup-check: the admin's "Setup check" screen (works before anyone can log in, so the
// owner can see what is missing). It answers only green / red for each part and never shows a key,
// an email address or any order data.
//   database  Cloudflare D1 (or Supabase): the database is reachable, tables exist, and admin exists
//   resend    an API key is set (it starts with re_)
//   razorpay  both keys are set (and whether they are test keys), plus the webhook secret
//   email     an order-alert address is set (admin Settings or HEMA_EMAIL)
//   upi       a UPI ID is set (needed only while Razorpay is not set up)
import { clientIp, handle, json } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { applySettings } from '../../src/lib/pricing.js'
import { rowToSettings, settingsBase } from '../lib/catalog.mjs'
import { backendMode, config as env, getWorkerEnv } from '../lib/env.mjs'

const has = (name) => {
  const w = getWorkerEnv()
  if (w && w[name]) return true
  return Boolean(typeof process !== 'undefined' && process.env[name])
}

export default handle(
  async (req, context) => {
    const mode = backendMode()
    const out = { mode, checkedAt: new Date().toISOString() }
    let settingsRow = null

    // 1. Database (Cloudflare D1 or Supabase)
    const sb = { urlSet: has('SUPABASE_URL'), serviceKeySet: has('SUPABASE_SERVICE_ROLE_KEY'), anonKeySet: has('SUPABASE_ANON_KEY') }
    if (mode === 'missing') {
      out.supabase = { ok: false, ...sb, problem: !sb.urlSet ? 'noUrl' : 'noServiceKey' }
      out.database = { ok: false, problem: 'notConfigured' }
    } else {
      const store = getStore()
      await limit(store, 'setupIp', clientIp(req, context))
      const health = store.health ? await store.health() : { reachable: true, tables: true, update: true, bucket: true }
      let admins = 0
      try {
        admins = health.tables ? await store.auth.countAdmins() : 0
        settingsRow = health.tables ? await store.getSettings() : null
      } catch {
        /* reported below */
      }
      const problem = !health.reachable ? (health.keyRefused ? 'keyRefused' : 'unreachable') : !health.tables ? 'noTables' : !health.update ? 'noUpdate' : !health.bucket ? 'noBucket' : !sb.anonKeySet && mode === 'supabase' ? 'noAnonKey' : admins < 1 ? 'noAdmin' : null
      out.supabase = { ok: !problem, ...sb, problem, admins, practice: mode === 'mock', d1: mode === 'd1' }
      out.database = { ok: !problem, problem, admins, d1: mode === 'd1', practice: mode === 'mock' }
    }

    // 2. Resend
    const key = env.resendKey
    out.resend = { ok: /^re_/.test(key), problem: !key ? 'noKey' : /^re_/.test(key) ? null : 'badKey', fromSet: has('EMAIL_FROM') }

    // 3. Razorpay
    const rz = env.razorpay
    out.razorpay = {
      ok: rz.enabled && Boolean(rz.webhookSecret),
      on: rz.enabled,
      testMode: /^rzp_test_/.test(rz.keyId),
      problem: !rz.keyId && !rz.keySecret ? 'noKeys' : !rz.enabled ? 'oneKey' : !rz.webhookSecret ? 'noWebhook' : null,
    }

    // 4. Order-alert email, 5. UPI
    out.email = { ok: Boolean(settingsRow?.alert_email || env.hemaEmail), problem: settingsRow?.alert_email || env.hemaEmail ? null : 'noEmail' }
    const upi = applySettings(rowToSettings(settingsRow || {}), settingsBase()).payment.upiId
    out.upi = { ok: Boolean(upi) || rz.enabled, set: Boolean(upi), notNeeded: rz.enabled && !upi, problem: upi || rz.enabled ? null : 'noUpi' }

    out.allGood = [(out.database || out.supabase), out.resend, out.razorpay, out.email].every((x) => x.ok)
    return json(200, out)
  },
  { methods: ['GET'] },
)

export const config = { path: '/api/setup-check' }
