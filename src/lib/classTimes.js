/*
  Class fees, slot times and seats as they are now (src/data/classInfo.js with Hema's admin
  changes on top), slot times in words, and weekend labels. Kept small and on its own so the
  Classes page doesn't download the booking rules (src/lib/classes.js re-exports all of it).
*/
import { classSeats, classSlots, classes as CLASSES, dayParts } from '../data/classInfo.js'
import { addDaysISO } from './dates.js'

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

/* ---------------- Hema's class settings ---------------- */

const fee = (v) => (Number.isInteger(v) && v > 0 && v <= 100000 ? v : undefined)
const seats = (v) => (Number.isInteger(v) && v >= 1 && v <= 200 ? v : undefined)
const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

/**
 * The classes, slots and seats as they are now: classInfo.js with Hema's changes on top.
 *   s: { fees?: { basic: 2500, ... }, slots?: { morning: { start: '09:00', end: '11:00' }, ... }, seats?: number | null }
 */
export function applyClassSettings(s = {}) {
  const set = s && typeof s === 'object' ? s : {}
  return {
    classes: CLASSES.map((c) => ({ ...c, price: fee(set.fees?.[c.id]) ?? c.price })),
    slots: classSlots.map((slot) => {
      const o = set.slots?.[slot.id]
      const ok = o && TIME.test(o.start) && TIME.test(o.end) && minutes(o.end) > minutes(o.start)
      return ok ? { ...slot, start: o.start, end: o.end } : slot
    }),
    // null (or anything not a sane number) = no limit and no seat count on the site
    seats: set.seats === null ? null : (seats(set.seats) ?? classSeats),
  }
}

/** What's wrong with Hema's class settings edit: { field: code } */
export function classSettingsErrors(s = {}) {
  const errors = {}
  for (const c of CLASSES) if (s.fees && s.fees[c.id] !== undefined && !fee(s.fees[c.id])) errors[`fee.${c.id}`] = 'price'
  for (const slot of classSlots) {
    const o = s.slots?.[slot.id]
    if (o && !(TIME.test(o.start) && TIME.test(o.end) && minutes(o.end) > minutes(o.start))) errors[`slot.${slot.id}`] = 'time'
  }
  if (s.seats !== undefined && s.seats !== null && !seats(s.seats)) errors.seats = 'seats'
  return errors
}

/* ---------------- slot times in words ---------------- */

const hour12 = (t) => {
  const h = Number(t.slice(0, 2))
  const m = t.slice(3)
  return `${h % 12 || 12}${m === '00' ? '' : `:${m}`}`
}
const ampm = (t) => (Number(t.slice(0, 2)) < 12 ? 'AM' : 'PM')
const partOf = (t) => dayParts.find((p) => Number(t.slice(0, 2)) < p.before).name

/**
 * { start: '09:00', end: '11:00' } -> "9–11 AM" (en) / "ಬೆಳಿಗ್ಗೆ 9–11" (kn); "11 AM–1 PM" across noon.
 * pick: the page's pick() (in the browser the Kannada arrives with the Kannada file); the server
 * reads the pair directly.
 */
export function slotLabel(slot, lang = 'en', pick = (o) => o.kn || o.en) {
  if (lang === 'kn') {
    const a = pick(partOf(slot.start))
    const b = pick(partOf(slot.end))
    return a === b ? `${a} ${hour12(slot.start)}–${hour12(slot.end)}` : `${a} ${hour12(slot.start)}–${b} ${hour12(slot.end)}`
  }
  return ampm(slot.start) === ampm(slot.end) ? `${hour12(slot.start)}–${hour12(slot.end)} ${ampm(slot.end)}` : `${hour12(slot.start)} ${ampm(slot.start)}–${hour12(slot.end)} ${ampm(slot.end)}`
}

/** "Sat 17 – Sun 18 Oct" (or "Sat 31 Oct – Sun 1 Nov") with the page's day and month names (t('dates')) */
export function weekendText(saturday, names) {
  const sunday = addDaysISO(saturday, 1)
  const [, m1, d1] = saturday.split('-').map(Number)
  const [, m2, d2] = sunday.split('-').map(Number)
  const sat = names.weekdays[6]
  const sun = names.weekdays[0]
  return m1 === m2 ? `${sat} ${d1} – ${sun} ${d2} ${names.months[m2 - 1]}` : `${sat} ${d1} ${names.months[m1 - 1]} – ${sun} ${d2} ${names.months[m2 - 1]}`
}
