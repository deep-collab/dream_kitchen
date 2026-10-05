// Razorpay Checkout (Phase 2 of payments): built, but OFF until RAZORPAY_KEY_ID and
// RAZORPAY_KEY_SECRET exist in Netlify's environment variables. The order is created here on the
// server (the amount comes from the database, never the browser), and a payment counts only when
// its signature checks out with our secret, or Razorpay's webhook confirms it.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from './env.mjs'
import { HttpError } from './http.mjs'

const same = (a, b) => {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Checkout's handler signature: HMAC-SHA256("<order_id>|<payment_id>", key secret) */
export const paymentSignatureOk = ({ orderId, paymentId, signature }, secret = config.razorpay.keySecret) =>
  Boolean(secret && orderId && paymentId && signature) && same(createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex'), signature)

/** Webhook signature: HMAC-SHA256(raw body, webhook secret) */
export const webhookSignatureOk = (rawBody, signature, secret = config.razorpay.webhookSecret) =>
  Boolean(secret && signature) && same(createHmac('sha256', secret).update(rawBody).digest('hex'), signature)

/** Creates a Razorpay order for our order (amount in paise) */
export async function createRazorpayOrder(order, { fetchImpl = globalThis.fetch } = {}) {
  const { keyId, keySecret, enabled } = config.razorpay
  if (!enabled) throw new HttpError(404, 'razorpayOff')
  const res = await fetchImpl('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ amount: order.total * 100, currency: 'INR', receipt: order.order_code, notes: { order_code: order.order_code } }),
  })
  if (!res.ok) {
    console.error('[dk razorpay] create order failed', res.status, (await res.text()).slice(0, 300))
    throw new HttpError(502, 'razorpay')
  }
  return res.json()
}
