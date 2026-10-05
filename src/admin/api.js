/*
  Admin calls: POST /api/admin { action, ... } with Hema's login token. The token comes from
  Supabase Auth (email + password); it is kept on her phone and refreshed when it runs out, so
  she stays logged in. Every answer comes after the database saved, so "Saved" is always true.
*/
import { api } from '../lib/api'

const KEY = 'dk_admin_session'

export function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s?.accessToken ? s : null
  } catch {
    return null
  }
}
const saveSession = (s) => {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode: logged in for this visit only */
  }
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

export function logout() {
  saveSession(null)
  onLoggedOut()
}

async function refresh(session) {
  const r = await api('admin', { action: 'refresh', refreshToken: session.refreshToken })
  if (!r.ok) return null
  const next = { ...r.data, email: r.data.email || session.email }
  saveSession(next)
  return next
}

/** One admin action. A 401 refreshes the login once; if that fails, Hema is asked to log in again. */
export async function adminCall(action, body = {}) {
  let session = loadSession()
  if (!session) {
    onLoggedOut()
    return { ok: false, error: 'login' }
  }
  if (session.expiresAt && session.expiresAt - Date.now() < 60_000) session = (await refresh(session)) || session
  const send = (s) => authed(s.accessToken, { action, ...body })
  let r = await send(session)
  if (!r.ok && r.status === 401) {
    const next = await refresh(session)
    if (next) r = await send(next)
  }
  if (!r.ok && (r.status === 401 || r.status === 403)) logout()
  return r
}

async function authed(token, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
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

/** Plain words for an admin error */
export function problem(r) {
  const words = {
    network: 'No internet connection. Check it and try again.',
    login: 'Please log in again.',
    credentials: 'That email or password is not right.',
    notAdmin: 'This account is not allowed into the admin.',
    tooMany: 'Too many tries. Please wait a few minutes.',
    transition: 'This order has moved on already. The page has been refreshed.',
    notFound: 'Not found. It may have been removed.',
    notReady: 'The database is not set up yet (see docs/SETUP-BACKEND.md).',
    fields: 'Please check the boxes marked in red.',
  }
  return words[r?.error] || 'Something went wrong. Please try again.'
}
