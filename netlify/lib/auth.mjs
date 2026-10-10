// Admin requests carry "Authorization: Bearer <access token>" from Supabase Auth. The token must
// belong to a user listed in admin_users (Hema, and the site owner). No passwords live in the
// code: the accounts are made in Supabase (docs/SETUP-BACKEND.md); local dev uses DK_DEV_ADMIN_*.
//
// After IDLE_DAYS (30) without using the admin, the login stops working and she logs in again.
// The last activity is kept in admin_users.last_seen_at (written at most once an hour).
import { HttpError } from './http.mjs'
import { IDLE_DAYS } from './adminCore.mjs'

const IDLE_MS = IDLE_DAYS * 86_400_000
const TOUCH_EVERY_MS = 3_600_000

/** Too long since this admin last used the admin? */
export async function idleTooLong(store, userId, now = store.clock?.() ?? Date.now()) {
  const seen = await store.auth.lastSeen(userId)
  return Boolean(seen) && now - Date.parse(seen) > IDLE_MS
}

/** Records activity (cheaply: only when the last record is over an hour old) */
export async function touchAdmin(store, userId, now = store.clock?.() ?? Date.now(), force = false) {
  const seen = force ? null : await store.auth.lastSeen(userId)
  if (force || !seen || now - Date.parse(seen) > TOUCH_EVERY_MS) await store.auth.touch(userId)
}

export async function requireAdmin(req, store) {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token || token.length > 4096) throw new HttpError(401, 'login')
  const user = await store.auth.getUser(token)
  if (!user) throw new HttpError(401, 'login')
  if (!(await store.auth.isAdmin(user.id))) throw new HttpError(403, 'notAdmin')
  if (await idleTooLong(store, user.id)) throw new HttpError(401, 'expired')
  await touchAdmin(store, user.id)
  return user
}
