/*
  Class booking IDs for Stage A, e.g. CL-261005-7Q4M for a booking made on
  5 Oct 2026, Indian time.

  The brief says CL-0001, but bookings face the same problem as orders (see
  src/lib/orderId.js and CLAUDE.md, "Order IDs"): nothing is stored centrally
  yet, so a counter on each phone would give every phone CL-0001. Same recipe:
  the booking day in Indian time + 4 random characters without 0/O or 1/I.
  Stage B switches to a database sequence.
*/
import { zonedNow } from './dates'
import { ID_ALPHABET } from './orderId'

export const BOOKING_ID_PATTERN = /^CL-\d{6}-[2-9A-HJ-NP-Z]{4}$/

function randomBytes(n) {
  const bytes = new Uint8Array(n)
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(bytes)
  for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256)
  return bytes
}

/** New ID for a booking made at `now`. `random(n)` returns n bytes (injectable for tests). */
export function makeBookingId(now = new Date(), random = randomBytes) {
  const ymd = zonedNow(now).date.slice(2).replaceAll('-', '')
  const suffix = Array.from(random(4), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')
  return `CL-${ymd}-${suffix}`
}

/** " cl 261005 7q4m " -> "CL-261005-7Q4M" (anything else is returned tidied but unchanged) */
export function normaliseBookingId(value) {
  const v = String(value ?? '').toUpperCase().replace(/[\s_.–—]+/g, '')
  const m = v.match(/^(?:CL)?-?(\d{6})-?([A-Z0-9]{4})$/)
  return m ? `CL-${m[1]}-${m[2]}` : v
}
