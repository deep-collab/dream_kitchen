/*
  Order IDs, e.g. DK-261007-7Q4M for an order placed on 7 Oct 2026, Indian time.
  Made on the server (netlify/functions/create-order) and unique in the database; on the rare
  clash the function simply makes another. The date is the day the order is placed, in Indian
  time (never the dispatch date), plus 4 random characters from an alphabet without 0/O and
  1/I, so an ID read aloud on the phone can't be mistyped that way. 32^4 = about a million per
  day, and Track Order needs the phone number too, so IDs can't be guessed into anyone's order.
*/
import { zonedNow } from './dates.js'

export const ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const ORDER_ID_PATTERN = /^DK-\d{6}-[2-9A-HJ-NP-Z]{4}$/

function randomBytes(n) {
  return globalThis.crypto.getRandomValues(new Uint8Array(n))
}

/** New ID for an order placed at `now`. `random(n)` returns n bytes (injectable for tests). */
export function makeOrderId(now = new Date(), random = randomBytes) {
  const ymd = zonedNow(now).date.slice(2).replaceAll('-', '')
  // 256 is a multiple of 32, so `byte % 32` picks every character equally often
  const suffix = Array.from(random(4), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')
  return `DK-${ymd}-${suffix}`
}

/** Tidies what a customer types: " dk 261007 7q4m " -> "DK-261007-7Q4M" */
export function normaliseOrderId(value) {
  const v = String(value ?? '').toUpperCase().replace(/[\s_.–—]+/g, '')
  const m = v.match(/^(?:DK)?-?(\d{6})-?([A-Z0-9]{4})$/)
  return m ? `DK-${m[1]}-${m[2]}` : v
}

export const isValidOrderId = (value) => ORDER_ID_PATTERN.test(normaliseOrderId(value))

/** null | 'required' | 'invalid' */
export function orderIdError(value) {
  if (!String(value ?? '').trim()) return 'required'
  return isValidOrderId(value) ? null : 'invalid'
}
