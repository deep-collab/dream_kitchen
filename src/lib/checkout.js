/*
  The customer's details at checkout: limits, tidying and checks. Shared by the checkout page
  and the create-order function, so both accept exactly the same addresses.
  detailsErrors(form) -> { field: code } (empty = fine); the page shows checkout.errors.<field>.<code>.
*/
import { normalisePincode, pincodeError } from './pricing.js'
import { isEmail, normalisePhone, oneLine, phoneError } from './validation.js'
import { stateIds } from '../data/states.js'

export const DETAIL_FIELDS = ['name', 'phone', 'email', 'line1', 'line2', 'city', 'pincode', 'state', 'landmark', 'note']
// Fields remembered on the phone ("Remember my details"); the note is per order
export const REMEMBERED_FIELDS = ['name', 'phone', 'email', 'line1', 'line2', 'city', 'pincode', 'state', 'landmark']
export const MAX = { name: 60, email: 120, line1: 120, line2: 120, city: 60, landmark: 80, note: 300 }
export const MIN = { name: 2, line1: 3, line2: 2, city: 2 }

/** Errors, in the order the fields appear on screen */
export function detailsErrors(form = {}) {
  const v = (k) => oneLine(form[k])
  const length = (k, required = true) => {
    const s = v(k)
    if (!s) return required ? 'required' : null
    if (MIN[k] && s.length < MIN[k]) return 'short'
    if (MAX[k] && s.length > MAX[k]) return 'long'
    return null
  }
  const errors = {
    name: length('name'),
    phone: phoneError(form.phone),
    email: !v('email') ? null : isEmail(form.email) ? null : 'invalid',
    line1: length('line1'),
    line2: length('line2'),
    city: length('city'),
    pincode: pincodeError(form.pincode),
    state: !form.state ? 'required' : stateIds.has(form.state) ? null : 'invalid',
    landmark: length('landmark', false),
    note: length('note', false),
  }
  return Object.fromEntries(Object.entries(errors).filter(([, e]) => e))
}

/** The details as they are stored: one-line text, 10-digit phone, 6-digit pincode */
export function cleanDetails(form = {}) {
  const out = {}
  for (const k of DETAIL_FIELDS) out[k] = oneLine(form[k]).slice(0, MAX[k] || 200)
  out.phone = normalisePhone(form.phone)
  out.pincode = normalisePincode(form.pincode)
  out.email = out.email.toLowerCase()
  out.state = stateIds.has(form.state) ? form.state : ''
  return out
}
