// POST /api/submit-payment { code, phone, utr, screenshot? }: the UPI fallback (only while Razorpay
// isn't set up). The customer paid by UPI and gives the 12-digit reference. The order (or class
// booking) becomes "Payment to check", and Hema gets an email with everything to check it against
// her bank app.
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { publicOrder } from '../lib/orders.mjs'
import { classConfig, publicBooking } from '../lib/bookings.mjs'
import { findPayableFor } from '../lib/lookup.mjs'
import { alertEmail, hemaBooking, hemaNewOrder, sendAll } from '../lib/email.mjs'
import { normaliseUtr, utrError } from '../../src/lib/pricing.js'

const SCREENSHOT = (code) => new RegExp(`^payments/${code}/[0-9a-f-]{36}\\.(webp|jpg|png)$`)

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 4_000)
  const store = getStore()
  await limit(store, 'paymentIp', clientIp(req, context))
  const { kind, row } = await findPayableFor(store, body.code, body.phone)

  const reason = utrError(body.utr)
  if (reason) throw new HttpError(400, 'utr', { reason })
  const utr = normaliseUtr(body.utr)
  const settings = await store.getSettings()

  if (kind === 'booking') {
    if (row.status !== 'pending' || row.payment_status === 'confirmed') throw new HttpError(409, 'notPending', { booking: publicBooking(row) })
    const updated = await store.submitBookingPayment(row.booking_code, row.phone, utr)
    if (!updated) throw new HttpError(409, 'notPending')
    await sendAll([hemaBooking(updated, alertEmail(settings), classConfig(settings))])
    return json(200, { booking: publicBooking(updated) })
  }

  let screenshot = null
  if (body.screenshot) {
    if (typeof body.screenshot !== 'string' || !SCREENSHOT(row.order_code).test(body.screenshot) || !(await store.hasObject(body.screenshot))) throw new HttpError(400, 'screenshot')
    screenshot = body.screenshot
  }
  if (row.status !== 'placed' || !['pending', 'submitted'].includes(row.payment_status)) throw new HttpError(409, 'notPending', { order: publicOrder(row, await store.getOrderEvents(row.id)) })

  const updated = await store.submitPayment(row.order_code, row.customer_phone, utr, screenshot)
  if (!updated) throw new HttpError(409, 'notPending')
  await sendAll([hemaNewOrder(updated, alertEmail(settings))])
  return json(200, { order: publicOrder(updated, await store.getOrderEvents(updated.id)) })
})

export const config = { path: '/api/submit-payment' }
