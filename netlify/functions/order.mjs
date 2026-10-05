// POST /api/order { code, phone }: one order's status, for the confirmation page and Track Order
// on any device. Both must match; a wrong phone gets the same "not found" as a wrong code, and
// lookups are rate limited, so nobody can fish for other people's orders.
import { checkOrigin, clientIp, handle, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { publicOrder } from '../lib/orders.mjs'
import { findOrderFor } from '../lib/lookup.mjs'

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 2_000)
  const store = getStore()
  await limit(store, 'lookupIp', clientIp(req, context))
  const row = await findOrderFor(store, body.code, body.phone)
  return json(200, { order: publicOrder(row, await store.getOrderEvents(row.id)) })
})

export const config = { path: '/api/order' }
