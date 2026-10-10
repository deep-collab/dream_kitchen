/*
  Small things kept only on this phone (never sent anywhere by themselves):
  - the customer's details, when "Remember my details" is ticked (with "Not you? Clear")
  - the checkout in progress (details + dispatch date), for the Review step and a reload
  - the orders placed on this phone (code + phone), so the Pay and confirmation pages work after
    a reload; Track Order works on any device with the code and the phone
  - the idempotency key of the order being placed, so a double tap or a retry never makes two orders
*/
import { REMEMBERED_FIELDS } from './checkout.js'

const DETAILS_KEY = 'dk_details_v2'
const DRAFT_KEY = 'dk_checkout_draft'
const ORDERS_KEY = 'dk_my_orders'
const ATTEMPT_KEY = 'dk_order_attempt'

const store = (kind) => {
  try {
    return kind === 'session' ? sessionStorage : localStorage
  } catch {
    return null
  }
}
const get = (key, kind = 'local') => {
  try {
    return JSON.parse(store(kind)?.getItem(key))
  } catch {
    return null
  }
}
const set = (key, value, kind = 'local') => {
  try {
    if (value == null) store(kind)?.removeItem(key)
    else store(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked: nothing is remembered */
  }
}

export function loadDetails() {
  const d = get(DETAILS_KEY)
  if (!d || typeof d !== 'object') return null
  return Object.fromEntries(REMEMBERED_FIELDS.map((k) => [k, typeof d[k] === 'string' ? d[k] : '']))
}
export const saveDetails = (form) => set(DETAILS_KEY, Object.fromEntries(REMEMBERED_FIELDS.map((k) => [k, String(form[k] ?? '').trim()])))
export function forgetDetails() {
  set(DETAILS_KEY, null)
  set('dk_details', null) // the Step 3–5 format
}

/** { form, remember, date } while checking out (this tab only) */
export const loadDraft = () => get(DRAFT_KEY, 'session')
export const saveDraft = (draft) => set(DRAFT_KEY, draft, 'session')
export const clearDraft = () => set(DRAFT_KEY, null, 'session')

/** Orders placed on this phone, newest first: [{ code, phone, at }] */
export const myOrders = () => {
  const list = get(ORDERS_KEY)
  return Array.isArray(list) ? list.filter((o) => o && typeof o.code === 'string') : []
}
export const rememberOrder = (code, phone) => set(ORDERS_KEY, [{ code, phone, at: Date.now() }, ...myOrders().filter((o) => o.code !== code)].slice(0, 20))
export const phoneForOrder = (code) => myOrders().find((o) => o.code === code)?.phone || null

/** Class bookings made on this phone (kept apart from orders, so Track Order only offers orders) */
const BOOKINGS_KEY = 'dk_my_bookings'
const myBookings = () => {
  const list = get(BOOKINGS_KEY)
  return Array.isArray(list) ? list.filter((b) => b && typeof b.code === 'string') : []
}
export const rememberBooking = (code, phone) => set(BOOKINGS_KEY, [{ code, phone, at: Date.now() }, ...myBookings().filter((b) => b.code !== code)].slice(0, 20))
export const phoneForBooking = (code) => myBookings().find((b) => b.code === code)?.phone || null

/**
 * The idempotency key for placing this exact order: the same key while nothing changes (a double
 * tap, a retry after a dropped signal), a new one as soon as the cart or the details change.
 */
export function attemptKey(fingerprint) {
  const saved = get(ATTEMPT_KEY, 'session')
  if (saved?.fingerprint === fingerprint && typeof saved.key === 'string') return saved.key
  const key = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  set(ATTEMPT_KEY, { fingerprint, key }, 'session')
  return key
}
export const clearAttempt = () => set(ATTEMPT_KEY, null, 'session')
