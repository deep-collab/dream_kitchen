// POST /api/upload?kind=drawing            body: the image (a drawing reference photo)
// POST /api/upload?kind=payment&code=&phone=  body: the image (a payment screenshot)
// Images only (JPEG, PNG, WebP, checked by their first bytes, not the name), 5 MB at most; the
// website shrinks them to 1600px first. Stored in the private "uploads" bucket under a random
// name; only Hema's admin gets short-lived links to see them.
import { randomUUID } from 'node:crypto'
import { checkOrigin, clientIp, handle, HttpError, json } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { findOrderFor } from '../lib/lookup.mjs'
import { imageType, MAX_BYTES, MIME } from '../lib/images.mjs'
import { zonedNow } from '../../src/lib/dates.js'

export default handle(async (req, context) => {
  checkOrigin(req)
  const url = new URL(req.url)
  const kind = url.searchParams.get('kind')
  if (kind !== 'drawing' && kind !== 'payment') throw new HttpError(400, 'badRequest')
  if (Number(req.headers.get('content-length') || 0) > MAX_BYTES) throw new HttpError(413, 'tooLarge')

  const store = getStore()
  await limit(store, 'uploadIp', clientIp(req, context))
  let folder
  if (kind === 'payment') {
    const row = await findOrderFor(store, url.searchParams.get('code'), url.searchParams.get('phone'))
    folder = `payments/${row.order_code}`
  } else folder = `refs/${zonedNow(new Date()).date.replaceAll('-', '')}`

  const bytes = new Uint8Array(await req.arrayBuffer())
  if (!bytes.length) throw new HttpError(400, 'empty')
  if (bytes.length > MAX_BYTES) throw new HttpError(413, 'tooLarge')
  const type = imageType(bytes)
  if (!type) throw new HttpError(415, 'notImage')

  const path = `${folder}/${randomUUID()}.${type}`
  await store.putObject(path, bytes, MIME[type])
  return json(201, { path })
})

export const config = { path: '/api/upload' }
