// GET /api/photo/<product>/<file>: a product photo Hema uploaded, served from the D1 database
// (or local practice store).
import { handle, HttpError } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { backendMode } from '../lib/env.mjs'

export default handle(
  async (req) => {
    const mode = backendMode()
    if (mode !== 'mock' && mode !== 'd1') throw new HttpError(404, 'notFound')
    const path = decodeURIComponent(new URL(req.url).pathname.replace(/^\/api\/photo\//, ''))
    if (!/^[a-z0-9-]+\/\d+\.(webp|jpg|png)$/.test(path)) throw new HttpError(404, 'notFound')
    const file = await getStore().getPublicObject(path)
    if (!file) throw new HttpError(404, 'notFound')
    return new Response(file.bytes, { status: 200, headers: { 'content-type': file.contentType, 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } })
  },
  { methods: ['GET'] },
)

export const config = { path: '/api/photo/*' }
