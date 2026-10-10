// POST /api/razorpay-webhook: Razorpay tells us a payment was captured, even if the customer
// closed the page before the browser could report it. Checked with the webhook secret. Events to
// tick in the Razorpay dashboard: payment.captured, order.paid (payment.failed is accepted and
// ignored: the customer can simply try again). Razorpay may send the same event more than once:
// the second time changes nothing and sends no second email.
import { handle, HttpError, json } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { webhookSignatureOk } from '../lib/razorpay.mjs'
import { markPaid } from '../lib/paid.mjs'
import { config as env } from '../lib/env.mjs'

export default handle(async (req) => {
  if (!env.razorpay.enabled || !env.razorpay.webhookSecret) throw new HttpError(404, 'razorpayOff')
  const raw = await req.text()
  if (raw.length > 100_000 || !webhookSignatureOk(raw, req.headers.get('x-razorpay-signature'))) throw new HttpError(400, 'signature')
  let event
  try {
    event = JSON.parse(raw)
  } catch {
    throw new HttpError(400, 'badRequest')
  }
  const payment = event?.payload?.payment?.entity
  const orderId = payment?.order_id || event?.payload?.order?.entity?.id
  if (['payment.captured', 'order.paid'].includes(event?.event) && orderId) {
    const store = getStore()
    const order = await store.findOrderByRazorpayId(orderId)
    const booking = order ? null : await store.findBookingByRazorpayId(orderId)
    const kind = order ? 'order' : 'booking'
    const row = order || booking
    // Only the full amount counts (Razorpay amounts are in paise)
    const amount = payment?.amount ?? event?.payload?.order?.entity?.amount_paid
    const due = row ? (kind === 'order' ? row.total : row.fee) * 100 : null
    if (row && amount === due) await markPaid(store, kind, row, String(payment?.id || 'webhook').slice(0, 40))
    else if (row) console.error('[dk razorpay] webhook amount does not match', kind, row.order_code || row.booking_code, amount, due)
  }
  return json(200, { ok: true })
})

export const config = { path: '/api/razorpay-webhook' }
