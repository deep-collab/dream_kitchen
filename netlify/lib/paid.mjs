// A payment confirmed by Razorpay (the checkout callback or the webhook), for an order or a class
// booking. Safe to call twice: the second call changes nothing and sends no emails. The first one
// emails Hema ("New paid order" / "New class booking") and the customer (if they gave an email).
import { alertEmail, customerBooking, customerPlaced, hemaBooking, hemaNewOrder, sendAll } from './email.mjs'
import { classConfig } from './bookings.mjs'

/** -> { row, changed } */
export async function markOrderPaid(store, row, paymentId) {
  if (row.payment_status === 'confirmed' || row.status !== 'placed') return { row, changed: false }
  const updated = await store.adminUpdateOrder(
    row.order_code,
    { status: 'payment_confirmed', payment_status: 'confirmed', payment_method: 'razorpay', razorpay_payment_id: paymentId },
    { kind: 'status', to_status: 'payment_confirmed', by: 'razorpay', note: `Razorpay ${paymentId}` },
  )
  if (!updated) return { row, changed: false }
  const settings = await store.getSettings()
  await sendAll([hemaNewOrder(updated, alertEmail(settings)), updated.customer_email ? customerPlaced(updated) : null])
  return { row: updated, changed: true }
}

export async function markBookingPaid(store, row, paymentId) {
  if (row.payment_status === 'confirmed' || row.status !== 'pending') return { row, changed: false }
  const updated = await store.adminUpdateBooking(
    row.booking_code,
    { status: 'confirmed', payment_status: 'confirmed', payment_method: 'razorpay', razorpay_payment_id: paymentId },
    { kind: 'status', to_status: 'confirmed', by: 'razorpay', note: `Razorpay ${paymentId}` },
  )
  if (!updated) return { row, changed: false }
  const settings = await store.getSettings()
  const cfg = classConfig(settings)
  await sendAll([hemaBooking(updated, alertEmail(settings), cfg), customerBooking(updated, cfg)])
  return { row: updated, changed: true }
}

export const markPaid = (store, kind, row, paymentId) => (kind === 'booking' ? markBookingPaid(store, row, paymentId) : markOrderPaid(store, row, paymentId))
