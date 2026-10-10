// Razorpay Checkout: the main way to pay, switched on by RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in
// Netlify's environment variables. The Razorpay order is created here on the server, for the
// amount saved in the database (never a number from the browser). A payment counts only when its
// signature checks out with our secret key, or Razorpay's webhook (signed with the webhook
// secret) confirms it, for exactly that amount.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { backendMode, config } from './env.mjs'
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

// Razorpay's API. Local QA only (practice store): DK_RAZORPAY_API points at a stand-in server
// (scripts/qa-payments.mjs). Never used with the real database.
const api = () => (backendMode() === 'mock' && process.env.DK_RAZORPAY_API) || 'https://api.razorpay.com'

/** Creates a Razorpay order: amount in paise, receipt = our code (DK-… or DK-CL-…) */
export async function createRazorpayOrder({ code, amount, kind }, { fetchImpl = globalThis.fetch } = {}) {
  const { keyId, keySecret, enabled } = config.razorpay
  if (!enabled) throw new HttpError(404, 'razorpayOff')
  const res = await fetchImpl(`${api()}/v1/orders`, {
    method: 'POST',
    headers: { authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: code, notes: { code, kind } }),
  })
  if (!res.ok) {
    console.error('[dk razorpay] create order failed', res.status, (await res.text()).slice(0, 300))
    throw new HttpError(502, 'razorpay')
  }
  return res.json()
}

/** What a payable (order or booking) looks like to the payment functions */
export const payable = (kind, row) =>
  kind === 'booking'
    ? { kind, code: row.booking_code, amount: row.fee, open: row.status === 'pending' && row.payment_status !== 'confirmed', name: row.name, phone: row.phone, email: row.email, rzpOrderId: row.razorpay_order_id }
    : { kind, code: row.order_code, amount: row.total, open: row.status === 'placed' && row.payment_status !== 'confirmed', name: row.customer_name, phone: row.customer_phone, email: row.customer_email, rzpOrderId: row.razorpay_order_id }
