import { site } from '../config/site'

// Accepts "98765 43210", "+91 9876543210", "09876543210" -> "9876543210"
export function normalisePhone(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits
}
export const isValidPhone = (value) => /^[6-9]\d{9}$/.test(normalisePhone(value))
export const isValidPincode = (value) => site.delivery.pincodePattern.test(String(value || '').trim())
export const normaliseOrderId = (value) => {
  const v = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
  const m = v.match(/^(?:DK-?)?(\d{1,6})$/)
  return m ? `${site.order.idPrefix}${m[1].padStart(4, '0')}` : v
}
export const isValidOrderId = (value) => /^DK-\d{4,6}$/.test(normaliseOrderId(value))
