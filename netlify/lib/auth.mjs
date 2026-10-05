// Admin requests carry "Authorization: Bearer <access token>" from Supabase Auth. The token must
// belong to a user listed in admin_users (Hema). No passwords live in the code: Hema's account is
// created in Supabase (docs/SETUP-BACKEND.md); local dev uses DK_DEV_ADMIN_* from .env.
import { HttpError } from './http.mjs'

export async function requireAdmin(req, store) {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token || token.length > 4096) throw new HttpError(401, 'login')
  const user = await store.auth.getUser(token)
  if (!user) throw new HttpError(401, 'login')
  if (!(await store.auth.isAdmin(user.id))) throw new HttpError(403, 'notAdmin')
  return user
}
