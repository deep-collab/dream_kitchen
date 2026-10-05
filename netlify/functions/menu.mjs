// GET /api/menu: Hema's menu changes and public settings (courier rates, lead times, UPI, store
// open, announcement). The website applies them to the config with the same shared code the
// server uses. Cached at Netlify's edge for a minute; a stale price can't be charged, because
// create-order re-prices from the database and asks the website to refresh.
import { handle, json } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { loadCatalog, publicMenu } from '../lib/catalog.mjs'
import { backendMode } from '../lib/env.mjs'

export default handle(
  async () => {
    if (backendMode() === 'missing') return json(200, { ready: false })
    const catalog = await loadCatalog(getStore())
    return json(200, { ready: true, ...publicMenu(catalog) }, { 'cache-control': 'public, max-age=0, must-revalidate', 'netlify-cdn-cache-control': 'public, max-age=60, stale-while-revalidate=300' })
  },
  { methods: ['GET'] },
)

export const config = { path: '/api/menu' }
