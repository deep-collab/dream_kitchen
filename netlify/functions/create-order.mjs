// POST /api/create-order: re-prices the whole order from the database menu with the shared
// pricing module, refuses anything that doesn't match and saves it once (idempotency key).
// Payment: Razorpay when its keys are set (the main way), else the UPI fallback. Hema is emailed
// when the order is paid (Razorpay) or the customer gives a UPI reference, not before; a UPI
// customer who gave an email gets the order and how to pay at once.
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { loadCatalog, paymentsOpen } from '../lib/catalog.mjs'
import { checkHoneypot, limit } from '../lib/limits.mjs'
import { orderRecord, priceRequest, publicOrder, saveOrder } from '../lib/orders.mjs'
import { customerPlaced, sendAll } from '../lib/email.mjs'
import { config as env } from '../lib/env.mjs'

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 64_000)
  checkHoneypot(body)
  const store = getStore()
  await limit(store, 'createOrderIp', clientIp(req, context))

  const catalog = await loadCatalog(store)
  if (!catalog.settings.store.open) throw new HttpError(503, 'storeClosed')
  const method = env.razorpay.enabled ? 'razorpay' : 'upi'
  if (method === 'upi' && !catalog.settings.payment.upiId) throw new HttpError(503, 'paymentsClosed')
  if (!paymentsOpen(catalog)) throw new HttpError(503, 'paymentsClosed')

  const priced = priceRequest(body, catalog)
  await limit(store, 'createOrderPhone', priced.details.phone)

  // A reference photo must be one we stored (the upload function), not any path
  const missing = []
  for (const [index, item] of priced.items.entries()) if (item.drawingRef && !(await store.hasObject(item.drawingRef))) missing.push({ index, error: 'choices', fields: { drawingRef: 'invalid' } })
  if (missing.length) throw new HttpError(422, 'items', { lines: missing })

  const { row, created } = await saveOrder(store, orderRecord(priced, { idempotencyKey: body.idempotencyKey, paymentMethod: method }))
  if (created && method === 'upi' && row.customer_email) await sendAll([customerPlaced(row)])
  const events = await store.getOrderEvents(row.id)
  return json(created ? 201 : 200, { order: publicOrder(row, events), created, stateWarning: priced.stateWarning })
})

export const config = { path: '/api/create-order' }
