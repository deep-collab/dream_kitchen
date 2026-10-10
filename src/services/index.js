/*
  Data layer. Components get data ONLY through these functions.
  - The menu: src/config/shop.js with Hema's admin changes from /api/menu on top, applied by the
    shared pricing module exactly like the server (src/context/MenuProvider.jsx).
  - Orders, payment, uploads and class enquiries: the Netlify Functions (src/lib/api.js).
*/
import { api } from '../lib/api'

let remoteLoad = null
/**
 * Hema's live changes and settings: { ready, overrides, settings, razorpay }, or null when the
 * server can't be reached (the site then shows the config menu and won't take payments).
 * fresh: skip the shared copy (after the server said a price changed).
 */
export function loadRemoteMenu({ fresh = false } = {}) {
  if (fresh || !remoteLoad) {
    remoteLoad = api('menu', null, { method: 'GET', query: fresh ? `?t=${Date.now()}` : '', timeout: 8000 }).then((r) => (r.ok && r.data ? r.data : null))
  }
  return remoteLoad
}

/* ---------- orders ---------- */

/** { idempotencyKey, items, customer, dispatchDate, expectedTotal, lang, website } -> api result, data.order */
export const createOrder = (body) => api('create-order', body)

/** One order by code + phone (confirmation page, Pay page, Track Order) -> api result, data.order */
export const getOrder = (code, phone) => api('order', { code, phone })

/** The customer's UPI reference (and optional screenshot path) -> api result, data.order */
export const submitPayment = (code, phone, utr, screenshot) => api('submit-payment', { code, phone, utr, screenshot: screenshot || undefined })

export const startRazorpay = (code, phone) => api('razorpay-order', { code, phone })
export const verifyRazorpay = (body) => api('razorpay-verify', body)

/* ---------- classes ---------- */

/** A class question (Classes page) or a general message (Contact page, kind: 'general') */
export const sendClassEnquiry = (form) => api('class-enquiry', form)

/** The booking page's data: classes, fees, slot times, the next 8 weekends and what is open */
export const getClasses = () => api('classes', null, { method: 'GET', timeout: 10000 })
/** { idempotencyKey, classId, weekend, slot, name, phone, email, expectedFee, lang } -> data.booking */
export const createBooking = (body) => api('create-booking', body)
/** One booking by code + phone -> data.booking */
export const getBooking = (code, phone) => api('booking', { code, phone })
