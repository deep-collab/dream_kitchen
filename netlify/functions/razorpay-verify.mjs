// POST /api/razorpay-verify: Razorpay Checkout finished in the browser. The payment counts only
// if its signature matches our secret key; then the order (or class booking) is "Paid" at once
// and Hema and the customer get their emails. Calling it twice changes nothing more.
import { checkOrigin, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { findPayableFor } from '../lib/lookup.mjs'
import { paymentSignatureOk } from '../lib/razorpay.mjs'
import { markPaid } from '../lib/paid.mjs'
import { publicOrder } from '../lib/orders.mjs'
import { classConfig, publicBooking } from '../lib/bookings.mjs'
import { config as env } from '../lib/env.mjs'

export default handle(async (req) => {
  if (!env.razorpay.enabled) throw new HttpError(404, 'razorpayOff')
  checkOrigin(req)
  const body = await readJson(req, 4_000)
  const store = getStore()
  const { kind, row } = await findPayableFor(store, body.code, body.phone)
  const ok = row.razorpay_order_id && row.razorpay_order_id === body.razorpayOrderId && paymentSignatureOk({ orderId: body.razorpayOrderId, paymentId: body.razorpayPaymentId, signature: body.signature })
  if (!ok) throw new HttpError(400, 'signature')
  const { row: updated } = await markPaid(store, kind, row, String(body.razorpayPaymentId).slice(0, 40))
  if (kind === 'booking') return json(200, { booking: publicBooking(updated, classConfig(await store.getSettings())) })
  return json(200, { order: publicOrder(updated, await store.getOrderEvents(updated.id)) })
})

export const config = { path: '/api/razorpay-verify' }
