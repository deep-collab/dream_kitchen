/*
  Small field rules shared by the website and the server (checkout, Track Order, class
  enquiries). Pure. Each *Error function returns null when the value is fine, or a short reason
  code that the page turns into a sentence (en.json / kn.json) saying how to fix it.
*/

/**
 * Indian mobile number to its 10 digits. Accepts what people type or autofill:
 * "98765 43210", "+91 98765-43210", "091 9876543210", "0091 98765 43210", "09876543210".
 */
export function normalisePhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 14 && digits.startsWith('0091')) digits = digits.slice(4)
  else if (digits.length === 13 && digits.startsWith('091')) digits = digits.slice(3)
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

/** 10 digits starting with 6, 7, 8 or 9 */
export const isValidPhone = (value) => /^[6-9]\d{9}$/.test(normalisePhone(value))

/** null | 'required' | 'invalid' */
export function phoneError(value) {
  if (!String(value ?? '').trim()) return 'required'
  return isValidPhone(value) ? null : 'invalid'
}

/** "9876543210" -> "+91 98765 43210" */
export function formatPhone(value) {
  const d = normalisePhone(value)
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : String(value ?? '').trim()
}

/** For the phone field (it shows +91 itself): "+91 9845012345" -> "98450 12345"; anything invalid is left as typed */
export function tidyPhoneInput(value) {
  return isValidPhone(value) ? formatPhone(value).slice(4) : value
}

/** Collapses spaces and line breaks: for one-line fields, emails and the database. */
export const oneLine = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

/** A plain email address (optional fields check emptiness themselves) */
export const isEmail = (value) => /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/.test(oneLine(value)) && oneLine(value).length <= 120
