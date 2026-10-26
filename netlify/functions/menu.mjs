// GET /api/menu: Hema's menu changes and public settings (courier rates, lead times, UPI, store
// open, announcement), her offers, the Customize tiles' photos and the developer options' public
// settings (e.g. the background), in ONE small request. The website applies them to the config with
// the same shared code the server uses. Cached at Netlify's edge for a minute, and cleared by the
// admin after each change (lib/cdn.mjs), so a new photo or price shows at once; a stale price can't
// be charged anyway, because create-order re-prices from the database and asks the website to refresh.
import { handle, json } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { loadCatalog, publicMenu, publicPagePhotos, publicSiteConfig } from '../lib/catalog.mjs'
import { backendMode } from '../lib/env.mjs'
import { MENU_CACHE_TAG } from '../lib/cdn.mjs'

export default handle(
  async () => {
    if (backendMode() === 'missing') return json(200, { ready: false })
    const store = getStore()
    // Tile photos are an extra: if they can't be read (e.g. before the owner ran the 23 Oct SQL)
    // the menu and ordering still work, just without them (offers and settings: loadCatalog)
    const pagePhotos = Promise.resolve().then(() => store.listPagePhotos()).catch((e) => (console.warn('[menu] tile photos unavailable:', e?.message), []))
    const catalog = await loadCatalog(store)
    return json(
      200,
      { ready: true, ...publicMenu(catalog), offers: catalog.offers, pagePhotos: publicPagePhotos(await pagePhotos), config: publicSiteConfig(catalog.config) },
      { 'cache-control': 'public, max-age=0, must-revalidate', 'netlify-cdn-cache-control': 'public, max-age=60, stale-while-revalidate=300', 'netlify-cache-tag': MENU_CACHE_TAG },
    )
  },
  { methods: ['GET'] },
)

export const config = { path: '/api/menu' }
