// Finds an order or a class booking for a customer: the code AND the phone number must both match.
import { HttpError } from './http.mjs'
import { normaliseOrderId, ORDER_ID_PATTERN } from '../../src/lib/orderId.js'
import { BOOKING_ID_PATTERN, normaliseBookingId } from '../../src/lib/classes.js'
import { isValidPhone, normalisePhone } from '../../src/lib/validation.js'

export async function findOrderFor(store, codeInput, phoneInput) {
  const code = normaliseOrderId(codeInput)
  const phone = normalisePhone(phoneInput)
  if (!ORDER_ID_PATTERN.test(code) || !isValidPhone(phone)) throw new HttpError(400, 'badRequest')
  const row = await store.getOrder(code)
  // A wrong phone gets exactly the same answer as a wrong code
  if (!row || row.customer_phone !== phone) throw new HttpError(404, 'notFound')
  return row
}

export async function findBookingFor(store, codeInput, phoneInput) {
  const code = normaliseBookingId(codeInput)
  const phone = normalisePhone(phoneInput)
  if (!BOOKING_ID_PATTERN.test(code) || !isValidPhone(phone)) throw new HttpError(400, 'badRequest')
  const row = await store.getBooking(code)
  if (!row || row.phone !== phone) throw new HttpError(404, 'notFound')
  return row
}

/** An order (DK-…) or a class booking (DK-CL-…) -> { kind: 'order' | 'booking', row } */
export async function findPayableFor(store, codeInput, phoneInput) {
  if (/^\s*dk[\s-]*cl/i.test(String(codeInput ?? ''))) return { kind: 'booking', row: await findBookingFor(store, codeInput, phoneInput) }
  return { kind: 'order', row: await findOrderFor(store, codeInput, phoneInput) }
}
