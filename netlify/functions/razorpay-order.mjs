// POST /api/razorpay-order { code, phone }: starts (or restarts) a Razorpay payment for an order
// (DK-…) or a class booking (DK-CL-…). The amount is the one saved in the database. A customer who
// closed the payment window and tries again gets the same Razorpay order, so a payment made on
// either attempt is matched by the webhook. OFF (404) until the Razorpay keys are set.
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { findPayableFor } from '../lib/lookup.mjs'
import { createRazorpayOrder, payable } from '../lib/razorpay.mjs'
import { config as env } from '../lib/env.mjs'

export default handle(async (req, context) => {
  if (!env.razorpay.enabled) throw new HttpError(404, 'razorpayOff')
  checkOrigin(req)
  const body = await readJson(req, 2_000)
  const store = getStore()
  await limit(store, 'razorpayIp', clientIp(req, context))
  const { kind, row } = await findPayableFor(store, body.code, body.phone)
  const p = payable(kind, row)
  if (!p.open) throw new HttpError(409, 'notPending')
  let razorpayOrderId = p.rzpOrderId
  if (!razorpayOrderId) {
    const rzp = await createRazorpayOrder(p)
    razorpayOrderId = rzp.id
    if (kind === 'booking') await store.setBookingRazorpayOrderId(p.code, rzp.id)
    else await store.setRazorpayOrderId(p.code, rzp.id)
  }
  return json(200, {
    keyId: env.razorpay.keyId,
    razorpayOrderId,
    amount: p.amount * 100,
    currency: 'INR',
    name: 'Dream Kitchen',
    description: p.code,
    prefill: { name: p.name, contact: `+91${p.phone}`, email: p.email || undefined },
  })
})

export const config = { path: '/api/razorpay-order' }
