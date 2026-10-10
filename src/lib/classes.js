/*
  Class bookings: the shared rules, used by the Classes pages, the booking functions on the server
  and Hema's admin, so all three agree. Pure functions (no React, no browser, no storage).

  A class runs over one weekend (Saturday + Sunday), in one of the slots (9–11 AM or 12–2 PM).
  Customers book one of the next 8 weekends; a weekend can be booked until the Friday before
  (Indian time). Hema's changes (fees, slot times, seats per slot) live in settings.class_settings
  and are applied on top of src/data/classInfo.js by applyClassSettings().

  Booking IDs: DK-CL-YYMMDD-XXXX (the day it was booked, Indian time, like order IDs).
*/
import { bookableWeekends } from '../data/classInfo.js'
import { applyClassSettings } from './classTimes.js'

export { applyClassSettings, classSettingsErrors, slotLabel } from './classTimes.js'
import { addDaysISO, isISODate, weekdayOf, zonedNow } from './dates.js'
import { ID_ALPHABET } from './orderId.js'
import { isEmail, normalisePhone, oneLine, phoneError } from './validation.js'

export const BOOKING_ID_PATTERN = /^DK-CL-\d{6}-[2-9A-HJ-NP-Z]{4}$/

/** New booking ID for a booking made at `now` */
export function makeBookingId(now = new Date(), random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  const ymd = zonedNow(now).date.slice(2).replaceAll('-', '')
  return `DK-CL-${ymd}-${Array.from(random(4), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')}`
}

/** " dk cl 261010 ab2c " -> "DK-CL-261010-AB2C" */
export function normaliseBookingId(value) {
  const v = String(value ?? '').toUpperCase().replace(/[\s_.–—]+/g, '')
  const m = v.match(/^(?:DK)?-?CL-?(\d{6})-?([A-Z0-9]{4})$/)
  return m ? `DK-CL-${m[1]}-${m[2]}` : v
}
export const isBookingId = (value) => BOOKING_ID_PATTERN.test(normaliseBookingId(value))

/* ---------------- weekends ---------------- */

/** The Saturday of the weekend `iso` is in (Saturday or Sunday), else null */
export function weekendOf(iso) {
  if (!isISODate(iso)) return null
  const d = weekdayOf(iso)
  return d === 6 ? iso : d === 0 ? addDaysISO(iso, -1) : null
}

/**
 * The weekends customers can book: the next `count` Saturdays after today (Indian time). A
 * weekend closes the day before it starts, so on Saturday and Sunday the list starts next week.
 */
export function bookableSaturdays(now = new Date(), count = bookableWeekends) {
  const today = zonedNow(now).date
  const daysToSat = (6 - weekdayOf(today) + 7) % 7 || 7
  const first = addDaysISO(today, daysToSat)
  return Array.from({ length: count }, (_, i) => addDaysISO(first, i * 7))
}

/** "This weekend" for Hema's home screen: today's weekend on Sat/Sun, else the coming one */
export function currentOrNextSaturday(now = new Date()) {
  const today = zonedNow(now).date
  return weekendOf(today) || addDaysISO(today, (6 - weekdayOf(today) + 7) % 7)
}

/** A seat is taken by a paid booking, a UPI reference waiting to be checked, or an unpaid booking under 30 minutes old */
export function holdsSeat(b, now = new Date()) {
  if (b.status === 'confirmed') return true
  if (b.status !== 'pending') return false
  return b.payment_status === 'submitted' || now.getTime() - Date.parse(b.created_at) < 30 * 60_000
}

/**
 * Availability for the booking page and the admin:
 *   [{ weekend, blocked, reason, slots: [{ id, start, end, blocked, taken, seatsLeft (null = no limit), open }] }]
 *   blocks: [{ weekend, slot ('*' = whole weekend), reason }], bookings: rows of those weekends
 */
export function availability(saturdays, { blocks = [], bookings = [], cfg = applyClassSettings(), now = new Date() } = {}) {
  return saturdays.map((weekend) => {
    const whole = blocks.find((b) => b.weekend === weekend && b.slot === '*')
    const slots = cfg.slots.map((slot) => {
      const block = blocks.find((b) => b.weekend === weekend && b.slot === slot.id)
      const taken = bookings.filter((b) => b.weekend === weekend && b.slot === slot.id && holdsSeat(b, now)).length
      const seatsLeft = cfg.seats == null ? null : Math.max(0, cfg.seats - taken)
      const blocked = Boolean(whole || block)
      return { id: slot.id, start: slot.start, end: slot.end, blocked, reason: (block || whole)?.reason || null, taken, seatsLeft, open: !blocked && seatsLeft !== 0 }
    })
    return { weekend, blocked: Boolean(whole), reason: whole?.reason || null, slots, open: slots.some((s) => s.open) }
  })
}

/* ---------------- the customer's details ---------------- */

export const BOOKING_FIELDS = ['name', 'phone', 'email']
export const BOOKING_MAX = { name: 60, email: 120 }

/** { field: code } (empty = fine); the page shows book.errors.<field>.<code> */
export function bookingDetailsErrors(form = {}) {
  const name = oneLine(form.name)
  const errors = {
    name: !name ? 'required' : name.length < 2 ? 'short' : name.length > BOOKING_MAX.name ? 'long' : null,
    phone: phoneError(form.phone),
    email: !oneLine(form.email) ? null : isEmail(form.email) ? null : 'invalid',
  }
  return Object.fromEntries(Object.entries(errors).filter(([, e]) => e))
}

export const cleanBookingDetails = (form = {}) => ({
  name: oneLine(form.name).slice(0, BOOKING_MAX.name),
  phone: normalisePhone(form.phone),
  email: oneLine(form.email).toLowerCase().slice(0, BOOKING_MAX.email),
})


export { weekendText } from './classTimes.js'
