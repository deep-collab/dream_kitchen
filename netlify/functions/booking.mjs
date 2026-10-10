// POST /api/booking { code, phone }: one class booking, for its page (pay, then the confirmation).
// Both must match; a wrong phone gets the same "not found" as a wrong code, and lookups are rate
// limited.
import { checkOrigin, clientIp, handle, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { classConfig, publicBooking } from '../lib/bookings.mjs'
import { findBookingFor } from '../lib/lookup.mjs'

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 2_000)
  const store = getStore()
  await limit(store, 'lookupIp', clientIp(req, context))
  const row = await findBookingFor(store, body.code, body.phone)
  return json(200, { booking: publicBooking(row, classConfig(await store.getSettings())) })
})

export const config = { path: '/api/booking' }
