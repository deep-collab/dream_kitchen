// GET /api/setup-check: the admin's "Setup check" screen (works before anyone can log in, so the
// owner can see what is missing). It answers only green / red for each part and never shows a key,
// an email address or any order data.
//   supabase  the keys are set, the project answers, both setup files have been run, the photo
//             storage exists, and at least one admin login exists
//   resend    an API key is set (it starts with re_), and EMAIL_FROM is an address on your own domain
//             (without it customers get no emails: Resend's test sender only reaches the owner)
//   razorpay  both keys are set (and whether they are test keys), plus the webhook secret
//   email     an order-alert address is set (admin Settings or HEMA_EMAIL)
//   upi       a UPI ID is set (needed only while Razorpay is not set up)
//   keepAlive the daily keep-alive ran in the last 2 days (netlify/functions/keep-alive.mjs)
//   address   the site address in the code (site.url) is the one Netlify serves as the main domain
import { clientIp, handle, json } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { applySettings } from '../../src/lib/pricing.js'
import { rowToSettings, settingsBase } from '../lib/catalog.mjs'
import { backendMode, config as env } from '../lib/env.mjs'
import { site } from '../../src/config/site.js'

const KEEP_ALIVE_MAX_MS = 2 * 86_400_000

const has = (name) => Boolean(typeof process !== 'undefined' && process.env[name])

export default handle(
  async (req, context) => {
    const mode = backendMode()
    const out = { mode, checkedAt: new Date().toISOString() }
    let settingsRow = null
    let beat = null

    // 1. Supabase
    const sb = { urlSet: has('SUPABASE_URL'), serviceKeySet: has('SUPABASE_SERVICE_ROLE_KEY'), anonKeySet: has('SUPABASE_ANON_KEY') }
    if (mode === 'missing') out.supabase = { ok: false, ...sb, problem: !sb.urlSet ? 'noUrl' : 'noServiceKey' }
    else {
      const store = getStore()
      await limit(store, 'setupIp', clientIp(req, context))
      const health = store.health ? await store.health() : { reachable: true, tables: true, update: true, bucket: true }
      let admins = 0
      try {
        admins = health.tables ? await store.auth.countAdmins() : 0
        settingsRow = health.tables ? await store.getSettings() : null
        beat = health.update && store.lastBeat ? await store.lastBeat() : null
      } catch {
        /* reported below */
      }
      const problem = !health.reachable ? (health.keyRefused ? 'keyRefused' : 'unreachable') : !health.tables ? 'noTables' : !health.update ? 'noUpdate' : !health.bucket ? 'noBucket' : !sb.anonKeySet && mode === 'supabase' ? 'noAnonKey' : admins < 1 ? 'noAdmin' : null
      out.supabase = { ok: !problem, ...sb, problem, admins, practice: mode === 'mock' }
    }

    // 2. Resend
    const key = env.resendKey
    const ownSender = has('EMAIL_FROM') && !/@resend\.dev>?\s*$/i.test(env.emailFrom)
    out.resend = { ok: /^re_/.test(key) && ownSender, problem: !key ? 'noKey' : !/^re_/.test(key) ? 'badKey' : !ownSender ? 'noFrom' : null, fromSet: has('EMAIL_FROM') }

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

    // 6. Keep-alive: ran in the last 2 days (it runs every morning)
    const last = beat?.last_run_at ? Date.parse(beat.last_run_at) : 0
    const fresh = last && Date.now() - last < KEEP_ALIVE_MAX_MS
    out.keepAlive = { ok: Boolean(fresh), lastRunAt: beat?.last_run_at || null, runs: beat?.runs || 0, problem: fresh ? null : mode === 'missing' ? 'noDatabase' : last ? 'late' : 'never' }

    // 7. The website's address: Netlify's main domain (URL) is the one in the code
    const served = (typeof process !== 'undefined' && process.env.URL) || ''
    const strip = (u) => u.replace(/\/$/, '').toLowerCase()
    const sameAddress = !served || strip(served) === strip(site.url)
    out.address = { ok: sameAddress, url: site.url, served: served || null, problem: sameAddress ? null : 'mismatch' }

    out.allGood = [out.supabase, out.resend, out.razorpay, out.email, out.keepAlive, out.address].every((x) => x.ok)
    return json(200, out)
  },
  { methods: ['GET'] },
)

export const config = { path: '/api/setup-check' }
