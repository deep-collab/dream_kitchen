// POST /api/razorpay-webhook: Razorpay tells us a payment was captured, even if the customer
// closed the page before the browser could report it. Checked with the webhook secret.
import { handle, HttpError, json } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { webhookSignatureOk } from '../lib/razorpay.mjs'
import { markPaidByRazorpay } from '../lib/paid.mjs'
import { config as env } from '../lib/env.mjs'

export default handle(async (req) => {
  if (!env.razorpay.enabled || !env.razorpay.webhookSecret) throw new HttpError(404, 'razorpayOff')
  const raw = await req.text()
  if (raw.length > 100_000 || !webhookSignatureOk(raw, req.headers.get('x-razorpay-signature'))) throw new HttpError(400, 'signature')
  const event = JSON.parse(raw)
  const payment = event?.payload?.payment?.entity
  const orderId = payment?.order_id || event?.payload?.order?.entity?.id
  if (['payment.captured', 'order.paid'].includes(event?.event) && orderId) {
    const store = getStore()
    const row = await store.findOrderByRazorpayId(orderId)
    // Only the full amount counts (Razorpay amounts are in paise)
    const amount = payment?.amount ?? event?.payload?.order?.entity?.amount_paid
    if (row && amount === row.total * 100) await markPaidByRazorpay(store, row, String(payment?.id || 'webhook').slice(0, 40))
    else if (row) console.error('[dk razorpay] webhook amount does not match', row.order_code, amount)
  }
  return json(200, { ok: true })
})

export const config = { path: '/api/razorpay-webhook' }
