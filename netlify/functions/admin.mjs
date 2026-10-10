// POST /api/admin { action, ... }: everything Hema's admin pages do.
// Without a login: "login", "refresh", "forgot" (emails a reset link) and "setPassword" (from that
// link). Every other action needs a valid Supabase Auth token for a user listed in admin_users,
// used within the last 30 days, and runs in netlify/lib/adminCore.mjs (the same code the demo
// admin runs in the browser).
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { idleTooLong, requireAdmin, touchAdmin } from '../lib/auth.mjs'
import { runAdminAction } from '../lib/adminCore.mjs'
import { sendAll } from '../lib/email.mjs'
import { backendMode, config as env } from '../lib/env.mjs'

const session = (s, email) => ({ accessToken: s.access_token, refreshToken: s.refresh_token, expiresAt: Date.now() + (s.expires_in || 3600) * 1000, email: email || s.user?.email })
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

async function login(store, body, req, context) {
  await limit(store, 'loginIp', clientIp(req, context))
  const s = await store.auth.signIn(clean(body.email, 120).toLowerCase(), String(body.password ?? '').slice(0, 200))
  if (!s?.access_token) throw new HttpError(401, 'credentials')
  const user = s.user?.id ? s.user : await store.auth.getUser(s.access_token)
  if (!user || !(await store.auth.isAdmin(user.id))) throw new HttpError(403, 'notAdmin')
  await touchAdmin(store, user.id, undefined, true)
  return session(s, user.email)
}

async function refresh(store, body) {
  const s = await store.auth.refresh(String(body.refreshToken ?? '').slice(0, 4096))
  if (!s?.access_token) throw new HttpError(401, 'login')
  const user = s.user?.id ? s.user : await store.auth.getUser(s.access_token)
  if (!user || !(await store.auth.isAdmin(user.id))) throw new HttpError(403, 'notAdmin')
  // A saved login on a phone left alone for 30 days doesn't come back to life
  if (await idleTooLong(store, user.id)) throw new HttpError(401, 'expired')
  return session(s, user.email)
}

/** "Forgot password": always the same answer, so nobody can test which emails have an account */
async function forgot(store, body, req, context) {
  await limit(store, 'forgotIp', clientIp(req, context))
  const email = clean(body.email, 120).toLowerCase()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await limit(store, 'forgotEmail', email)
    await store.auth.recover(email, `${env.siteUrl}/admin/reset`)
  }
  return { ok: true }
}

async function setPassword(store, body, req, context) {
  await limit(store, 'loginIp', clientIp(req, context))
  const password = String(body.password ?? '')
  if (password.length < 8 || password.length > 72) throw new HttpError(400, 'fields', { fields: { password: 'length' } })
  const token = String(body.accessToken ?? '').slice(0, 4096)
  const user = token && (await store.auth.getUser(token))
  if (!user) throw new HttpError(401, 'linkExpired')
  if (!(await store.auth.updatePassword(token, password))) throw new HttpError(400, 'fields', { fields: { password: 'weak' } })
  return { ok: true }
}

export const adminCtx = () => ({
  send: sendAll,
  now: () => new Date(),
  env: { hemaEmail: env.hemaEmail, razorpay: { enabled: env.razorpay.enabled, keyId: env.razorpay.keyId }, resend: Boolean(env.resendKey), mode: backendMode() },
})

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 900_000) // a photo (shrunk on the phone first) fits
  const store = getStore()
  const action = String(body.action || '')
  if (action === 'login') return json(200, await login(store, body, req, context))
  if (action === 'refresh') return json(200, await refresh(store, body))
  if (action === 'forgot') return json(200, await forgot(store, body, req, context))
  if (action === 'setPassword') return json(200, await setPassword(store, body, req, context))

  const user = await requireAdmin(req, store)
  return json(200, await runAdminAction(store, user, action, body, adminCtx()))
})

export const config = { path: '/api/admin' }
