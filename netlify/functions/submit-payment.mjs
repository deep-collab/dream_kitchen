// POST /api/submit-payment { code, phone, utr, screenshot? }: the customer paid by UPI and gives
// the 12-digit reference. The order becomes "Payment submitted – awaiting check" and Hema gets an
// email to check it against her bank app.
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { publicOrder } from '../lib/orders.mjs'
import { findOrderFor } from '../lib/lookup.mjs'
import { hemaPaymentSubmitted, sendAll } from '../lib/email.mjs'
import { normaliseUtr, utrError } from '../../src/lib/pricing.js'

const SCREENSHOT = (code) => new RegExp(`^payments/${code}/[0-9a-f-]{36}\.(webp|jpg|png)$`)

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 4_000)
  const store = getStore()
  await limit(store, 'paymentIp', clientIp(req, context))
  const row = await findOrderFor(store, body.code, body.phone)

  const reason = utrError(body.utr)
  if (reason) throw new HttpError(400, 'utr', { reason })
  let screenshot = null
  if (body.screenshot) {
    if (typeof body.screenshot !== 'string' || !SCREENSHOT(row.order_code).test(body.screenshot) || !(await store.hasObject(body.screenshot))) throw new HttpError(400, 'screenshot')
    screenshot = body.screenshot
  }
  if (row.status !== 'placed' || !['pending', 'submitted'].includes(row.payment_status)) throw new HttpError(409, 'notPending', { order: publicOrder(row, await store.getOrderEvents(row.id)) })

  const updated = await store.submitPayment(row.order_code, row.customer_phone, normaliseUtr(body.utr), screenshot)
  if (!updated) throw new HttpError(409, 'notPending')
  await sendAll([hemaPaymentSubmitted(updated)])
  return json(200, { order: publicOrder(updated, await store.getOrderEvents(updated.id)) })
})

export const config = { path: '/api/submit-payment' }
