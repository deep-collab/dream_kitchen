/*
  Pre-booking date rules. Pure functions, covered by tests/dates.test.js.

  Every calendar date is a 'YYYY-MM-DD' string in Indian time (Asia/Kolkata, from
  ordering.timeZone in src/config/shop.js). "Today" comes from the absolute moment `now`, never from
  the phone's own time zone, so a phone set to Dubai or Auckland sees the same dates
  as one in Mysuru. Date arithmetic runs on UTC midnights, which have no daylight
  saving, so adding a day is always exactly one day.

  Shared by the website and the server (netlify/functions), like src/lib/pricing.js.
  `rules` = the ordering config plus how many business days the order needs before dispatch:
  dispatchRules({ drawing, leadTimes }) builds it (a drawing in the cart adds Hema's extra days).
*/
import { leadTimes as LEAD_TIMES, ordering as ORDERING } from '../config/shop.js'

/** Ordering rules for an order: standard lead time, plus the drawing extra when the cart has a drawing */
export function dispatchRules({ drawing = false, leadTimes = LEAD_TIMES, ordering = ORDERING } = {}) {
  return { ...ordering, dispatchAfterBusinessDays: leadTimes.standardBusinessDays + (drawing ? leadTimes.drawingExtraBusinessDays : 0) }
}
const DEFAULT_RULES = dispatchRules()

const DAY_MS = 86_400_000
const pad = (n) => String(n).padStart(2, '0')

const toUTC = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const fromUTC = (ms) => {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30). */
export const isISODate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUTC(toUTC(value)) === value

export const addDaysISO = (iso, days) => fromUTC(toUTC(iso) + days * DAY_MS)

/** 0 = Sunday … 6 = Saturday */
export const weekdayOf = (iso) => new Date(toUTC(iso)).getUTCDay()

/** { year, month (1–12), day, weekday (0–6) } for display */
export function dateParts(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day, weekday: weekdayOf(iso) }
}

/** The calendar date and hour at `now` in the business time zone. */
export function zonedNow(now = new Date(), timeZone = ORDERING.timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type) => parts.find((p) => p.type === type).value
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 }
}

export const isBusinessDay = (iso, rules = DEFAULT_RULES) => rules.businessDays.includes(weekdayOf(iso)) && !rules.closedDates.includes(iso)

/**
 * The day an order placed at `now` counts from: today in Indian time, or tomorrow
 * once the optional cut-off hour has passed (orderCutoffHour is null for now).
 */
export function orderDay(now = new Date(), rules = DEFAULT_RULES) {
  const { date, hour } = zonedNow(now, rules.timeZone)
  return rules.orderCutoffHour != null && hour >= rules.orderCutoffHour ? addDaysISO(date, 1) : date
}

const nextBusinessDay = (iso, rules) => {
  let d = iso
  for (let i = 0; i < 366; i++) {
    d = addDaysISO(d, 1)
    if (isBusinessDay(d, rules)) return d
  }
  throw new Error('No business day within a year: check ordering.businessDays and closedDates in src/config/shop.js')
}

/**
 * Earliest dispatch date: N business days after today (Sundays and closed dates
 * don't count). Monday → Wednesday, Friday → Monday, Saturday or Sunday → Tuesday.
 */
export function earliestDate(now = new Date(), rules = DEFAULT_RULES) {
  let d = orderDay(now, rules)
  for (let i = 0; i < rules.dispatchAfterBusinessDays; i++) d = nextBusinessDay(d, rules)
  return isBusinessDay(d, rules) ? d : nextBusinessDay(d, rules)
}

/** Furthest dispatch date a customer may pick. */
export const latestDate = (now = new Date(), rules = DEFAULT_RULES) => addDaysISO(orderDay(now, rules), rules.maxDaysAhead)

/** The next `count` allowed dispatch dates, starting with the earliest (for the date chips). */
export function dateChoices(now = new Date(), count = ORDERING.dateChoices, rules = DEFAULT_RULES) {
  const out = [earliestDate(now, rules)]
  while (out.length < count) out.push(nextBusinessDay(out[out.length - 1], rules))
  return out
}

/**
 * Checks a preferred dispatch date. Returns null when it is fine, otherwise the reason:
 * 'required' | 'invalid' | 'tooSoon' | 'closed' (Sunday or holiday) | 'tooFar'
 */
export function preferredDateError(iso, now = new Date(), rules = DEFAULT_RULES) {
  if (!iso) return 'required'
  if (!isISODate(iso)) return 'invalid'
  if (iso < earliestDate(now, rules)) return 'tooSoon'
  if (!isBusinessDay(iso, rules)) return 'closed'
  if (iso > latestDate(now, rules)) return 'tooFar'
  return null
}

/**
 * "Wed, 7 Oct" (or with the year: "Wed, 7 Oct 2026") from day and month names.
 * names: { weekdays: [7, Sunday first], months: [12], format, formatYear } with
 * {weekday} {day} {month} {year} placeholders. The site passes the i18n names;
 * emails always pass the English ones.
 */
export function formatDay(iso, names, { year = false } = {}) {
  const p = dateParts(iso)
  return (year ? names.formatYear : names.format)
    .replace('{weekday}', names.weekdays[p.weekday])
    .replace('{day}', String(p.day))
    .replace('{month}', names.months[p.month - 1])
    .replace('{year}', String(p.year))
}
