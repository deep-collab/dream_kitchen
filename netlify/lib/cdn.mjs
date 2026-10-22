// Hema's menu changes on the website at once, without a redeploy: /api/menu is kept at Netlify's
// edge for a minute (tag "menu", functions/menu.mjs), and the admin function clears that copy after
// every change to the menu or the settings. Clearing is a bonus: if it fails, the change is saved
// anyway and the edge copy runs out within a minute, as before. Netlify gives every function the
// key it needs (NETLIFY_PURGE_API_TOKEN, SITE_ID); nothing to set up.
import { purgeCache } from '@netlify/functions'
import { backendMode } from './env.mjs'

export const MENU_CACHE_TAG = 'menu'

export async function menuChanged() {
  if (backendMode() !== 'supabase') return false // local dev and tests: there is no edge copy
  try {
    await purgeCache({ tags: [MENU_CACHE_TAG] })
    return true
  } catch (e) {
    console.warn('[menu cache] could not clear it; it runs out within a minute:', e?.message)
    return false
  }
}
