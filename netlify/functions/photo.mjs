// GET /api/photo/<product>/<file>: a product photo Hema uploaded, from the PRACTICE database only
// (local development). On the live site photos are served straight from Supabase storage, so this
// answers 404 there.
import { handle, HttpError } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { backendMode } from '../lib/env.mjs'

export default handle(
  async (req) => {
    if (backendMode() !== 'mock') throw new HttpError(404, 'notFound')
    const path = decodeURIComponent(new URL(req.url).pathname.replace(/^\/api\/photo\//, ''))
    if (!/^[a-z0-9-]+\/\d+(-600|-1200)?\.(webp|jpg|png)$/.test(path)) throw new HttpError(404, 'notFound')
    const file = await getStore().getPublicObject(path)
    if (!file) throw new HttpError(404, 'notFound')
    return new Response(file.bytes, { status: 200, headers: { 'content-type': file.contentType, 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } })
  },
  { methods: ['GET'] },
)

export const config = { path: '/api/photo/*' }
