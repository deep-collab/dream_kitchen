// GET /api/upi-qr: Hema's UPI QR image, uploaded in admin -> Settings (kept in the settings row).
import { handle, HttpError } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { fromDataUrl, MIME } from '../lib/images.mjs'

export default handle(
  async () => {
    const settings = await getStore().getSettings()
    const image = fromDataUrl(settings?.upi_qr)
    if (!image) throw new HttpError(404, 'notFound')
    // The address changes (?v=) whenever Hema uploads a new QR, so it can be cached for long
    return new Response(image.bytes, { status: 200, headers: { 'content-type': MIME[image.type], 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } })
  },
  { methods: ['GET'] },
)

export const config = { path: '/api/upi-qr' }
