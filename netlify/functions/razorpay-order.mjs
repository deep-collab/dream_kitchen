// POST /api/razorpay-order { code, phone }: starts a Razorpay payment for an order (OFF until the
// Razorpay keys are set). The amount is the order's total from the database.
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { findOrderFor } from '../lib/lookup.mjs'
import { createRazorpayOrder } from '../lib/razorpay.mjs'
import { config as env } from '../lib/env.mjs'

export default handle(async (req, context) => {
  if (!env.razorpay.enabled) throw new HttpError(404, 'razorpayOff')
  checkOrigin(req)
  const body = await readJson(req, 2_000)
  const store = getStore()
  await limit(store, 'razorpayIp', clientIp(req, context))
  const row = await findOrderFor(store, body.code, body.phone)
  if (row.status !== 'placed' || row.payment_status === 'confirmed') throw new HttpError(409, 'notPending')
  const rzp = await createRazorpayOrder(row)
  await store.setRazorpayOrderId(row.order_code, rzp.id)
  return json(200, {
    keyId: env.razorpay.keyId,
    razorpayOrderId: rzp.id,
    amount: rzp.amount,
    currency: 'INR',
    name: 'Dream Kitchen',
    description: row.order_code,
    prefill: { name: row.customer_name, contact: `+91${row.customer_phone}`, email: row.customer_email || undefined },
  })
})

export const config = { path: '/api/razorpay-order' }
