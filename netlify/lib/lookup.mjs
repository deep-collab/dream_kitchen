// Finds an order for a customer: the code AND the phone number must both match.
import { HttpError } from './http.mjs'
import { normaliseOrderId, ORDER_ID_PATTERN } from '../../src/lib/orderId.js'
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
