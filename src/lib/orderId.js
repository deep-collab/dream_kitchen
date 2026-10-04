/*
  Interim order IDs for Stage A, e.g. DK-261007-7Q4M for an order placed on
  7 Oct 2026, Indian time.

  Orders are not stored centrally yet and the site is public, so a counter kept on
  each phone would hand out DK-0001 on every phone. Instead: the date the order is
  placed, in Indian time (YYMMDD; never the customer's preferred delivery date),
  plus 4 random characters. The alphabet leaves out 0/O and 1/I,
  so an ID read aloud on the phone or copied by hand cannot be mistyped that way.
  32 characters ^ 4 = about a million IDs per day. Stage B replaces this with a
  database sequence (see CLAUDE.md).
*/
import { zonedNow } from './dates'

export const ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const ORDER_ID_PATTERN = /^DK-\d{6}-[2-9A-HJ-NP-Z]{4}$/
// The old sample checkout's IDs (DK-0001). Only looked up, never created.
const LEGACY_PATTERN = /^DK-\d{4,6}$/

function randomBytes(n) {
  const bytes = new Uint8Array(n)
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(bytes)
  for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256)
  return bytes
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
  if (m) return `DK-${m[1]}-${m[2]}`
  const legacy = v.match(/^(?:DK)?-?(\d{1,4})$/)
  if (legacy) return `DK-${legacy[1].padStart(4, '0')}`
  return v
}

export const isValidOrderId = (value) => {
  const id = normaliseOrderId(value)
  return ORDER_ID_PATTERN.test(id) || LEGACY_PATTERN.test(id)
}

/** null | 'required' | 'invalid' */
export function orderIdError(value) {
  if (!String(value ?? '').trim()) return 'required'
  return isValidOrderId(value) ? null : 'invalid'
}
