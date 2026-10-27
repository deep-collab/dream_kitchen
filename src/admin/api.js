/*
  Admin calls: POST /api/admin { action, ... } with the login token from Supabase Auth (email +
  password). The login is kept on the phone and refreshed when it runs out, so Hema stays logged
  in; after 30 days without using the admin she logs in again (checked here and on the server).
  Every answer comes after the database saved, so "Saved" is always true.

  The demo admin (/admin/demo) swaps in a backend that runs the same admin code in the browser on
  sample data (src/admin/demo): no network, no login, nothing real is ever touched.
*/
import { api } from '../lib/api'

const KEY = 'dk_admin_session'
export const IDLE_DAYS = 30
const IDLE_MS = IDLE_DAYS * 86_400_000

let demo = null // { call(action, body) } in demo mode
export const setDemoBackend = (backend) => {
  demo = backend
}
export const isDemo = () => Boolean(demo)

export function loadSession() {
  if (demo) return { accessToken: 'demo', email: 'demo@example.com', lastActive: Date.now() }
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (!s?.accessToken) return null
    // Not used for 30 days: log in again
    if (s.lastActive && Date.now() - s.lastActive > IDLE_MS) {
      localStorage.removeItem(KEY)
      sessionExpired = true
      return null
    }
    return s
  } catch {
    return null
  }
}
const saveSession = (s) => {
  if (demo) return
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify({ ...s, lastActive: Date.now() }))
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode: logged in for this visit only */
  }
}

// Why the login page is showing ("expired" after 30 days): read once by the login page
let sessionExpired = false
export const takeExpired = () => {
  const e = sessionExpired
  sessionExpired = false
  return e
}

let onLoggedOut = () => {}
export const setLoggedOutHandler = (fn) => {
  onLoggedOut = fn
}

export async function login(email, password) {
  const r = await api('admin', { action: 'login', email, password })
  if (r.ok) saveSession(r.data)
  return r
}

/** "Forgot password": Supabase emails a link to /admin/reset */
export const forgotPassword = (email) => api('admin', { action: 'forgot', email })
/** From that link: the token in the address, and the new password */
export const setPassword = (accessToken, password) => api('admin', { action: 'setPassword', accessToken, password })

export function logout() {
  saveSession(null)
  onLoggedOut()
}

async function refresh(session) {
  const r = await api('admin', { action: 'refresh', refreshToken: session.refreshToken })
  if (!r.ok) {
    if (r.error === 'expired') sessionExpired = true
    return null
  }
  const next = { ...r.data, email: r.data.email || session.email }
  saveSession(next)
  return next
}

/** One admin action. A 401 refreshes the login once; if that fails, Hema is asked to log in again. */
export async function adminCall(action, body = {}) {
  if (demo) return demo.call(action, body)
  let session = loadSession()
  if (!session) {
    onLoggedOut()
    return { ok: false, error: 'login' }
  }
  if (session.expiresAt && session.expiresAt - Date.now() < 60_000) session = (await refresh(session)) || session
  const send = (s) => authed(s.accessToken, { action, ...body })
  let r = await send(session)
  if (!r.ok && r.status === 401) {
    if (r.error === 'expired') sessionExpired = true
    const next = r.error === 'expired' ? null : await refresh(session)
    if (next) r = await send(next)
  }
  if (!r.ok && (r.status === 401 || r.status === 403)) logout()
  else if (r.ok) saveSession(loadSession() || session) // remembers when she last used the admin
  return r
}

async function authed(token, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => null)
    return res.ok ? { ok: true, data } : { ...(data || {}), ok: false, status: res.status, error: data?.error || 'server' }
  } catch {
    return { ok: false, status: 0, error: 'network' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Plain words for an admin error, saying what failed. `saving`: the words start "Couldn't save".
 * An unexpected server error carries a ref, the same one as the server log line.
 */
export function problem(r, { saving = false } = {}) {
  const failed = saving ? 'Couldn’t save' : 'That didn’t work'
  const ref = r?.ref ? ` (ref ${r.ref})` : ''
  const words = {
    dbUpdate: `${failed}: the website’s database hasn’t been updated for this yet (a database update, “migration”, still has to be run). Nothing new was saved. Please tell Deep${ref}.`,
    server: `${failed}: the server hit an unexpected error${ref}. Please try again; if it happens again, send Deep a screenshot of this message.`,
    network: 'No internet connection. Check it and try again.',
    login: 'Please log in again.',
    expired: 'You haven’t used the admin for 30 days, so please log in again.',
    credentials: 'That email or password is not right.',
    notAdmin: 'This account is not allowed into the admin.',
    notAllowed: 'This account is not allowed to do this.',
    tooMany: 'Too many tries. Please wait a few minutes and try again.',
    transition: 'This has moved on already. The page has been refreshed.',
    notFound: 'Not found. It may have been removed.',
    notReady: 'The database is not set up yet. Open "Setup check" to see what is missing.',
    fields: 'Please check the boxes marked in red.',
    linkExpired: 'This reset link has expired or was already used. Ask for a new one.',
    tooLarge: 'That photo is too big. Try another one.',
  }
  return words[r?.error] || `${failed}: the server answered “${r?.error || 'nothing'}”${r?.status ? ` (${r.status})` : ''}. Please try again; if it happens again, send Deep a screenshot of this message.`
}
